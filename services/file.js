const { PDFDocument } = require('pdf-lib');
const FileDetails = require('../modals/FileDetails');
const { getFile, s3, getSignedUrl } = require('./s3');
const fontkit = require('@pdf-lib/fontkit');
const FileHistory = require('../modals/FileHistory');
const { embedHistory } = require('./embedDocumentHistory');

const addFormFields = async (id, payload) => {
  try {
    const updatedFields = await FileDetails.findByIdAndUpdate(id, {
      status: 'ready_to_sign',
      fields: [...payload],
    });

    return updatedFields;
  } catch (error) {
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

const signPDF = async ({ id, signatureFields, status, itemId, values }) => {
  try {
    let pdfDoc;
    const fileDetails = await getFile(id);
    const signedBySender = await FileHistory.findOne({
      fileId: id,
      status: 'signed_by_sender',
      itemId,
    }).exec();

    if (!signedBySender) {
      pdfDoc = await PDFDocument.load(fileDetails?.file);
    } else {
      const url = await getSignedUrl(signedBySender?.file);

      const body = await fetch(url);
      const contentType = body.headers.get('content-type');
      const arrBuffer = await body.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);
      var base64String = buffer.toString('base64');

      pdfDoc = await PDFDocument.load(
        `data:${contentType};base64,${base64String}`
      );
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
  { sender_name, email_address, email_title, message }
) => {
  try {
    const updated = FileDetails.findByIdAndUpdate(id, {
      sender_name,
      email_address,
      email_title,
      message,
    });

    return updated;
  } catch (error) {
    throw error;
  }
};

module.exports = { addFormFields, generatePDF, addSenderDetails, signPDF };
