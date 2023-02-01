const FileHistory = require('../modals/FileHistory');
const { signPDF } = require('./file');

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
      const signedFile = await signPDF(id, signatures);
      return await FileHistory.create({
        fileId: id,
        status,
        file: signedFile.Key,
        receiverSignedIpAddress: receiverSignedIP,
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

module.exports = {
  addFileHistory,
  getFileHistory,
  viewedFile,
};
