const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const ApplicationModel = require('../models/Application.model');
const { backOfficeItemViewInstalled } = require('./backoffice.service');

const updateBackOfficeInstalledItemView = async accountId => {
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

const getAvailableFilesForBoard = async boardId => {
  try {
    return FileDetails.find({
      board_id: boardId,
      is_deleted: false,
    }).select('_id file_name');
  } catch (err) {
    throw err;
  }
};

const updateInstanceId = async (fileId, instanceId) => {
  try {
    return await FileDetails.findByIdAndUpdate(fileId, {
      $set: {
        itemViewInstanceId: instanceId,
        status_column_id: null,
      },
    });
  } catch (err) {
    throw err;
  }
};

const getStoredBoardFile = async (boardId, itemId, instanceId) => {
  try {
    let doc;
    const fileItem = await FileDetails.findOne({
      board_id: boardId,
      item_id: itemId,
      itemViewInstanceId: instanceId,
      is_deleted: false,
    });

    if (fileItem && fileItem?.type === 'adhoc') {
      doc = fileItem;
    } else {
      const docDetails = await FileDetails.findOne({
        board_id: boardId,
        itemViewInstanceId: instanceId,
        is_deleted: false,
        type: 'adhoc',
      })
        .select('-email_verification_token -email_verification_token_expires')
        .exec();

      if (docDetails) {
        doc = await FileDetails.create({
          board_id: boardId,
          item_id: itemId,
          itemViewInstanceId: instanceId,
        });
        doc.account_id = docDetails.account_id;
        doc.type = docDetails.type;
        doc.is_email_verified = docDetails.is_email_verified;
        doc.email_column_id = docDetails.email_column_id;
        doc.user_id = docDetails.user_id;
        doc.email_address = docDetails.email_address;
        doc.email_column_id = docDetails.email_column_id;
        doc.status_column_id = docDetails.status_column_id;
        doc.file_column_id = docDetails.file_column_id;
        doc.presigned_file_column_id = docDetails.presigned_file_column_id;
        doc.sender_name = docDetails.sender_name;

        await doc.save();
      }
    }

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

module.exports = {
  getStoredBoardFile,
  getAvailableFilesForBoard,
  updateInstanceId,
  updateBackOfficeInstalledItemView,
};
