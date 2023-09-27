const { PDFDocument } = require('pdf-lib');
const statusMapper = require('../config/statusMapper');
const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const {
  setMondayToken,
  getUserDetails,
  monday,
  handleFormatNumericColumn,
} = require('../utils/monday');
const { embedHistory } = require('./embedDocumentHistory');
const {
  signPDF,
  generatePDF,
  generatePDFWithGivenPlaceholders,
} = require('./file');
const {
  updateStatusColumn,
  getColumnValues,
  getEmailColumnValue,
  getColumnDetails,
  getSpecificColumnValue,
  getUsersByIds,
} = require('./monday.service');
const { s3, getSignedUrl } = require('./s3');
const {
  getFormulaColumns,
  parseFormulaColumnIds,
  renameFunctions,
  hasNestedIF,
  convertToNestedIFS,
  getFormulaValueOfItem,
} = require('../utils/formula');
const HyperFormula = require('../utils/hyperFormula');
const { toFixed } = require('../utils/number');
const { formulaeParser } = require('../utils/mondayFormulaConverter');
const SignerModel = require('../models/Signer.model');

const multipleSignerAddFileHistory = async ({
  id,
  status,
  itemId,
  interactedFields,
  ipAddress,
  s3fileKey,
  fileHistory,
}) => {
  try {
    if (interactedFields?.length) {
      const signedFile = await signPDF({
        id,
        interactedFields,
        status,
        itemId,
        s3fileKey,
      });

      return await FileHistory.findByIdAndUpdate(
        fileHistory._id,
        {
          file: signedFile.Key,
          ...(status === 'signed_by_receiver' && {
            receiverSignedIpAddress: ipAddress,
          }),
        },
        {
          new: true,
        }
      );
    }

    if (status === 'viewed')
      return await FileHistory.findByIdAndUpdate(
        fileHistory._id,
        {
          status: 'viewed',
        },
        { new: true }
      );
  } catch (err) {
    throw err;
  }
};

const addFileHistory = async ({
  id,
  status,
  itemId,
  interactedFields,
  ipAddress,
  boardId,
}) => {
  try {
    const addedHistory = await FileHistory.findOne({
      fileId: id,
      itemId,
      status,
    }).exec();

    if (addedHistory) {
      if (addedHistory?.status === 'viewed') return;
      return addedHistory;
    }

    if (interactedFields?.length) {
      const signedFile = await signPDF({
        id,
        interactedFields,
        status,
        itemId,
      });

      return await FileHistory.create({
        fileId: id,
        status,
        itemId,
        file: signedFile.Key,
        ...(status === 'signed_by_receiver' && {
          receiverSignedIpAddress: ipAddress,
        }),
      });
    }

    if (status === 'viewed')
      return await FileHistory.create({
        fileId: id,
        status,
        itemId,
        viewedIpAddress: ipAddress,
      });
  } catch (error) {
    throw error;
  }
};

const getFileHistory = async (itemId, id) => {
  try {
    const history = await FileHistory.find({ fileId: id, itemId })
      .sort({
        createdAt: 'desc',
      })
      .exec();
    const data = history?.filter(item => item?.status !== 'resent');
    const resendStatus = history?.filter(item => item?.status === 'resent');

    return { data, resendStatus };
  } catch (error) {
    throw error;
  }
};

const isAlreadyViewed = async ({ fileId, itemId }) => {
  return await FileHistory.findOne({
    fileId,
    itemId,
    status: 'viewed',
  }).exec();
};

const viewedFile = async (id, itemId, ip) => {
  try {
    const fromFileHistory = await FileHistory.findById(id);
    if (!fromFileHistory) throw new Error('No file with such id');

    const template = await FileDetails.findById(fromFileHistory.fileId);

    const newHistory = await addFileHistory({
      id: fromFileHistory.fileId,
      itemId,
      status: 'viewed',
      ipAddress: ip,
    });

    if (newHistory?.status)
      await updateStatusColumn({
        itemId: itemId,
        boardId: template.board_id,
        columnId: template?.status_column_id,
        columnValue: statusMapper[newHistory?.status],
        userId: template?.user_id,
        accountId: template?.account_id,
      });

    return newHistory;
  } catch (error) {
    throw error;
  }
};

const getFileToSignSender = async (id, itemId) => {
  const fileDetails = await FileDetails.findById(id);

  const isAlreadySignedBySender = await FileHistory.findOne({
    fileId: id,
    itemId,
    status: 'signed_by_sender',
  }).exec();

  if (isAlreadySignedBySender) {
    return {
      fileId,
      isAlreadySigned: true,
    };
  }

  const alreadySignedByReceiver = await FileHistory.findOne({
    fileId: id,
    itemId,
    status: 'signed_by_receiver',
  }).exec();

  if (!alreadySignedByReceiver) {
    await setMondayToken(fileDetails.user_id, fileDetails.account_id);
    const columnValues = await getColumnValues(itemId);

    let item = columnValues?.data?.items?.[0];
    item = handleFormatNumericColumn(item);

    if (item) {
      columnValues.data.items[0] = item;
    }
    const items_subItem = columnValues?.data?.items?.[0]?.subitems || [];

    const formValues = [
      ...(columnValues?.data?.items?.[0]?.column_values || []),
      {
        id: 'item-name',
        text: columnValues?.data?.items?.[0]?.name || '',
        title: 'Item Name',
        type: 'text',
      },
    ];

    // Formula column
    const boardFormulaColumnValues = new Map();

    const formulaColumns = getFormulaColumns(
      columnValues?.data?.items?.[0]?.column_values || []
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
        for (const item of columnValues?.data?.items?.[0]?.column_values) {
          if (
            parsedColumn.formulaColumns?.length &&
            parsedColumn.formulaColumns.includes(item.id)
          ) {
            let columnValue;
            if (item.type === 'formula') {
              if (typeof columnValue !== 'object') {
                columnValue = boardFormulaColumnValues.get(item.id);
                columnValue = columnValue?.replace(/'/g, '"');
                columnValue = renameFunctions(columnValue);
                const parsedFormula = formulaeParser(columnValue);
                columnValue = parsedFormula.formula;
              }
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
          const alreadyExistsIdx = formValues.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            formValues[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${finalFormulaValue}`
              : finalFormulaValue;
          } else {
            formValues.push({
              ...column,
              text: parsedFormula.symbol
                ? `${parsedFormula?.symbol}${finalFormulaValue}`
                : finalFormulaValue,
            });
          }
        } else {
          boardFormulaColumnValues.set(column.id, '0');
          const alreadyExistsIdx = formValues.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            formValues[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${0}`
              : '0';
          } else {
            formValues.push({
              ...column,
              text: parsedFormula.symbol ? `${parsedFormula?.symbol}${0}` : '0',
            });
          }
        }
      }
    }

    const generatedPDF = await generatePDF(id, formValues, items_subItem);
    return {
      fileId: id,
      ...generatedPDF,
    };
  }

  const url = s3.getSignedUrl('getObject', {
    Bucket: process.env.BUCKET_NAME,
    Key: alreadySignedByReceiver?.file,
  });

  const body = await fetch(url);
  const contentType = body.headers.get('content-type');
  const arrBuffer = await body.arrayBuffer();
  const buffer = Buffer.from(arrBuffer);
  var base64String = buffer.toString('base64');

  return {
    fileId: id,
    file: `data:${contentType};base64,${base64String}`,
    alreadySignedByOther: !!alreadySignedByReceiver,
    alreadyViewed: !!(await isAlreadyViewed({ fileId: id, itemId })),
  };
};

const getFileToSignReceiver = async (id, itemId) => {
  try {
    let fileId;
    const fileFromHistory = await FileHistory.findById(id).populate('fileId');
    if (!fileFromHistory) {
      return {
        isDeleted: true,
      };
    }
    const template = fileFromHistory.fileId;

    fileId = fileFromHistory.fileId?._id;

    await setMondayToken(template?.user_id, template?.account_id);
    const emailColumn = await getEmailColumnValue(
      itemId,
      template.email_column_id
    );
    const to = emailColumn?.data?.items?.[0]?.column_values?.[0]?.text;

    const isAlreadySigned = await FileHistory.findOne({
      fileId,
      itemId,
      status: 'signed_by_receiver',
    }).exec();

    if (isAlreadySigned) {
      return {
        fileId,
        isAlreadySigned: true,
        sendDocumentTo: to,
      };
    }

    const getFileToSignKey = await FileHistory.findOne({
      fileId,
      itemId,
      status: 'signed_by_sender',
    }).exec();

    try {
      let url;
      if (!getFileToSignKey?.file) {
        const columnValues = await getColumnValues(itemId);

        let item = columnValues?.data?.items?.[0];

        item = handleFormatNumericColumn(item);

        if (item) {
          columnValues.data.items[0] = item;
        }

        const items_subItem = columnValues?.data?.items?.[0]?.subitems || [];

        const formValues = [
          ...(columnValues?.data?.items?.[0]?.column_values || []),
          {
            id: 'item-name',
            text: columnValues?.data?.items?.[0]?.name || '',
            title: 'Item Name',
            type: 'text',
          },
        ];

        // Formula column
        const boardFormulaColumnValues = new Map();

        const formulaColumns = getFormulaColumns(
          columnValues?.data?.items?.[0]?.column_values || []
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

            boardFormulaColumnValues.set(
              columnValue.id,
              parsedRecursiveFormula
            );
          }

          let finalFormula;
          for (const column of columnDetails) {
            const formulaColumnValues = new Map();
            const parsedColumn = parseFormulaColumnIds(column?.settings_str);
            finalFormula = parsedColumn.formula;
            for (const item of columnValues?.data?.items?.[0]?.column_values) {
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
              const alreadyExistsIdx = formValues.findIndex(
                formValue => formValue.id === column?.id
              );

              if (alreadyExistsIdx > -1) {
                formValues[alreadyExistsIdx].text = parsedFormula.symbol
                  ? `${parsedFormula?.symbol}${finalFormulaValue}`
                  : finalFormulaValue;
              } else {
                formValues.push({
                  ...column,
                  text: parsedFormula.symbol
                    ? `${parsedFormula?.symbol}${finalFormulaValue}`
                    : finalFormulaValue,
                });
              }
            } else {
              boardFormulaColumnValues.set(column.id, '0');
              const alreadyExistsIdx = formValues.findIndex(
                formValue => formValue.id === column?.id
              );

              if (alreadyExistsIdx > -1) {
                formValues[alreadyExistsIdx].text = parsedFormula.symbol
                  ? `${parsedFormula?.symbol}${0}`
                  : '0';
              } else {
                formValues.push({
                  ...column,
                  text: parsedFormula.symbol
                    ? `${parsedFormula?.symbol}${0}`
                    : '0',
                });
              }
            }
          }
        }

        const generatedPDF = await generatePDF(template?.id, formValues, [
          ...items_subItem,
        ]);
        return {
          fileId: template.id,
          ...generatedPDF,
          alreadySignedByOther: !!getFileToSignKey,
          alreadyViewed: !!(await isAlreadyViewed({ fileId, itemId })),
          sendDocumentTo: to,
        };
      }

      url = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: getFileToSignKey?.file,
      });
      fileId = getFileToSignKey.fileId;

      const body = await fetch(url);
      const contentType = body.headers.get('content-type');
      const arrBuffer = await body.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);
      var base64String = buffer.toString('base64');

      return {
        fileId,
        file: `data:${contentType};base64,${base64String}`,
        alreadySignedByOther: !!getFileToSignKey,
        alreadyViewed: !!(await isAlreadyViewed({ fileId, itemId })),
        sendDocumentTo: to,
      };
    } catch (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

const getFileForSigner = async (id, itemId) => {
  try {
    let fileId;
    const fileFromHistory = await FileHistory.findById(id).populate('fileId');

    if (!fileFromHistory) {
      return {
        isDeleted: true,
      };
    }
    const template = fileFromHistory.fileId;
    fileId = fileFromHistory.fileId?._id;

    const signersDoc = await SignerModel.findOne({
      originalFileId: fileId,
      itemId,
    });

    await setMondayToken(template?.user_id, template?.account_id);

    const currentSigner = signersDoc?.signers?.find(
      signer => signer.fileStatus === id
    );

    let currentSignerEmail;
    let assignedFields = [];

    // set the email of current signer
    if (currentSigner?.userId) {
      const userResp = await getUsersByIds(currentSigner.userId);
      currentSignerEmail = userResp?.data?.users?.[0]?.email;
      assignedFields = template?.fields?.filter(
        field => field.signer.userId === currentSigner.userId
      );
    }

    if (!currentSigner?.userId && currentSigner?.emailColumnId) {
      const emailResp = await await getEmailColumnValue(
        itemId,
        currentSigner.emailColumnId
      );
      currentSignerEmail = emailResp.data?.items?.[0]?.column_values?.filter(
        emlCol => emlCol.id === currentSigner.emailColumnId
      )?.[0]?.text;

      assignedFields = template?.fields?.filter(
        field => field.signer.value === currentSigner.emailColumnId
      );
    }

    if (!currentSignerEmail) {
      // Need to refactore when we cannot find email column id
      return { isDeleted: true };
    }

    const isAlreadySigned = await FileHistory.findOne({
      fileId,
      itemId,
      status: 'signed_by_receiver',
      sentToEmail: currentSignerEmail,
    }).exec();

    if (isAlreadySigned) {
      return {
        fileId,
        isAlreadySigned: true,
        sendDocumentTo: currentSignerEmail,
      };
    }

    let getFileToSignKey = signersDoc.file;

    try {
      let url;
      if (!getFileToSignKey) {
        const columnValues = await getColumnValues(itemId);

        let item = columnValues?.data?.items?.[0];

        item = handleFormatNumericColumn(item);

        const items_subItem = columnValues?.data?.items?.[0]?.subitems || [];

        const formValues = [
          ...(columnValues?.data?.items?.[0]?.column_values || []),
          {
            id: 'item-name',
            text: columnValues?.data?.items?.[0]?.name || '',
            title: 'Item Name',
            type: 'text',
          },
        ];

        const formulaColumnWithValues = await getFormulaValueOfItem({
          boardColumns: item.board.columns,
          boardColumnValues: item.column_values,
          itemId: item.id,
        });

        for (const formulaCol of formulaColumnWithValues) {
          const alreadyExistsIdx = formValues.findIndex(
            formValue => formValue.id === formulaCol?.id
          );

          if (alreadyExistsIdx > -1) {
            formValues[alreadyExistsIdx].text = formulaCol.text;
          } else {
            formValues.push({
              ...formulaCol,
            });
          }
        }
        const generatedPDF = await generatePDF(template?._id, formValues, [
          ...items_subItem,
        ]);

        return {
          fileId: template.id,
          ...generatedPDF,
          assignedFields,
          alreadySignedByOther: !!getFileToSignKey,
          alreadyViewed: !!(await isAlreadyViewed({ fileId, itemId })),
          sendDocumentTo: currentSignerEmail,
        };
      }

      url = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: getFileToSignKey,
      });

      fileId = signersDoc.originalFileId;
      const body = await fetch(url);
      const contentType = body.headers.get('content-type');
      const arrBuffer = await body.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);
      var base64String = buffer.toString('base64');

      return {
        fileId,
        file: `data:${contentType};base64,${base64String}`,
        assignedFields,
        alreadySignedByOther: !!getFileToSignKey,
        alreadyViewed: !!(await isAlreadyViewed({ fileId, itemId })),
        sendDocumentTo: currentSignerEmail,
      };
    } catch (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

const downloadContract = async (itemId, fileId) => {
  const signed = await FileHistory.findOne({
    fileId: fileId,
    itemId,
    status: { $in: ['signed_by_sender', 'signed_by_receiver'] },
  })
    .sort({ created_at: 'desc' })
    .exec();

  return await getFinalContract(signed?._id);
};

const getFinalContract = async (id, withPdfBytes) => {
  try {
    const fileHistory = await FileHistory.findById(id).populate('fileId');

    const url = await getSignedUrl(fileHistory.file);

    const body = await fetch(url);
    const contentType = body.headers.get('content-type');
    const arrBuffer = await body.arrayBuffer();
    const buffer = Buffer.from(arrBuffer);
    var base64String = buffer.toString('base64');

    let pdfDoc = await PDFDocument.load(
      `data:${contentType};base64,${base64String}`
    );

    const withDocumentHistory = await embedHistory(
      pdfDoc,
      fileHistory.fileId?._id,
      fileHistory.itemId
    );

    const pdfBytes = await withDocumentHistory.save();

    const blob = new Blob([new Uint8Array(pdfBytes)], {
      type: 'application/pdf',
    });

    const wihtDocHistoryArrayBuf = await blob.arrayBuffer();
    const withDocBuff = Buffer.from(wihtDocHistoryArrayBuf);

    const contractBase64 = withDocBuff.toString('base64');

    return {
      name: fileHistory?.fileId?.file_name,
      size: blob?.size,
      file: `data:${blob.type};base64,${contractBase64}`,
      ...(withPdfBytes && {
        bytes: pdfBytes,
        type: blob.type,
      }),
    };
  } catch (error) {
    throw error;
  }
};

const generateFilePreview = async (fileId, itemId, accountId) => {
  let user;
  try {
    const fileDetails = await FileDetails.findOne({
      _id: fileId,
      account_id: accountId,
    });

    if (!fileDetails) {
      return {
        fields: [],
        file: null,
        fileId: null,
        name: null,
      };
    }
    await setMondayToken(fileDetails.user_id, fileDetails.account_id);
    user = await getUserDetails(fileDetails.user_id, fileDetails.account_id);

    const columnValues = await getColumnValues(itemId);

    let item = columnValues?.data?.items?.[0];
    item = handleFormatNumericColumn(item);

    if (item) {
      columnValues.data.items[0] = item;
    }

    const items_subItem = columnValues?.data?.items?.[0]?.subitems || [];

    const formValues = [
      ...(columnValues?.data?.items?.[0]?.column_values || []),
      {
        id: 'item-name',
        text: columnValues?.data?.items?.[0]?.name || '',
        title: 'Item Name',
        type: 'text',
      },
    ];

    // Formula column
    const boardFormulaColumnValues = new Map();

    const formulaColumns = getFormulaColumns(
      columnValues?.data?.items?.[0]?.column_values || []
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
        for (const item of columnValues?.data?.items?.[0]?.column_values) {
          if (
            parsedColumn.formulaColumns?.length &&
            parsedColumn.formulaColumns.includes(item.id)
          ) {
            let columnValue;
            if (item.type === 'formula') {
              if (typeof columnValue !== 'object') {
                columnValue = boardFormulaColumnValues.get(item.id);
                columnValue = columnValue?.replace(/'/g, '"');
                columnValue = renameFunctions(columnValue);
                const parsedFormula = formulaeParser(columnValue);
                columnValue = parsedFormula.formula;
              }
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
          const alreadyExistsIdx = formValues.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            formValues[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${finalFormulaValue}`
              : finalFormulaValue;
          } else {
            formValues.push({
              ...column,
              text: parsedFormula.symbol
                ? `${parsedFormula?.symbol}${finalFormulaValue}`
                : finalFormulaValue,
            });
          }
        } else {
          boardFormulaColumnValues.set(column.id, '0');
          const alreadyExistsIdx = formValues.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            formValues[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${0}`
              : '0';
          } else {
            formValues.push({
              ...column,
              text: parsedFormula.symbol ? `${parsedFormula?.symbol}${0}` : '0',
            });
          }
        }
      }
    }

    const generatedPDF = await generatePDF(
      fileId,
      formValues,
      [...items_subItem],
      itemId
    );
    return {
      fileId,
      ...generatedPDF,
      fields:
        fileDetails?.fields?.filter(field =>
          [
            'checkbox',
            'sign-date',
            'receiver-initials',
            'sender-initials',
            'receiver-signature',
            'sender-signature',
            'text-box',
            'dropdown',
          ].includes(field?.itemId)
        ) || [],
    };
  } catch (error) {
    if (user) {
      if (typeof error === 'object') {
        throw {
          ...error,
          userId: user?._id,
        };
      }
    }
    throw error;
  }
};

const generateFilePreviewWithPlaceholders = async (
  fileId,
  itemId,
  placeholders
) => {
  let user;
  try {
    const fileDetails = await FileDetails.findById(fileId);

    await setMondayToken(fileDetails.user_id, fileDetails.account_id);
    user = await getUserDetails(fileDetails.user_id, fileDetails.account_id);
    const columnValues = await getColumnValues(itemId);

    let item = columnValues?.data?.items?.[0];
    item = handleFormatNumericColumn(item);

    if (item) {
      columnValues.data.items[0] = item;
    }

    const items_subItem = columnValues?.data?.items?.[0]?.subitems || [];

    const formValues = [
      ...(columnValues?.data?.items?.[0]?.column_values || []),
      {
        id: 'item-name',
        text: columnValues?.data?.items?.[0]?.name || '',
        title: 'Item Name',
        type: 'text',
      },
    ];

    // Formula column
    const boardFormulaColumnValues = new Map();

    const formulaColumns = getFormulaColumns(
      columnValues?.data?.items?.[0]?.column_values || []
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
        for (const item of columnValues?.data?.items?.[0]?.column_values) {
          if (
            parsedColumn.formulaColumns?.length &&
            parsedColumn.formulaColumns.includes(item.id)
          ) {
            let columnValue;
            if (item.type === 'formula') {
              columnValue = boardFormulaColumnValues.get(item.id);
              if (typeof columnValue !== 'object') {
                columnValue = columnValue?.replace(/'/g, '"');
                columnValue = renameFunctions(columnValue);
                const parsedFormula = formulaeParser(columnValue);
                columnValue = parsedFormula.formula;
              }
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
          const alreadyExistsIdx = formValues.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            formValues[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${finalFormulaValue}`
              : finalFormulaValue;
          } else {
            formValues.push({
              ...column,
              text: parsedFormula.symbol
                ? `${parsedFormula?.symbol}${finalFormulaValue}`
                : finalFormulaValue,
            });
          }
        } else {
          boardFormulaColumnValues.set(column.id, '0');
          const alreadyExistsIdx = formValues.findIndex(
            formValue => formValue.id === column?.id
          );

          if (alreadyExistsIdx > -1) {
            formValues[alreadyExistsIdx].text = parsedFormula.symbol
              ? `${parsedFormula?.symbol}${0}`
              : '0';
          } else {
            formValues.push({
              ...column,
              text: parsedFormula.symbol ? `${parsedFormula?.symbol}${0}` : '0',
            });
          }
        }
      }
    }

    const generatedPDF = await generatePDFWithGivenPlaceholders(
      fileId,
      placeholders,
      formValues,
      [...items_subItem],
      itemId
    );
    return {
      fileId,
      ...generatedPDF,
    };
  } catch (error) {
    if (user) {
      if (typeof error === 'object' && error?.statusCode === 401) {
        throw {
          ...error,
          userId: user?._id,
        };
      }
    }
    throw error;
  }
};

module.exports = {
  addFileHistory,
  getFileHistory,
  viewedFile,
  getFileToSignSender,
  getFileToSignReceiver,
  getFinalContract,
  downloadContract,
  generateFilePreview,
  generateFilePreviewWithPlaceholders,
  multipleSignerAddFileHistory,
  getFileForSigner,
};
