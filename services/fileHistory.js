const FileDetails = require('../modals/FileDetails');
const FileHistory = require('../modals/FileHistory');
const { signPDF } = require('./file');
const { s3 } = require('./s3');

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

    if (addedHistory) return;

    if (signatures?.length) {
      const signedFile = await signPDF({
        id,
        fields: signatures,
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
      ipAddress: ip,
    });
  } catch (error) {
    throw error;
  }
};

const getFileToSign = async (id) => {
  try {
    let fileFromHistory;
    let usingTemplateId = false;
    fileFromHistory = await FileHistory.findById(id);
    if (!fileFromHistory) {
      usingTemplateId = true;
    }

    const getFileToSignKey = await FileHistory.findOne({
      fileId: usingTemplateId ? id : fileFromHistory.fileId,
      status: 'signed_by_sender',
    }).exec();

    try {
      let url;
      if (!getFileToSignKey?.file) {
        const template = FileDetails.findById(id);
        url = s3.getSignedUrl('getObject', {
          Bucket: process.env.BUCKET_NAME,
          Key: template?.file,
        });
      } else {
        url = s3.getSignedUrl('getObject', {
          Bucket: process.env.BUCKET_NAME,
          Key: getFileToSignKey?.file,
        });
      }

      const body = await fetch(url);
      const contentType = body.headers.get('content-type');
      const arrBuffer = await body.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);
      var base64String = buffer.toString('base64');

      return {
        ...getFileToSignKey.toJSON(),
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
