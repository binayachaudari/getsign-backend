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
require('regenerator-runtime/runtime');
const moment = require('moment');

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

        if (placeHolder?.itemId === 'sign-date') {
          const fontSize = placeHolder?.height
            ? parseInt(placeHolder?.height / 3)
            : 17;
          const scalingFactor = 0.75;
          const paddingX = 14 * scalingFactor;
          const currentDate = moment(new Date())
            .format(placeHolder?.dateFormat?.format || 'DD/MM/YYYY')
            .toString();

          currentPage.drawText(currentDate, {
            x: placeHolder.formField.coordinates.x + paddingX,
            y: placeHolder.formField.coordinates.y,
            font: customFont,
            size: fontSize,
          });
        } else {
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

        if (placeHolder?.itemId === 'sign-date') {
          const fontSize = placeHolder?.height
            ? parseInt(placeHolder?.height / 3)
            : 17;
          const scalingFactor = 0.75;
          const paddingX = 14 * scalingFactor;
          const currentDate = moment(new Date())
            .format(placeHolder?.dateFormat?.format || 'DD/MM/YYYY')
            .toString();

          currentPage.drawText(currentDate, {
            x: placeHolder.formField.coordinates.x + paddingX,
            y: placeHolder.formField.coordinates.y,
            font: customFont,
            size: fontSize,
          });
        } else {
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

const signPDF = async ({ id, interactedFields, status, itemId }) => {
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
    const signedDateFields = parsedFileDetails?.fields.filter(
      (item) => item.itemId === 'sign-date'
    );

    signedDateFields?.forEach(
      async((dateField) => {
        const currentPage = pages[dateField?.formField?.pageIndex];
        const fontSize = dateField?.height
          ? parseInt(dateField?.height / 3)
          : 17;
        const scalingFactor = 0.75;
        const paddingX = 14 * scalingFactor;
        const currentDate = moment(new Date())
          .format(dateField?.dateFormat?.format || 'DD/MM/YYYY')
          .toString();

        currentPage.drawText(currentDate, {
          x: dateField.formField.coordinates.x + paddingX,
          y: dateField.formField.coordinates.y,
          font: customFont,
          size: fontSize,
        });
      })
    );

    if (parsedFileDetails?.fields) {
      if (interactedFields?.length) {
        interactedFields?.forEach(async (placeHolder) => {
          const currentPage = pages[placeHolder?.formField?.pageIndex];
          if (placeHolder?.image?.src) {
            const pngImage = await pdfDoc.embedPng(placeHolder?.image?.src);
            currentPage.drawImage(pngImage, {
              x: placeHolder?.formField.coordinates.x,
              y: placeHolder?.formField.coordinates.y,
              width: placeHolder?.image.width,
              height: placeHolder?.image.height,
            });
          } else if (placeHolder?.itemId === 'checkbox') {
            const padding = 6;
            let pngImage = await pdfDoc.embedPng(
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJ0SURBVHgB7ZtBbhoxFIb/52mlSOmC3gDUA2SAEJEVE7pFKidIjtDcAHEEeoHSEzRINFIXBbKpRkkAr9hEKkjdVk3V2VRqx649MGTS5gLz4k9CzHs2i49nezbPhAfY368HWuPEfAIQisgRBJIaWhLEYDr9fPb/eAbfrxc9D281jCgPlipGU8pwlSa2wr5f84UnxiZVAC9ulYib8upK2iARtpUVnp6nslrrHySop4CJvA4nyAmdTgeD83OflHdqxE4yQ7em0hVb6US4Uq0vzVfRPpt9u9IKR9llkDdMwVCpHJZMOUe0OYPMNh3Pp2GTqtWDtoZ4n042/0Qpz7IpVrpcPiwJDzMT2pWrFaEpFEQ7M6/PQdZCprSFws7SlLaXpoTGsSBNe+kkFcc9MKLRaEAJXGRSAZn9q9NoNg0JzAiCgH5Gv9Qm1AKPDCfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMncctbPuNuRFF0b3YCq/SYPDhYwBG2ALG8Y6fxhqQQqu7blOhENg+Yy4sFgsSXnyaxpQIe+jjLvPadpJzkLbVvbn5WjKPx5uUVqTPknbhcrU+Mg9HSZqwUn/Q9Lzfq1arpbvdLvKEFR0OhxTHT0viCT6ZdVy0eVPDL/NZ+CJzySNplX+e+W3fE/Gb3d1diZwQRc9A9C1QCg27WrFu/bey383WrW4veVj8Ws0XyhvhvnTuWcuql1JeJoXbvpbsvR571cVMsDdcOJxc9iQaryt7uV2lD7b8+9WDNkG8MsN7BO0jR9hrSESYKMI7eR1e/Dv+F5R469eW8mIYAAAAAElFTkSuQmCC'
            );
            if (placeHolder?.isChecked) {
              pngImage = await pdfDoc.embedPng(
                `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALzSURBVHgB7dvPb9JgHMfxz/PUIyQad9niYYlxO65b58IOmrr9Ae4v0MQfQKJ/hFcTPZroYvzxFzij8TCNsB0McSK9DhPHP4Ac8ERCH5/vY0pQYBQo0D7lnTQrpWR95YFCmzwMXVpfT9lC4KZcbDAsIkIxMEdAOAz8bbH4Za/z+bZMM7VoGHgpIKF6dOI2seU4hYq3oQU2zcsmN3hObjoLvaq5vLnlHB059ECBaWS5IUoaYr1qcqTXaKQ5PeIGdBzZ9s4xAy9ohVnWxo4AfwP9Ey7DFnfBdxCPGBe4wZlgK4hPNgcTJuLTIkfMmoF1bwbWvRk4Ki0szMOyVjFoZxDBMuk7SKdvq/Xj4zIy2fuo1+u+Xhu5EW7HUktLl2DbV3y/PlLg/7Fe9fpv+C0y4F7YcvkH8vlD+C0S4F5Y7/M7SKEH98P6PVl5hRocNJYKLXgcWCqU4HFhqdCBx4mlBgInk0m1jKtxYynfYDqYfG5fLZkuBzVqk8BSxvzChQf9dqIf6o8fPWw9tqw1dQe/WCwhiCaFpXyNcCLR+TZOy4MMYqQniaV8jXC1WsW6HFUa6fZGHelJYylfYCp/cIjNzRTm5s7/s31YdDZzd+JYyje40Whg/+OnQNDTGFkv32AqCPQ0sdRAYGoU9LSx1MBgahh0GLDUUGBqEHRYsBRbs1ICI5RMJvDs6RMsLy91PLe7+5z+RWiwMjEymDoN3a0pYSkRyNUS3UTLZO8pSL+miFUFdnnoBz1tLBXo9fBp6DBgqcBvALSjhRBqCQuWCuSk1SvbvopkIoF37z8gJImxgkOYiMSN+CCbgXVvBta9GVj3CFxBTJI/OBwuXBwgJjEFNvAK8Ui4TOypOQ+rVuqzXLkGjZPXMD9L3wsX1UlLNHFL/qlB0yT2l/zobtO6AtNsD5rqAg3Rf7Hutjd3qfW1RPN6aKqL3OEE6oQW+SQFOTmyluN8dbyNrNueprWxw8Cvy6dXGKI1RUAqK4wh7zK8dr4VOr6B/gCEy9ciU6Kk2AAAAABJRU5ErkJggg==`
              );
            }
            currentPage.drawImage(pngImage, {
              x: placeHolder?.formField.coordinates.x,
              y: placeHolder?.formField.coordinates.y + padding * 0.75,
              width: (placeHolder?.width || 34) - padding * 2,
              height: (placeHolder?.height || 34) - padding * 2,
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
