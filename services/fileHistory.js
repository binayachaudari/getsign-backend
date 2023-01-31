const FileHistory = require('../modals/FileHistory');

const addFileHistory = async (id, status) => {
  try {
    const addedHistory = await FileHistory.find({
      fileId: id,
      status,
    });

    if (addedHistory?.length) return;

    return await FileHistory.create({
      fileId: id,
      status,
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
