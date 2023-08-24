const { PDFDocument, rgb } = require('pdf-lib');
const FileDetails = require('../models/FileDetails');
const { s3, getSignedUrl, loadFileDetails } = require('./s3');
const fontkit = require('@pdf-lib/fontkit');
const FileHistory = require('../models/FileHistory');
const {
  setMondayToken,
  handleFormatNumericColumn,
} = require('../utils/monday');
const {
  getColumnValues,
  updateStatusColumn,
  getColumnDetails,
  getSpecificColumnValue,
  getSpecificSubItemColumnValue,
} = require('./monday.service');
const STANDARD_FIELDS = require('../config/standardFields');
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
const {
  getFormulaColumns,
  parseFormulaColumnIds,
  renameFunctions,
  hasNestedIF,
  getSubItems,
  getFormulaValueOfItem,
} = require('../utils/formula');
const { formulaeParser } = require('../utils/mondayFormulaConverter');
const { HyperFormula } = require('hyperformula');
const { toFixed } = require('../utils/number');
const { createTable } = require('../utils/table');

const scalingFactor = 0.75;

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
        notSignedByBoth?.forEach(async item => {
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

        const notSignedByBothItemIds = notSignedByBoth.map(item => item?._id);

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

const generatePDF = async (id, fields, items_subItem) => {
  try {
    const fileDetails = await loadFileDetails(id);

    const pdfDoc = await PDFDocument.load(fileDetails?.file);
    const pages = pdfDoc.getPages();
    pdfDoc.registerFontkit(fontkit);
    // Load the `Arial Unicode MS.ttf`
    const fontBytes = fs.readFileSync(
      path.join(__dirname, '..', 'utils/fonts/Arial Unicode MS.ttf')
    );
    const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });

    if (fields?.length && fileDetails?.fields) {
      // fileDetails?.fields?.forEach(async placeHolder =>

      for (const placeHolder of fileDetails?.fields) {
        const currentPage = pages[placeHolder?.formField?.pageIndex];
        if (!currentPage) return;

        if (placeHolder?.itemId === 'sign-date') {
          const fontSize = placeHolder.fontSize || 11;
          const currentDate = moment(new Date())
            .format(placeHolder?.dateFormat?.format || 'DD/MM/YYYY')
            .toString();

          const height = placeHolder.height || 18.33;

          currentPage.drawText(currentDate || '', {
            x: placeHolder.formField.coordinates.x + 8,
            y:
              placeHolder.formField.coordinates.y -
              fontSize +
              (fontSize * 1.375 - fontSize) / 2 -
              8,
            font: customFont,
            size: fontSize,
          });
        } else if (placeHolder?.itemId === 'text-box') {
          const fontSize = placeHolder.fontSize || 11;
          const height = placeHolder.height || 18.33;

          currentPage.drawText(placeHolder?.content || '', {
            x: placeHolder.formField.coordinates.x + 8,
            y:
              placeHolder.formField.coordinates.y -
              height +
              (height - fontSize * 1.375) / 2 -
              (fontSize * 1.375 - fontSize) / 2,
            font: customFont,
            size: fontSize,
          });
        } else if (placeHolder?.itemId === 'line-item') {
          for (const [subItemIndex, subItem] of items_subItem?.entries()) {
            const formulaColumnValues = await getFormulaValueOfItem({
              itemId: subItem.id,
              boardColumns: subItem?.board?.columns || [],
              boardColumnValues: subItem?.column_values || [],
            });

            for (const columnValue of formulaColumnValues) {
              const alreadyExistsIdx = subItem.column_values.findIndex(
                formValue => formValue.id === columnValue?.id
              );

              if (alreadyExistsIdx > -1) {
                items_subItem[subItemIndex]?.column_values?.forEach(
                  (col, index) => {
                    if (col.id == columnValue.id) {
                      col = columnValue;
                    }

                    items_subItem[subItemIndex].column_values[index] = col;
                  }
                );
              } else {
                items_subItem[subItemIndex]?.column_values?.push({
                  ...columnValue,
                });
              }
            }
          }

          const tableData = await getSubItems(
            placeHolder?.subItemSettings || {},
            items_subItem
          );
          const initialXCoordinate = placeHolder.formField.coordinates.x;
          const initialYCoordinate = placeHolder.formField.coordinates.y;

          createTable({
            currentPage,
            tableData,
            initialXCoordinate,
            initialYCoordinate,
            tableWidth: placeHolder?.width || 564,
            tableSetting: {
              ...(placeHolder?.subItemSettings || {}),
            },
          });
        } else {
          const value = fields.find(item => item?.id === placeHolder?.itemId);

          const calculationError =
            typeof value?.text === 'object' && value?.type === 'formula';

          if (value) {
            const fontSize = placeHolder?.fontSize || 11;
            const scalingFactor = 0.75;

            if (calculationError) {
              console.error('Calculation Error', value);
              return currentPage.drawText('Error, Cannot Calculate', {
                color: rgb(0.86, 0.14, 0.14),
                x: placeHolder.formField.coordinates.x,
                y:
                  placeHolder.formField.coordinates.y -
                  fontSize * scalingFactor,
                font: customFont,
                size: fontSize,
              });
            }
            if (value?.type === 'numeric') {
              currentPage.drawText(value?.formattedValue || value?.text || '', {
                x: placeHolder.formField.coordinates.x,
                y:
                  placeHolder.formField.coordinates.y -
                  fontSize * scalingFactor,
                font: customFont,
                size: fontSize,
              });
            } else {
              currentPage.drawText(value?.text || '', {
                x: placeHolder.formField.coordinates.x,
                y:
                  placeHolder.formField.coordinates.y -
                  fontSize * scalingFactor,
                font: customFont,
                size: fontSize,
              });
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: 'application/pdf',
      });
      const type = blob.type;
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64String = buffer.toString('base64');
      return {
        name: fileDetails.file_name,
        file: `data:${type};base64,${base64String}`,
      };
    }
  } catch (error) {
    throw error;
  }
};

const generatePDFWithGivenPlaceholders = async (
  id,
  placeholders,
  values,
  items_subItem = [],
  itemId
) => {
  try {
    const fileDetails = await loadFileDetails(id);

    await setMondayToken(fileDetails?.user_id, fileDetails?.account_id);

    /* Parse formula columns start */

    const boardFormulaColumnValues = new Map();

    const formulaColumns = getFormulaColumns(
      items_subItem?.[0]?.column_values || []
    );

    if (formulaColumns.length > 0) {
      const subItemBoardColumns = items_subItem?.[0]?.board?.columns?.filter(
        col => col?.type === 'formula'
      );

      for (const columnValue of subItemBoardColumns) {
        boardFormulaColumnValues.set(
          columnValue.id,
          parseFormulaColumnIds(columnValue.settings_str)
        );
      }

      for (const columnValue of subItemBoardColumns) {
        const parsedFormulaColumn = parseFormulaColumnIds(
          columnValue.settings_str
        );
        let parsedRecursiveFormula = parsedFormulaColumn.formula;

        parsedFormulaColumn?.formulaColumns?.map(item => {
          let currentItemValue = boardFormulaColumnValues.get(item);
          if (currentItemValue?.formula || currentItemValue) {
            const globalRegex = new RegExp(`{${item}}`, 'g');
            parsedRecursiveFormula = parsedRecursiveFormula.replace(
              globalRegex,
              currentItemValue || currentItemValue?.formula
            );
          }
        });

        boardFormulaColumnValues.set(columnValue.id, parsedRecursiveFormula);
      }

      let finalFormula;

      for (const column of subItemBoardColumns) {
        for (const [subItemIndex, subItem] of items_subItem?.entries()) {
          const formulaColumnValues = new Map();
          const parsedColumn = parseFormulaColumnIds(column?.settings_str);

          finalFormula = parsedColumn.formula;
          for (const itemColumnValue of subItem?.column_values) {
            if (
              parsedColumn.formulaColumns?.length &&
              parsedColumn.formulaColumns.includes(itemColumnValue.id)
            ) {
              let columnValue;

              if (itemColumnValue.type === 'formula') {
                columnValue = boardFormulaColumnValues.get(itemColumnValue.id);
                columnValue = '=' + columnValue.replace(/'/g, '"');
                columnValue = renameFunctions(columnValue);
                const parsedFormula = formulaeParser(columnValue);
                columnValue = parsedFormula.formula;
              } else {
                columnValue = await getSpecificSubItemColumnValue(
                  itemId,
                  subItem?.id,
                  itemColumnValue.id
                );
              }
              formulaColumnValues.set(
                {
                  id: itemColumnValue.id,
                },
                columnValue
              );
            }
          }

          const formulaColumnsKeys = Array.from(formulaColumnValues.keys());

          for (let index = 0; index < formulaColumnsKeys.length; index++) {
            const key = formulaColumnsKeys[index];
            const chr = String.fromCharCode(97 + index).toUpperCase();
            const globalRegex = new RegExp(`{${key?.id}}`, 'g');
            finalFormula = finalFormula.replace(globalRegex, `${chr}1`);
          }
          const isNestedFormulae = hasNestedIF(finalFormula);

          if (isNestedFormulae) {
            // Remove 'IF' and remove the nested parentheses
            const ifsFormula = finalFormula
              .replace(/IF/g, '')
              .replace(/\(/g, '')
              .replace(/\)/g, '');

            // Split the formula into individual conditions and values
            const conditionsAndValues = ifsFormula.split(', ');

            // Construct the IFS syntax
            finalFormula = 'IFS(' + conditionsAndValues.join(', ') + ')';
          }
          finalFormula = '=' + finalFormula.replace(/'/g, '"');
          finalFormula = renameFunctions(finalFormula);
          const parsedFormula = formulaeParser(finalFormula);

          // Hyper Formula Plugin
          const formulaRow = [
            ...Array.from(formulaColumnValues.values()),
            parsedFormula.formula,
          ];

          const hfInstance = HyperFormula.buildFromArray([formulaRow], {
            licenseKey: 'gpl-v3',
            useColumnIndex: true,
            smartRounding: false,
          });
          let finalFormulaValue = hfInstance.getCellValue({
            sheet: 0,
            col: formulaRow.length - 1,
            row: 0,
          });
          finalFormulaValue = isNaN(finalFormulaValue)
            ? finalFormulaValue
            : toFixed(finalFormulaValue, 2);

          if (typeof finalFormulaValue !== 'object') {
            boardFormulaColumnValues.set(column.id, finalFormulaValue);
            const alreadyExistsIdx = subItem.column_values.findIndex(
              formValue => formValue.id === column?.id
            );

            if (alreadyExistsIdx > -1) {
              items_subItem[subItemIndex]?.column_values?.forEach(
                (col, index) => {
                  if (col.id == column.id) {
                    col = {
                      ...col,
                      text: parsedFormula.symbol
                        ? `${parsedFormula?.symbol}${finalFormulaValue}`
                        : finalFormulaValue,
                    };
                  }

                  items_subItem[subItemIndex].column_values[index] = col;
                }
              );
            } else {
              items_subItem[subItemIndex]?.column_values?.push({
                ...column,
                text: parsedFormula.symbol
                  ? `${parsedFormula?.symbol}${finalFormulaValue}`
                  : finalFormulaValue,
              });
            }
          } else {
            boardFormulaColumnValues.set(column.id, '0');
            const alreadyExistsIdx = subItem.column_values.findIndex(
              formValue => formValue.id === column?.id
            );

            if (alreadyExistsIdx > -1) {
              items_subItem[subItemIndex]?.column_values?.forEach(
                (col, index) => {
                  if (col.id == column.id) {
                    col = {
                      ...col,
                      text: parsedFormula.symbol
                        ? `${parsedFormula?.symbol}${0}`
                        : '0',
                    };
                  }
                  items_subItem[subItemIndex].column_values[index] = col;
                }
              );
            } else {
              items_subItem[subItemIndex]?.column_values?.push({
                ...column,
                text: parsedFormula.symbol
                  ? `${parsedFormula?.symbol}${0}`
                  : '0',
              });
            }
          }
        }
      }

      // for (const column of subItemBoardColumns) {
      //   const formulaColumnValues = new Map();
      //   const parsedColumn = parseFormulaColumnIds(column?.settings_str);
      //   finalFormula = parsedColumn.formula;

      //   for (const item of items_subItem) {
      //     for (const column_value of item.column_values) {
      //       console.log({ column_value, parsedColumn });
      //       if (
      //         parsedColumn.formulaColumns?.length &&
      //         parsedColumn.formulaColumns.includes(column_value.id)
      //       ) {
      //         let columnValue;
      //         if (column_value.type === 'formula') {
      //           columnValue = boardFormulaColumnValues.get(column_value.id);
      //           columnValue = '=' + columnValue.replace(/'/g, '"');
      //           columnValue = renameFunctions(columnValue);
      //           const parsedFormula = formulaeParser(columnValue);
      //           columnValue = parsedFormula.formula;
      //         } else {
      //           columnValue = column_value?.text;
      //         }

      //         formulaColumnValues.set(
      //           {
      //             id: column_value.id,
      //           },
      //           columnValue
      //         );
      //       }
      //     }
      //   }
      //   console.log({ formulaColumnValues });
      // }
    }
    /* Parse formula columns end */

    const pdfDoc = await PDFDocument.load(fileDetails?.file);
    const pages = pdfDoc.getPages();
    pdfDoc.registerFontkit(fontkit);
    // Load the `Arial Unicode MS.ttf`
    const fontBytes = fs.readFileSync(
      path.join(__dirname, '..', 'utils/fonts/Arial Unicode MS.ttf')
    );
    const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });

    if (values?.length && placeholders?.length) {
      for (const placeHolder of placeholders) {
        const currentPage = pages[placeHolder?.formField?.pageIndex];
        if (!currentPage) return;

        // else if (placeHolder?.itemId === 'checkbox') {
        // const padding = 6; // 6 is done because we have padding+boders in the frontend checkbox box
        // let pngImage = await pdfDoc.embedPng(
        //   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJ0SURBVHgB7ZtBbhoxFIb/52mlSOmC3gDUA2SAEJEVE7pFKidIjtDcAHEEeoHSEzRINFIXBbKpRkkAr9hEKkjdVk3V2VRqx649MGTS5gLz4k9CzHs2i49nezbPhAfY368HWuPEfAIQisgRBJIaWhLEYDr9fPb/eAbfrxc9D281jCgPlipGU8pwlSa2wr5f84UnxiZVAC9ulYib8upK2iARtpUVnp6nslrrHySop4CJvA4nyAmdTgeD83OflHdqxE4yQ7em0hVb6US4Uq0vzVfRPpt9u9IKR9llkDdMwVCpHJZMOUe0OYPMNh3Pp2GTqtWDtoZ4n042/0Qpz7IpVrpcPiwJDzMT2pWrFaEpFEQ7M6/PQdZCprSFws7SlLaXpoTGsSBNe+kkFcc9MKLRaEAJXGRSAZn9q9NoNg0JzAiCgH5Gv9Qm1AKPDCfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMncctbPuNuRFF0b3YCq/SYPDhYwBG2ALG8Y6fxhqQQqu7blOhENg+Yy4sFgsSXnyaxpQIe+jjLvPadpJzkLbVvbn5WjKPx5uUVqTPknbhcrU+Mg9HSZqwUn/Q9Lzfq1arpbvdLvKEFR0OhxTHT0viCT6ZdVy0eVPDL/NZ+CJzySNplX+e+W3fE/Gb3d1diZwQRc9A9C1QCg27WrFu/bey383WrW4veVj8Ws0XyhvhvnTuWcuql1JeJoXbvpbsvR571cVMsDdcOJxc9iQaryt7uV2lD7b8+9WDNkG8MsN7BO0jR9hrSESYKMI7eR1e/Dv+F5R469eW8mIYAAAAAElFTkSuQmCC'
        // );
        // if (placeHolder?.isChecked) {
        //   pngImage = await pdfDoc.embedPng(
        //     `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALzSURBVHgB7dvPb9JgHMfxz/PUIyQad9niYYlxO65b58IOmrr9Ae4v0MQfQKJ/hFcTPZroYvzxFzij8TCNsB0McSK9DhPHP4Ac8ERCH5/vY0pQYBQo0D7lnTQrpWR95YFCmzwMXVpfT9lC4KZcbDAsIkIxMEdAOAz8bbH4Za/z+bZMM7VoGHgpIKF6dOI2seU4hYq3oQU2zcsmN3hObjoLvaq5vLnlHB059ECBaWS5IUoaYr1qcqTXaKQ5PeIGdBzZ9s4xAy9ohVnWxo4AfwP9Ey7DFnfBdxCPGBe4wZlgK4hPNgcTJuLTIkfMmoF1bwbWvRk4Ki0szMOyVjFoZxDBMuk7SKdvq/Xj4zIy2fuo1+u+Xhu5EW7HUktLl2DbV3y/PlLg/7Fe9fpv+C0y4F7YcvkH8vlD+C0S4F5Y7/M7SKEH98P6PVl5hRocNJYKLXgcWCqU4HFhqdCBx4mlBgInk0m1jKtxYynfYDqYfG5fLZkuBzVqk8BSxvzChQf9dqIf6o8fPWw9tqw1dQe/WCwhiCaFpXyNcCLR+TZOy4MMYqQniaV8jXC1WsW6HFUa6fZGHelJYylfYCp/cIjNzRTm5s7/s31YdDZzd+JYyje40Whg/+OnQNDTGFkv32AqCPQ0sdRAYGoU9LSx1MBgahh0GLDUUGBqEHRYsBRbs1ICI5RMJvDs6RMsLy91PLe7+5z+RWiwMjEymDoN3a0pYSkRyNUS3UTLZO8pSL+miFUFdnnoBz1tLBXo9fBp6DBgqcBvALSjhRBqCQuWCuSk1SvbvopkIoF37z8gJImxgkOYiMSN+CCbgXVvBta9GVj3CFxBTJI/OBwuXBwgJjEFNvAK8Ui4TOypOQ+rVuqzXLkGjZPXMD9L3wsX1UlLNHFL/qlB0yT2l/zobtO6AtNsD5rqAg3Rf7Hutjd3qfW1RPN6aKqL3OEE6oQW+SQFOTmyluN8dbyNrNueprWxw8Cvy6dXGKI1RUAqK4wh7zK8dr4VOr6B/gCEy9ciU6Kk2AAAAABJRU5ErkJggg==`
        //   );
        // }
        // currentPage.drawImage(pngImage, {
        //   x: placeHolder?.formField.coordinates.x + padding,
        //   // because coordinate calculation is done from bottom-left and the date has to be in the middle so multiplied by 2
        //   y:
        //     placeHolder?.formField.coordinates.y -
        //     (placeHolder?.height || 34) +
        //     padding, // substract padding just from bottom and decrease height because coordinates are calculated from bottom left
        //   width: (placeHolder?.width || 34) - padding * 2, // default width is 34 and padding*2 is done because of padding-X = 6 in UI
        //   height: (placeHolder?.height || 34) - padding * 2, // default height is 34 and padding*2 is done because of padding-Y = 6 in UI
        // });
        // }

        if (placeHolder?.itemId === 'sign-date') {
          const fontSize = placeHolder.fontSize || 11;
          const currentDate = moment(new Date())
            .format(placeHolder?.dateFormat?.format || 'DD/MM/YYYY')
            .toString();

          const height = placeHolder.height || 18.33;
          currentPage.drawText(currentDate || '', {
            x: placeHolder.formField.coordinates.x + 8,
            y:
              placeHolder.formField.coordinates.y -
              fontSize +
              (fontSize * 1.375 - fontSize) / 2 -
              8,
            font: customFont,
            size: fontSize,
          });
        } else if (placeHolder?.itemId === 'text-box') {
          const fontSize = placeHolder.fontSize || 11;
          const height = placeHolder.height || 18.33;

          currentPage.drawText(placeHolder?.content || '', {
            x: placeHolder.formField.coordinates.x + 8,
            y:
              placeHolder.formField.coordinates.y -
              height +
              (height - fontSize * 1.375) / 2 -
              (fontSize * 1.375 - fontSize) / 2,
            font: customFont,
            size: fontSize,
          });
        } else if (placeHolder?.itemId === 'line-item') {
          const tableData = await getSubItems(
            placeHolder?.subItemSettings,
            items_subItem
          );

          const initialXCoordinate = placeHolder.formField.coordinates.x;
          const initialYCoordinate = placeHolder.formField.coordinates.y;

          createTable({
            currentPage,
            tableData,
            initialXCoordinate,
            initialYCoordinate,
            tableWidth: placeHolder?.width,
            tableSetting: {
              ...(placeHolder?.subItemSettings || {}),
            },
          });
        } else {
          const value = values.find(item => item?.id === placeHolder?.itemId);

          const calculationError =
            typeof value?.text === 'object' && value?.type === 'formula';

          if (value) {
            const fontSize = placeHolder?.fontSize || 11;

            const scalingFactor = 0.75;

            if (calculationError) {
              console.error('Calculation Error', value);
              return currentPage.drawText('Error, Cannot Calculate', {
                color: rgb(0.86, 0.14, 0.14),
                x: placeHolder.formField.coordinates.x,
                y:
                  placeHolder.formField.coordinates.y -
                  fontSize * scalingFactor,
                font: customFont,
                size: fontSize,
              });
            }

            if (value?.type === 'numeric') {
              currentPage.drawText(value?.formattedValue || '', {
                x: placeHolder.formField.coordinates.x,
                y:
                  placeHolder.formField.coordinates.y -
                  fontSize * scalingFactor,
                font: customFont,
                size: fontSize,
              });
            } else {
              currentPage.drawText(value?.text || '', {
                x: placeHolder.formField.coordinates.x,
                y:
                  placeHolder.formField.coordinates.y -
                  fontSize * scalingFactor,
                font: customFont,
                size: fontSize,
              });
            }
          }
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], {
      type: 'application/pdf',
    });
    const type = blob.type;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = buffer.toString('base64');
    return {
      name: fileDetails.file_name,
      file: `data:${type};base64,${base64String}`,
    };
  } catch (error) {
    throw error;
  }
};

const loadFile = async url => {
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
    const fileDetails = await loadFileDetails(id);
    await setMondayToken(fileDetails.user_id, fileDetails.account_id);
    const valuesToFill = await getColumnValues(itemId);

    let item = valuesToFill?.data?.items?.[0];

    item = handleFormatNumericColumn(item);

    if (item) {
      valuesToFill.data.items[0] = item;
    }

    const items_subItem = valuesToFill?.data?.items?.[0]?.subitems || [];

    const values = [
      ...(valuesToFill?.data?.items?.[0]?.column_values || []),
      {
        id: 'item-name',
        text: valuesToFill?.data?.items?.[0]?.name || '',
        title: 'Item Name',
        type: 'text',
      },
    ];

    // Formula column
    const boardFormulaColumnValues = new Map();

    const formulaColumns = getFormulaColumns(
      valuesToFill?.data?.items?.[0]?.column_values || []
    );

    if (formulaColumns.length > 0) {
      const columnDetailsResponse = await getColumnDetails(
        itemId,
        formulaColumns?.map(column => column?.id)
      );
      const columnDetails =
        columnDetailsResponse?.data?.items?.[0]?.board?.columns || [];

      // storing formula column settings_str values in map
      for (const columnValue of columnDetails) {
        boardFormulaColumnValues.set(
          columnValue.id,
          parseFormulaColumnIds(columnValue.settings_str)
        );
      }

      // parsing and replacing formula column id with actual formula string
      for (const columnValue of columnDetails) {
        const parsedFormulaColumn = parseFormulaColumnIds(
          columnValue.settings_str
        );
        let parsedRecursiveFormula = parsedFormulaColumn.formula;

        parsedFormulaColumn?.formulaColumns?.map(item => {
          let currentItemValue = boardFormulaColumnValues.get(item);
          if (currentItemValue?.formula || currentItemValue) {
            const globalRegex = new RegExp(`{${item}}`, 'g');
            parsedRecursiveFormula = parsedRecursiveFormula.replace(
              globalRegex,
              currentItemValue || currentItemValue?.formula
            );
          }
        });

        boardFormulaColumnValues.set(columnValue.id, parsedRecursiveFormula);
      }

      let finalFormula;
      for (const column of columnDetails) {
        const formulaColumnValues = new Map();
        const parsedColumn = parseFormulaColumnIds(column?.settings_str);
        finalFormula = parsedColumn.formula;
        for (const item of valuesToFill?.data?.items?.[0]?.column_values) {
          if (
            parsedColumn.formulaColumns?.length &&
            parsedColumn.formulaColumns.includes(item.id)
          ) {
            let columnValue;
            if (item.type === 'formula') {
              columnValue = boardFormulaColumnValues.get(item.id);
              columnValue = '=' + columnValue.replace(/'/g, '"');
              columnValue = renameFunctions(columnValue);
              const parsedFormula = formulaeParser(columnValue);
              columnValue = parsedFormula.formula;
            } else {
              columnValue = await getSpecificColumnValue(itemId, item.id);
            }
            formulaColumnValues.set(
              {
                id: item.id,
              },
              columnValue
            );
          }
        }

        const formulaColumnsKeys = Array.from(formulaColumnValues.keys());
        for (let index = 0; index < formulaColumnsKeys.length; index++) {
          const key = formulaColumnsKeys[index];
          const chr = String.fromCharCode(97 + index).toUpperCase();
          const globalRegex = new RegExp(`{${key?.id}}`, 'g');
          finalFormula = finalFormula.replace(globalRegex, `${chr}1`);
        }

        // check if this is nested IF Conditions
        const isNestedFormulae = hasNestedIF(finalFormula);

        if (isNestedFormulae) {
          // Remove 'IF' and remove the nested parentheses
          const ifsFormula = finalFormula
            .replace(/IF/g, '')
            .replace(/\(/g, '')
            .replace(/\)/g, '');

          // Split the formula into individual conditions and values
          const conditionsAndValues = ifsFormula.split(', ');

          // Construct the IFS syntax
          finalFormula = 'IFS(' + conditionsAndValues.join(', ') + ')';
        }

        finalFormula = '=' + finalFormula.replace(/'/g, '"');
        finalFormula = renameFunctions(finalFormula);
        const parsedFormula = formulaeParser(finalFormula);

        // Hyper Formula Plugin
        const formulaRow = [
          ...Array.from(formulaColumnValues.values()),
          parsedFormula.formula,
        ];

        const hfInstance = HyperFormula.buildFromArray([formulaRow], {
          licenseKey: 'gpl-v3',
          useColumnIndex: true,
          smartRounding: false,
        });
        let finalFormulaValue = hfInstance.getCellValue({
          sheet: 0,
          col: formulaRow.length - 1,
          row: 0,
        });
        finalFormulaValue = isNaN(finalFormulaValue)
          ? finalFormulaValue
          : toFixed(finalFormulaValue, 2);

        if (typeof finalFormulaValue !== 'object') {
          boardFormulaColumnValues.set(column.id, finalFormulaValue);
          const alreadyExistsIdx = values.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            values[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${finalFormulaValue}`
              : finalFormulaValue;
          } else {
            values.push({
              ...column,
              text: parsedFormula.symbol
                ? `${parsedFormula?.symbol}${finalFormulaValue}`
                : finalFormulaValue,
            });
          }
        } else {
          boardFormulaColumnValues.set(column.id, '0');
          const alreadyExistsIdx = values.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            values[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${0}`
              : '0';
          } else {
            values.push({
              ...column,
              text: parsedFormula.symbol ? `${parsedFormula?.symbol}${0}` : '0',
            });
          }
        }
      }
    }

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

    // Load the `Arial Unicode MS.ttf` // Load the `Arial Unicode MS.ttf`
    const fontBytes = fs.readFileSync(
      path.join(__dirname, '..', 'utils/fonts/Arial Unicode MS.ttf')
    );
    const customFont = await pdfDoc.embedFont(fontBytes, {
      subset: true,
    });

    if (fileDetails?.fields) {
      if (interactedFields?.length) {
        // interactedFields?.forEach(async placeHolder =>

        for (const placeHolder of interactedFields) {
          const currentPage = pages[placeHolder?.formField?.pageIndex];

          if (placeHolder?.image?.src) {
            const pngImage = await pdfDoc.embedPng(placeHolder?.image?.src);
            const heightOfSignPlaceholder = 33;

            currentPage.drawImage(pngImage, {
              x: placeHolder?.formField.coordinates.x,
              y: placeHolder?.formField.coordinates.y - heightOfSignPlaceholder,
              width: placeHolder?.image.width,
              height: placeHolder?.image.height,
            });
          } else if (placeHolder?.itemId === 'sign-date') {
            const fontSize = placeHolder.fontSize || 11;
            const currentDate = moment(new Date())
              .format(placeHolder?.dateFormat?.format || 'DD/MM/YYYY')
              .toString();

            const height = placeHolder.height || 18.33;
            currentPage.drawText(currentDate || '', {
              x: placeHolder.formField.coordinates.x + 8,
              y:
                placeHolder.formField.coordinates.y -
                fontSize +
                (fontSize * 1.375 - fontSize) / 2 -
                8,
              font: customFont,
              size: fontSize,
            });
          } else if (placeHolder?.itemId === 'line-item') {
            for (const [subItemIndex, subItem] of items_subItem?.entries()) {
              const formulaColumnValues = await getFormulaValueOfItem({
                itemId: subItem.id,
                boardColumns: subItem?.board?.columns || [],
                boardColumnValues: subItem?.column_values || [],
              });

              for (const columnValue of formulaColumnValues) {
                const alreadyExistsIdx = subItem.column_values.findIndex(
                  formValue => formValue.id === columnValue?.id
                );

                if (alreadyExistsIdx > -1) {
                  items_subItem[subItemIndex]?.column_values?.forEach(
                    (col, index) => {
                      if (col.id == columnValue.id) {
                        col = columnValue;
                      }

                      items_subItem[subItemIndex].column_values[index] = col;
                    }
                  );
                } else {
                  items_subItem[subItemIndex]?.column_values?.push({
                    ...columnValue,
                  });
                }
              }
            }
            const tableData = await getSubItems(
              placeHolder?.subItemSettings,
              items_subItem
            );

            const initialXCoordinate = placeHolder.formField.coordinates.x;
            const initialYCoordinate = placeHolder.formField.coordinates.y;

            createTable({
              currentPage,
              tableData,
              initialXCoordinate,
              initialYCoordinate,
              tableWidth: placeHolder?.width,
              tableSetting: {
                ...(placeHolder?.subItemSettings || {}),
              },
            });
          } else if (
            placeHolder?.itemId === STANDARD_FIELDS.textBox ||
            placeHolder?.itemId === STANDARD_FIELDS.status
          ) {
            const fontSize = placeHolder.fontSize || 11;
            const height = placeHolder.height || 18.33;

            currentPage.drawText(placeHolder?.content || '', {
              x: placeHolder.formField.coordinates.x + 8,
              y:
                placeHolder.formField.coordinates.y -
                height +
                (height - fontSize * 1.375) / 2 -
                (fontSize * 1.375 - fontSize) / 2,
              font: customFont,
              size: fontSize,
            });
          } else if (placeHolder?.itemId === 'checkbox') {
            const padding = 5;
            let pngImage = await pdfDoc.embedPng(
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJ0SURBVHgB7ZtBbhoxFIb/52mlSOmC3gDUA2SAEJEVE7pFKidIjtDcAHEEeoHSEzRINFIXBbKpRkkAr9hEKkjdVk3V2VRqx649MGTS5gLz4k9CzHs2i49nezbPhAfY368HWuPEfAIQisgRBJIaWhLEYDr9fPb/eAbfrxc9D281jCgPlipGU8pwlSa2wr5f84UnxiZVAC9ulYib8upK2iARtpUVnp6nslrrHySop4CJvA4nyAmdTgeD83OflHdqxE4yQ7em0hVb6US4Uq0vzVfRPpt9u9IKR9llkDdMwVCpHJZMOUe0OYPMNh3Pp2GTqtWDtoZ4n042/0Qpz7IpVrpcPiwJDzMT2pWrFaEpFEQ7M6/PQdZCprSFws7SlLaXpoTGsSBNe+kkFcc9MKLRaEAJXGRSAZn9q9NoNg0JzAiCgH5Gv9Qm1AKPDCfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMHSfMncctbPuNuRFF0b3YCq/SYPDhYwBG2ALG8Y6fxhqQQqu7blOhENg+Yy4sFgsSXnyaxpQIe+jjLvPadpJzkLbVvbn5WjKPx5uUVqTPknbhcrU+Mg9HSZqwUn/Q9Lzfq1arpbvdLvKEFR0OhxTHT0viCT6ZdVy0eVPDL/NZ+CJzySNplX+e+W3fE/Gb3d1diZwQRc9A9C1QCg27WrFu/bey383WrW4veVj8Ws0XyhvhvnTuWcuql1JeJoXbvpbsvR571cVMsDdcOJxc9iQaryt7uV2lD7b8+9WDNkG8MsN7BO0jR9hrSESYKMI7eR1e/Dv+F5R469eW8mIYAAAAAElFTkSuQmCC'
            );
            if (placeHolder?.isChecked) {
              pngImage = await pdfDoc.embedPng(
                `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALzSURBVHgB7dvPb9JgHMfxz/PUIyQad9niYYlxO65b58IOmrr9Ae4v0MQfQKJ/hFcTPZroYvzxFzij8TCNsB0McSK9DhPHP4Ac8ERCH5/vY0pQYBQo0D7lnTQrpWR95YFCmzwMXVpfT9lC4KZcbDAsIkIxMEdAOAz8bbH4Za/z+bZMM7VoGHgpIKF6dOI2seU4hYq3oQU2zcsmN3hObjoLvaq5vLnlHB059ECBaWS5IUoaYr1qcqTXaKQ5PeIGdBzZ9s4xAy9ohVnWxo4AfwP9Ey7DFnfBdxCPGBe4wZlgK4hPNgcTJuLTIkfMmoF1bwbWvRk4Ki0szMOyVjFoZxDBMuk7SKdvq/Xj4zIy2fuo1+u+Xhu5EW7HUktLl2DbV3y/PlLg/7Fe9fpv+C0y4F7YcvkH8vlD+C0S4F5Y7/M7SKEH98P6PVl5hRocNJYKLXgcWCqU4HFhqdCBx4mlBgInk0m1jKtxYynfYDqYfG5fLZkuBzVqk8BSxvzChQf9dqIf6o8fPWw9tqw1dQe/WCwhiCaFpXyNcCLR+TZOy4MMYqQniaV8jXC1WsW6HFUa6fZGHelJYylfYCp/cIjNzRTm5s7/s31YdDZzd+JYyje40Whg/+OnQNDTGFkv32AqCPQ0sdRAYGoU9LSx1MBgahh0GLDUUGBqEHRYsBRbs1ICI5RMJvDs6RMsLy91PLe7+5z+RWiwMjEymDoN3a0pYSkRyNUS3UTLZO8pSL+miFUFdnnoBz1tLBXo9fBp6DBgqcBvALSjhRBqCQuWCuSk1SvbvopkIoF37z8gJImxgkOYiMSN+CCbgXVvBta9GVj3CFxBTJI/OBwuXBwgJjEFNvAK8Ui4TOypOQ+rVuqzXLkGjZPXMD9L3wsX1UlLNHFL/qlB0yT2l/zobtO6AtNsD5rqAg3Rf7Hutjd3qfW1RPN6aKqL3OEE6oQW+SQFOTmyluN8dbyNrNueprWxw8Cvy6dXGKI1RUAqK4wh7zK8dr4VOr6B/gCEy9ciU6Kk2AAAAABJRU5ErkJggg==`
              );
            }
            currentPage.drawImage(pngImage, {
              x: placeHolder?.formField.coordinates.x + padding,
              y:
                placeHolder?.formField.coordinates.y -
                (placeHolder?.height || 25) +
                padding,
              width: (placeHolder?.width || 25) - padding * 1.5,
              height: (placeHolder?.height || 25) - padding * 1.5,
            });
          }
        }
      }

      if (values?.length) {
        fileDetails?.fields?.forEach(async placeHolder => {
          const currentPage = pages[placeHolder?.formField?.pageIndex];
          const value = values.find(item => item?.id === placeHolder?.itemId);

          const calculationError =
            typeof value?.text === 'object' && value?.type === 'formula';

          if (value) {
            const fontSize = placeHolder?.fontSize || 11;
            const scalingFactor = 0.75;

            if (calculationError) {
              console.error('Calculation Error', value);
              return currentPage.drawText('Error, Cannot Calculate', {
                color: rgb(0.86, 0.14, 0.14),
                x: placeHolder.formField.coordinates.x,
                y:
                  placeHolder.formField.coordinates.y -
                  fontSize * scalingFactor,
                font: customFont,
                size: fontSize,
              });
            }

            currentPage.drawText(value?.text || '', {
              x: placeHolder.formField.coordinates.x,
              y: placeHolder.formField.coordinates.y - fontSize * scalingFactor,
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

    const fileColumnAlreadyUsed = await FileDetails.find({
      board_id: updated?.board_id,
      file_column_id: file_column_id,
      itemViewInstanceId: { $ne: null },
      type: 'adhoc',
      _id: { $ne: Types.ObjectId(id) },
      is_deleted: false,
    });

    if (fileColumnAlreadyUsed.length) {
      throw {
        statusCode: 400,
        message: 'File column already used',
      };
    }

    const presignedColumnAlreadyUsed = await FileDetails.find({
      board_id: updated?.board_id,
      presigned_file_column_id: file_column_id,
      itemViewInstanceId: { $ne: null },
      type: 'adhoc',
      _id: { $ne: Types.ObjectId(id) },
      is_deleted: false,
    });

    if (presignedColumnAlreadyUsed.length) {
      throw {
        statusCode: 400,
        message: 'File column already used as pre-signed file column',
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
