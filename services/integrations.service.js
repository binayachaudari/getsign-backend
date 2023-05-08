const FileDetails = require('../models/FileDetails');
const { emailRequestToSign } = require('./mailer');

async function getFileToAutoSend(itemId, boardId, columnId) {
  try {
    const file = await FileDetails.findOne({
      board_id: boardId,
      status_column_id: columnId,
      is_deleted: false,
    });
    const result = await emailRequestToSign(itemId, file?._id);
    return result;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getFileToAutoSend,
};
