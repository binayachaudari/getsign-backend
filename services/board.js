const FileDetails = require('../models/FileDetails');
const { isAlreadyAuthenticated } = require('./authenticatedBoard');

const getStoredBoardFile = async (boardId) => {
  try {
    const isAuthenticated = await isAlreadyAuthenticated(boardId);
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
