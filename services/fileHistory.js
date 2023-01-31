const FileHistory = require('../modals/FileHistory');

const addFileHistory = async (id, payload) => {
  try {
    const addedHistory = await FileHistory.find({
      fileId: id,
      status: payload?.status,
    });

    if (addedHistory) return;

    await FileHistory.create({
      fileId: id,
      status: payload.status,
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
