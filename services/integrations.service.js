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

    if (!file) {
      throw new Error('No file found');
    }

    if (file?.type === 'adhoc') {
      return;
    }

    const accountDetails = await ApplicationModel.findOne({
      account_id: Number(file?.account_id),
    });

    const versionData = await getItemDetailsFromBackOffice({
      itemId: accountDetails?.back_office_item_id,
      columnIds: ['text2'],
    });

    const version = versionData?.data?.items[0]?.column_values?.[0]?.value;
    const majorVer = version.replaceAll('"', '').split('.')?.[0][1];

    const isVer6 = majorVer >= 6;

    const result = await emailRequestToSign(itemId, file?._id, isVer6);
    return result;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getFileToAutoSend,
};
