const FileHistory = require('../modals/FileHistory');
const { signPDF } = require('./file');
const { s3 } = require('./s3');

const addFileHistory = async ({
  id,
  status,
  signatures,
  viewedIP,
  receiverSignedIP,
}) => {
  try {
    const addedHistory = await FileHistory.find({
      fileId: id,
      status,
    });

    if (addedHistory?.length) return;

    if (signatures?.length) {
      const signedFile = await signPDF({ id, fields: signatures, status });
      return await FileHistory.create({
        fileId: id,
        status,
        file: signedFile.Key,
        ...(status === 'signed_by_receiver' && {
          receiverSignedIpAddress: receiverSignedIP,
        }),
      });
    }

    return await FileHistory.create({
      fileId: id,
      status,
      viewedIpAddress: viewedIP,
    });
  } catch (error) {
    throw error;
  }
};

const getFileHistory = async (id) => {
  try {
    const history = await FileHistory.find({ fileId: id }).sort({
      createdAt: 'desc',
    });
    return history;
  } catch (error) {
    throw error;
  }
};

const viewedFile = async (id, ip) => {
  try {
    const fromFileHistory = await FileHistory.findById(id);
    if (!fromFileHistory) throw new Error('No file with such id');

    const parsedFromFileHistory = fromFileHistory.toJSON();

    return await addFileHistory({
      id: parsedFromFileHistory.fileId,
      status: 'viewed',
      ip,
    });
  } catch (error) {
    throw error;
  }
};

const getFileToSign = async (id) => {
  try {
    const fromFileHistory = await FileHistory.findById(id);
    if (!fromFileHistory) throw new Error('No file with such id');

    const parsedFromFileHistory = fromFileHistory.toJSON();
    const getFileToSignKey = await FileHistory.findOne({
      fileId: parsedFromFileHistory.fileId,
      status: 'signed_by_sender',
    });

    const parsedGetFileToSignKey = getFileToSignKey.toJSON();

    try {
      const url = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: parsedGetFileToSignKey.file,
      });
      const body = await fetch(url);
      const contentType = body.headers.get('content-type');
      const arrBuffer = await body.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);
      var base64String = buffer.toString('base64');

      return {
        ...parsedGetFileToSignKey,
        file: `data:${contentType};base64,${base64String}`,
      };
    } catch (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

module.exports = {
  addFileHistory,
  getFileHistory,
  viewedFile,
  getFileToSign,
};
