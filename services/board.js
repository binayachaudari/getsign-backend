const FileDetails = require('../models/FileDetails');
const { isAlreadyAuthenticated } = require('./authenticatedBoard');

const getStoredBoardFile = async (boardId) => {
  try {
    const isAuthenticated = await isAlreadyAuthenticated(boardId);
    const result = await FileDetails.findOne({
      board_id: boardId,
      is_deleted: false,
    }).exec();
    return { ...result, isAuthenticated };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = { getStoredBoardFile };
