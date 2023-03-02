const { PDFDocument } = require('pdf-lib');
const statusMapper = require('../config/statusMapper');
const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const { setMondayToken } = require('../utils/monday');
const { embedHistory } = require('./embedDocumentHistory');
const { signPDF, generatePDF } = require('./file');
const {
  updateStatusColumn,
  getColumnValues,
  getEmailColumnValue,
} = require('./monday.service');
const { s3, getSignedUrl } = require('./s3');

const addFileHistory = async ({
  id,
  status,
  itemId,
  signatures,
  ipAddress,
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

    if (signatures?.length) {
      const signedFile = await signPDF({
        id,
        signatureFields: signatures,
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
    const data = history?.filter((item) => item?.status !== 'resent');
    const resendStatus = history?.filter((item) => item?.status === 'resent');

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
      });

    return newHistory;
  } catch (error) {
    throw error;
  }
};

const getFileToSignSender = async (id, itemId) => {
  const fileDetails = await FileDetails.findById(id).populate('fileId');

  if (fileDetails.is_deleted) {
    return {
      fileId: fileDetails._id,
      isDeleted: true,
    };
  }

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
    await setMondayToken(fileDetails.board_id);
    const columnValues = await getColumnValues(itemId);
    const formValues = [
      ...(columnValues?.data?.items?.[0]?.column_values || []),
      {
        id: 'item-name',
        text: columnValues?.data?.items?.[0]?.name || '',
        title: 'Item Name',
        type: 'text',
      },
    ];

    const generatedPDF = await generatePDF(id, formValues);
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
    const template = fileFromHistory.fileId;
    fileId = fileFromHistory.fileId?._id;

    if (template?.is_deleted) {
      return {
        fileId,
        isDeleted: true,
      };
    }

    await setMondayToken(template.board_id);
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
        const formValues = [
          ...(columnValues?.data?.items?.[0]?.column_values || []),
          {
            id: 'item-name',
            text: columnValues?.data?.items?.[0]?.name || '',
            title: 'Item Name',
            type: 'text',
          },
        ];

        const generatedPDF = await generatePDF(template?.id, formValues);
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

const getFinalContract = async (id) => {
  try {
    const fileHistory = await FileHistory.findById(id);

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
      fileHistory.fileId,
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
      name: fileHistory?.file,
      file: `data:${blob.type};base64,${contractBase64}`,
    };
  } catch (error) {
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
};
