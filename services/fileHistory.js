const FileHistory = require('../modals/FileHistory');
const { signPDF } = require('./file');

const addFileHistory = async ({ id, status, signatures }) => {
  try {
    const addedHistory = await FileHistory.find({
      fileId: id,
      status,
    });

    if (addedHistory?.length) return;

    const signedFile = await signPDF(id, signatures);
    return await FileHistory.create({
      fileId: id,
      status,
      file: signedFile.Key,
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

module.exports = {
  addFileHistory,
  getFileHistory,
};
