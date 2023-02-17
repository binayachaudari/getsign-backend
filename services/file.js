const { PDFDocument } = require('pdf-lib');
const FileDetails = require('../models/FileDetails');
const { getFile, s3, getSignedUrl } = require('./s3');
const fontkit = require('@pdf-lib/fontkit');
const FileHistory = require('../models/FileHistory');
const { embedHistory } = require('./embedDocumentHistory');
const { setMondayToken } = require('../utils/monday');
const { getColumnValues, updateStatusColumn } = require('./monday.service');
const statusMapper = require('../config/statusMapper');

const addFormFields = async (id, payload) => {
  const session = await FileHistory.startSession();
  session.startTransaction();
  try {
    const updatedFields = await FileDetails.findByIdAndUpdate(id, {
      status: 'ready_to_sign',
      fields: [...payload],
    });

    await setMondayToken(updatedFields.board_id);

    // Signed by receiver
    const signedByReceiver = await FileHistory.distinct('itemId', {
      fileId: updatedFields._id,
      status: 'signed_by_receiver',
    });

    // only signed by sender (not signed by receiver)
    const onlySenderSigned = await FileHistory.distinct('itemId', {
      fileId: updatedFields._id,
      status: 'signed_by_sender',
      itemId: { $nin: signedByReceiver },
    });

    if (onlySenderSigned?.length > 0) {
      onlySenderSigned?.forEach(async (item) => {
        // updating status column
        await updateStatusColumn({
          itemId: item,
          boardId: updatedFields.board_id,
          columnId: updatedFields?.status_column_id,
          columnValue: undefined,
        });
      });

      // delete history
      await FileHistory.deleteMany({
        itemId: { $in: onlySenderSigned },
      });
    }
    // delete file histories

    return updatedFields;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const generatePDF = async (id, fields) => {
  try {
    const fileDetails = await getFile(id);
    const pdfDoc = await PDFDocument.load(fileDetails?.file);
    const pages = pdfDoc.getPages();
    pdfDoc.registerFontkit(fontkit);

    const parsedFileDetails = fileDetails.toJSON();

    if (fields?.length && parsedFileDetails?.fields) {
      parsedFileDetails?.fields?.forEach(async (placeHolder) => {
        const currentPage = pages[placeHolder?.formField?.pageIndex];

        // if (placeHolder?.image) {
        //   const pngImage = await pdfDoc.embedPng(placeHolder?.image?.src);
        //   currentPage.drawImage(pngImage, {
        //     x: placeHolder?.formField.coordinates.x,
        //     y: placeHolder?.formField.coordinates.y,
        //     width: placeHolder?.image.width,
        //     height: placeHolder?.image.height,
        //   });
        // } else {
        const value = fields.find((item) => item?.id === placeHolder?.itemId);

        if (value)
          currentPage.drawText(value?.text, {
            x: placeHolder.formField.coordinates.x,
            y: placeHolder.formField.coordinates.y,
            size: 11,
          });
        // }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: 'application/pdf',
      });
      const type = blob.type;
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64String = buffer.toString('base64');
      return {
        name: parsedFileDetails.file_name,
        file: `data:${type};base64,${base64String}`,
      };
    }
  } catch (error) {
    throw error;
  }
};

const loadFile = async (url) => {
  const body = await fetch(url);
  const contentType = body.headers.get('content-type');
  const arrBuffer = await body.arrayBuffer();
  const buffer = Buffer.from(arrBuffer);
  var base64String = buffer.toString('base64');

  return `data:${contentType};base64,${base64String}`;
};

const signPDF = async ({ id, signatureFields, status, itemId }) => {
  try {
    let pdfDoc;
    const fileDetails = await getFile(id);
    await setMondayToken(fileDetails.board_id);
    const valuesToFill = await getColumnValues(itemId);

    const values = [
      ...(valuesToFill?.data?.items?.[0]?.column_values || []),
      {
        id: 'item-name',
        text: valuesToFill?.data?.items?.[0]?.name || '',
        title: 'Item Name',
        type: 'text',
      },
    ];

    const signedBySender = await FileHistory.findOne({
      fileId: id,
      status: 'signed_by_sender',
      itemId,
    }).exec();

    const signedByReceiver = await FileHistory.findOne({
      fileId: id,
      status: 'signed_by_receiver',
      itemId,
    }).exec();

    if (signedBySender) {
      const url = await getSignedUrl(signedBySender?.file);
      const file = await loadFile(url);
      pdfDoc = await PDFDocument.load(file);
    } else if (signedByReceiver) {
      const url = await getSignedUrl(signedByReceiver?.file);
      const file = await loadFile(url);
      pdfDoc = await PDFDocument.load(file);
    } else {
      pdfDoc = await PDFDocument.load(fileDetails?.file);
    }

    const pages = pdfDoc.getPages();
    pdfDoc.registerFontkit(fontkit);

    const parsedFileDetails = fileDetails.toJSON();

    if (parsedFileDetails?.fields) {
      if (signatureFields?.length) {
        signatureFields?.forEach(async (placeHolder) => {
          const currentPage = pages[placeHolder?.formField?.pageIndex];
          if (placeHolder?.image) {
            const pngImage = await pdfDoc.embedPng(placeHolder?.image?.src);
            currentPage.drawImage(pngImage, {
              x: placeHolder?.formField.coordinates.x,
              y: placeHolder?.formField.coordinates.y,
              width: placeHolder?.image.width,
              height: placeHolder?.image.height,
            });
          }
        });
      }

      if (values?.length) {
        parsedFileDetails?.fields?.forEach(async (placeHolder) => {
          const currentPage = pages[placeHolder?.formField?.pageIndex];

          const value = values.find((item) => item?.id === placeHolder?.itemId);

          if (value)
            currentPage.drawText(value?.text, {
              x: placeHolder.formField.coordinates.x,
              y: placeHolder.formField.coordinates.y,
              size: 11,
            });
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: 'application/pdf',
      });

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return await s3
        .upload({
          Bucket: process.env.BUCKET_NAME,
          Key: `jet-sign-${id}-${itemId}-${status}-${Date.now().toString()}`,
          Body: buffer,
          ContentType: blob.type,
        })
        .promise();
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const addSenderDetails = (
  id,
  {
    sender_name,
    email_address,
    email_title,
    message,
    email_column_id,
    status_column_id,
  }
) => {
  try {
    const updated = FileDetails.findById(id);

    updated.sender_name = sender_name;
    updated.email_address = email_address;
    updated.email_title = email_title;
    updated.message = message;
    updated.email_column_id = email_column_id;
    updated.status_column_id = status_column_id;

    updated.save();

    return updated;
  } catch (error) {
    throw error;
  }
};

module.exports = { addFormFields, generatePDF, addSenderDetails, signPDF };
