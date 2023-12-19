const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const ApplicationModel = require('../models/Application.model');
const { backOfficeItemViewInstalled } = require('./backoffice.service');
const he = require('he');

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
      type: {
        $nin: ['adhoc', 'generate'],
      },
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
    let type;

    const template = await FileDetails.findOne({
      board_id: boardId,
      item_id: itemId,
      itemViewInstanceId: instanceId,
      is_deleted: false,
      $or: [
        {
          type: 'adhoc',
        },
        { type: 'generate' },
      ],
    });

    if (template) {
      type = template.type;
    } else {
      const template = await FileDetails.findOne({
        board_id: boardId,
        itemViewInstanceId: instanceId,
        is_deleted: false,
      });

      type = template?.type || 'template';
    }

    if (type === 'adhoc') {
      doc = await FileDetails.findOne({
        board_id: boardId,
        item_id: itemId,
        itemViewInstanceId: instanceId,
        is_deleted: false,
        type: 'adhoc',
      });

      if (!doc) {
        const prevFile = await FileDetails.findOne({
          board_id: boardId,
          itemViewInstanceId: instanceId,
          is_deleted: false,
          type: 'adhoc',
        });

        doc = await FileDetails.create({
          board_id: boardId,
          item_id: itemId,
          itemViewInstanceId: instanceId,
          account_id: prevFile.account_id,
          type: 'adhoc',
          user_id: prevFile.user_id,
        });

        doc.account_id = prevFile.account_id;
        doc.type = prevFile.type;
        doc.is_email_verified = prevFile.is_email_verified;
        doc.email_column_id = prevFile.email_column_id;
        doc.email_address = prevFile.email_address;
        doc.email_column_id = prevFile.email_column_id;
        doc.status_column_id = prevFile.status_column_id;
        doc.file_column_id = prevFile.file_column_id;
        doc.presigned_file_column_id = prevFile.presigned_file_column_id;
        doc.sender_name = prevFile.sender_name;
        await doc.save();
      }
    } else {
      doc = await FileDetails.findOne({
        board_id: boardId,
        itemViewInstanceId: instanceId,
        is_deleted: false,
      })
        .select('-email_verification_token -email_verification_token_expires')
        .exec();
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
      status: {
        $nin: ['sent', 'viewed'],
      },
    });

    // unescape html entities
    doc.email_title = he.decode(doc?.email_title || '');
    doc.file_name = he.decode(doc?.file_name || '');
    doc.message = he.decode(doc?.message || '');
    doc.sender_name = he.decode(doc?.sender_name || '');

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
