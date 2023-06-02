const { PDFDocument, rgb } = require('pdf-lib');
const FileDetails = require('../models/FileDetails');
const { getFile, s3, getSignedUrl } = require('./s3');
const fontkit = require('@pdf-lib/fontkit');
const FileHistory = require('../models/FileHistory');
const { setMondayToken } = require('../utils/monday');
const { getColumnValues, updateStatusColumn } = require('./monday.service');
const { Types } = require('mongoose');
const { backOfficeSavedDocument } = require('./backoffice.service');
const ApplicationModel = require('../models/Application.model');
const crypto = require('crypto');
const { emailVerification } = require('./mailer');
const fs = require('fs');
const path = require('path');
const { arraysAreEqual } = require('../utils/arrays');
const statusMapper = require('../config/statusMapper');
require('regenerator-runtime/runtime');

const addFormFields = async (id, payload) => {
  const session = await FileHistory.startSession();
  session.startTransaction();
  try {
    const oldFields = await FileDetails.findById(id);
    const updatedFields = await FileDetails.findByIdAndUpdate(id, {
      status: 'ready_to_sign',
      fields: [...payload],
    }).select('-email_verification_token -email_verification_token_expires');

    const appInstallDetails = await ApplicationModel.findOne({
      type: 'install',
      account_id: updatedFields.account_id,
    }).sort({ created_at: 'desc' });

    if (appInstallDetails?.back_office_item_id) {
      await backOfficeSavedDocument(appInstallDetails.back_office_item_id);
    }

    await setMondayToken(updatedFields.user_id, updatedFields.account_id);

    if (!arraysAreEqual(payload || [], oldFields?.fields || [])) {
      const notSignedByBoth = await FileHistory.aggregate([
        {
          $group: {
            _id: '$itemId',
            status: {
              $push: '$status',
            },
            fileId: {
              $first: '$fileId',
            },
          },
        },
        {
          $match: {
            fileId: Types.ObjectId(updatedFields._id),
            status: {
              $not: {
                $all: ['signed_by_sender', 'signed_by_receiver'],
              },
            },
          },
        },
      ]);

      if (notSignedByBoth?.length > 0) {
        notSignedByBoth?.forEach(async (item) => {
          // updating status column
          await updateStatusColumn({
            itemId: item?._id,
            boardId: updatedFields.board_id,
            columnId: updatedFields?.status_column_id,
            columnValue: undefined,
            userId: updatedFields?.user_id,
            accountId: updatedFields?.account_id,
          });
        });

        const notSignedByBothItemIds = notSignedByBoth.map((item) => item?._id);

        // delete history
        await FileHistory.deleteMany({
          itemId: { $in: notSignedByBothItemIds },
        });
      }
    }

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
    // Load the `Arial Unicode MS.ttf`
    const fontBytes = fs.readFileSync(
      path.join(__dirname, '..', 'utils/fonts/Arial Unicode MS.ttf')
    );
    const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });

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

        const calculationError =
          typeof value?.text === 'object' && value?.type === 'formula';

        if (value) {
          const paddingX = -6;
          const fontSize = placeHolder?.fontSize || 11;
          const scalingFactor = 0.75;
          const paddingY = 22.8 - (fontSize - 11) * scalingFactor;

          if (calculationError) {
            console.error('Calculation Error', value);
            return currentPage.drawText('Error, Cannot Calculate', {
              color: rgb(0.86, 0.14, 0.14),
              x: placeHolder.formField.coordinates.x + paddingX,
              y: placeHolder.formField.coordinates.y + paddingY,
              font: customFont,
              size: fontSize,
            });
          }

          currentPage.drawText(value?.text, {
            x: placeHolder.formField.coordinates.x + paddingX,
            y: placeHolder.formField.coordinates.y + paddingY,
            font: customFont,
            size: fontSize,
          });
        }
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

const generatePDFWithGivenPlaceholders = async (id, placeholders, values) => {
  try {
    const ERROR_COLOR = [220 / 255, 38 / 255, 38 / 255];
    const fileDetails = await getFile(id);

    const pdfDoc = await PDFDocument.load(fileDetails?.file);
    const pages = pdfDoc.getPages();
    pdfDoc.registerFontkit(fontkit);
    // Load the `Arial Unicode MS.ttf`
    const fontBytes = fs.readFileSync(
      path.join(__dirname, '..', 'utils/fonts/Arial Unicode MS.ttf')
    );
    const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });

    const parsedFileDetails = fileDetails.toJSON();

    if (values?.length && placeholders?.length) {
      placeholders?.forEach(async (placeHolder) => {
        const currentPage = pages[placeHolder?.formField?.pageIndex];

        const value = values.find((item) => item?.id === placeHolder?.itemId);

        const calculationError =
          typeof value?.text === 'object' && value?.type === 'formula';

        if (value) {
          const paddingX = -6;
          const fontSize = placeHolder?.fontSize || 11;
          const scalingFactor = 0.75;
          const paddingY = 22.8 - (fontSize - 11) * scalingFactor;

          if (calculationError) {
            console.error('Calculation Error', value);
            return currentPage.drawText('Error, Cannot Calculate', {
              color: rgb(0.86, 0.14, 0.14),
              x: placeHolder.formField.coordinates.x + paddingX,
              y: placeHolder.formField.coordinates.y + paddingY,
              font: customFont,
              size: fontSize,
            });
          }

          currentPage.drawText(value?.text, {
            x: placeHolder.formField.coordinates.x + paddingX,
            y: placeHolder.formField.coordinates.y + paddingY,
            font: customFont,
            size: fontSize,
          });
        }
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
    await setMondayToken(fileDetails.user_id, fileDetails.account_id);
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

    const fontBytes = fs.readFileSync(
      path.join(__dirname, '..', 'utils/fonts/Arial Unicode MS.ttf')
    );
    const customFont = await pdfDoc.embedFont(fontBytes, {
      subset: true,
    });

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

          if (value) {
            const paddingX = -6;
            const fontSize = placeHolder?.fontSize || 11;
            const scalingFactor = 0.75;
            const paddingY = 22.8 - (fontSize - 11) * scalingFactor;
            currentPage.drawText(value?.text, {
              x: placeHolder.formField.coordinates.x + paddingX,
              y: placeHolder.formField.coordinates.y + paddingY,
              font: customFont,
              size: fontSize,
            });
          }
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
          Bucket: process.env.IS_DEV
            ? `${process.env.BUCKET_NAME}/dev-test`
            : process.env.BUCKET_NAME,
          Key: `get-sign-${id}-${itemId}-${status}-${Date.now().toString()}`,
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

const addSenderDetails = async (
  id,
  {
    sender_name,
    email_address,
    email_title,
    message,
    email_column_id,
    status_column_id,
    file_column_id,
  }
) => {
  try {
    const updated = await FileDetails.findById(id);

    const statusColumnAlreadyUsed = await FileDetails.find({
      board_id: updated?.board_id,
      status_column_id: status_column_id,
      itemViewInstanceId: { $ne: null },
      _id: { $ne: Types.ObjectId(id) },
      is_deleted: false,
    });

    if (statusColumnAlreadyUsed.length) {
      throw {
        statusCode: 400,
        message: 'Status column already used',
      };
    }

    // for (const [key, value] of Object.entries(statusMapper)) {
    //   await updateStatusColumn({
    //     itemId: updated.item_id,
    //     boardId: updated.board_id,
    //     columnId: status_column_id,
    //     columnValue: value,
    //     userId: updated?.user_id,
    //     accountId: updated?.account_id,
    //   });
    // }

    // await updateStatusColumn({
    //   itemId: updated.item_id,
    //   boardId: updated.board_id,
    //   columnId: status_column_id,
    //   columnValue: null,
    //   userId: updated?.user_id,
    //   accountId: updated?.account_id,
    // });

    if (updated.email_address !== email_address) {
      const verificationToken = crypto.randomBytes(20).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

      updated.is_email_verified = false;
      updated.email_verification_token = verificationToken;
      updated.email_verification_token_expires = verificationTokenExpires;

      await emailVerification(updated.email_verification_token, email_address);
    }

    updated.sender_name = sender_name;
    updated.email_address = email_address;
    updated.email_title = email_title;
    updated.message = message;
    updated.email_column_id = email_column_id;
    updated.status_column_id = status_column_id;
    updated.file_column_id = file_column_id;

    await updated.save();

    return {
      sender_name,
      email_address,
      email_title,
      message,
      email_column_id,
      status_column_id,
      file_column_id,
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  addFormFields,
  generatePDF,
  addSenderDetails,
  signPDF,
  generatePDFWithGivenPlaceholders,
};
