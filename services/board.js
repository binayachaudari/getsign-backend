const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const ApplicationModel = require('../models/Application.model');
const { backOfficeItemViewInstalled } = require('./backoffice.service');

const updateBackOfficeInstalledItemView = async (accountId) => {
  try {
    const applicationDetails = await ApplicationModel.findOne({
      account_id: accountId,
    });
    if (applicationDetails?.back_office_item_id)
      await backOfficeItemViewInstalled(
        applicationDetails?.back_office_item_id
      );
  } catch (err) {
    throw err;
  }
};

const getStoredBoardFile = async (boardId, itemId, instanceId) => {
  try {
    const doc = await FileDetails.findOne({
      board_id: boardId,
      itemViewInstanceId: instanceId,
      is_deleted: false,
    })
      .select('-email_verification_token -email_verification_token_expires')
      .exec();

    const alreadySignedFile = await FileHistory.findOne({
      itemId,
      fileId: doc?._id,
      status: { $in: ['signed_by_receiver', 'signed_by_sender'] },
    }).exec();

    if (alreadySignedFile?.fileId) {
      const doc = await FileDetails.findById(alreadySignedFile.fileId).select(
        '-email_verification_token -email_verification_token_expires'
      );
      const hasStartedSigningProcess = await FileHistory.findOne({
        fileId: doc?._id,
      });
      return {
        doc,
        alreadySignedFile: !!alreadySignedFile?._id,
        hasStartedSigningProcess: !!hasStartedSigningProcess?._id,
      };
    }

    const hasStartedSigningProcess = await FileHistory.findOne({
      fileId: doc?._id,
    });

    return {
      doc,
      alreadySignedFile: !!alreadySignedFile?._id,
      hasStartedSigningProcess: !!hasStartedSigningProcess?.id,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = { getStoredBoardFile, updateBackOfficeInstalledItemView };
