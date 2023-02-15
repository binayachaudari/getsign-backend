const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const { isAlreadyAuthenticated } = require('./authenticatedBoard');

const getStoredBoardFile = async (boardId, itemId) => {
  try {
    const isAuthenticated = await isAlreadyAuthenticated(boardId);
    const alreadySignedFile = await FileHistory.findOne({
      item_id: itemId,
      status: { $in: ['signed_by_receiver', 'signed_by_sender'] },
    }).exec();

    if (alreadySignedFile?.fileId) {
      const doc = await FileDetails.findById(alreadySignedFile.fileId);
      return { doc, isAuthenticated };
    }
    const doc = await FileDetails.findOne({
      board_id: boardId,
      is_deleted: false,
    }).exec();

    return { doc, isAuthenticated };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = { getStoredBoardFile };
