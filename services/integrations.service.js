const ApplicationModel = require('../models/Application.model');
const FileDetails = require('../models/FileDetails');
const { getItemDetailsFromBackOffice } = require('./backoffice.service');
const { emailRequestToSign } = require('./mailer');

async function getFileToAutoSend(itemId, boardId, columnId, isVer6) {
  try {
    const file = await FileDetails.findOne({
      board_id: boardId,
      status_column_id: columnId,
      is_deleted: false,
    });

    if (file?.type === 'adhoc') {
      return;
    }

    const accountDetails = await ApplicationModel.findOne({
      account_id: Number(file?.account_id),
    });

    const version = getItemDetailsFromBackOffice({
      itemId: accountDetails?.back_office_item_id,
      columnIds: ['text2'],
    });

    console.log(version);

    const isVer6 = false;

    const result = await emailRequestToSign(itemId, file?._id, isVer6);
    return result;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getFileToAutoSend,
};
