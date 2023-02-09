const FileDetails = require('../models/FileDetails');

const getStoredBoardFile = async (boardId) => {
  try {
    const result = await FileDetails.findOne({ board_id: boardId }).exec();
    return result;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = { getStoredBoardFile };
