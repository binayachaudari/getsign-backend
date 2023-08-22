const FileDetails = require('../models/FileDetails');
const crypto = require('crypto');
const { emailVerification } = require('./mailer');
const { uploadPreSignedFile, clearFileColumn } = require('./monday.service');
const ApplicationModel = require('../models/Application.model');
const { backOfficeUploadedDocument } = require('./backoffice.service');

const addSenderDetails = async payload => {
  try {
    const previous = await FileDetails.find({
      account_id: payload.account_id,
      board_id: payload.board_id,
      user_id: payload.user_id,
      itemViewInstanceId: payload.instanceId,
      type: payload?.type,
    });

    const statusColumnAlreadyUsed = await FileDetails.find({
      board_id: payload?.board_id,
      status_column_id: payload?.status_column_id,
      itemViewInstanceId: { $ne: null },
      type: { $ne: 'adhoc' },
      is_deleted: false,
    });

    if (statusColumnAlreadyUsed.length) {
      throw {
        statusCode: 400,
        message: 'Status column already used',
      };
    }

    const fileColumnAlreadyUsed = await FileDetails.find({
      board_id: payload?.board_id,
      file_column_id: payload?.file_column_id,
      itemViewInstanceId: { $ne: null },
      type: { $ne: 'adhoc' },
      is_deleted: false,
    });

    if (fileColumnAlreadyUsed.length) {
      throw {
        statusCode: 400,
        message: 'File column already used',
      };
    }

    const presignedFileColumn = await FileDetails.find({
      board_id: payload?.board_id,
      presigned_file_column_id: payload?.presigned_file_column_id,
      itemViewInstanceId: { $ne: null },
      type: { $ne: 'adhoc' },
      is_deleted: false,
    });

    if (presignedFileColumn.length) {
      throw {
        statusCode: 400,
        message: 'Pre-signed File column already used',
      };
    }

    const currentItem = await FileDetails.findOne({
      account_id: payload.account_id,
      board_id: payload.board_id,
      item_id: payload.item_id,
      user_id: payload.user_id,
      itemViewInstanceId: payload.instanceId,
      type: payload?.type,
    }).sort({ updated_at: -1 });

    if (previous?.length) {
      if (previous?.[0]?.email_address !== payload.email_address) {
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

        for (const item of previous) {
          item.is_email_verified = false;
          item.email_verification_token = verificationToken;
          item.email_verification_token_expires = verificationTokenExpires;
        }

        await emailVerification(
          previous?.[0].email_verification_token,
          payload.email_address
        );
      }

      for (const item of previous) {
        item.is_email_verified = currentItem.is_email_verified;
        item.email_verification_token = currentItem.email_verification_token;
        item.email_verification_token_expires =
          currentItem.email_verification_token_expires;
        item.email_address = payload?.email_address;
        item.email_column_id = payload?.email_column_id;
        item.status_column_id = payload?.status_column_id;
        item.file_column_id = payload?.file_column_id;
        item.presigned_file_column_id = payload?.presigned_file_column_id;
        item.sender_name = payload?.sender_name;
        item.itemViewInstanceId = payload?.instanceId;
        await item.save();
      }
    } else {
      const result = await FileDetails.create({
        account_id: payload.account_id,
        board_id: payload.board_id,
        item_id: payload.item_id,
        user_id: payload.user_id,
        itemViewInstanceId: payload.instanceId,
        type: payload?.type,
      });

      result.email_address = payload?.email_address;
      result.email_column_id = payload?.email_column_id;
      result.status_column_id = payload?.status_column_id;
      result.file_column_id = payload?.file_column_id;
      result.presigned_file_column_id = payload?.presigned_file_column_id;
      result.sender_name = payload?.sender_name;

      const verificationToken = crypto.randomBytes(20).toString('hex');
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

      result.is_email_verified = false;
      result.email_verification_token = verificationToken;
      result.email_verification_token_expires = verificationTokenExpires;

      await emailVerification(
        result.email_verification_token,
        payload.email_address
      );

      await result.save();
    }

    // const statusColumnAlreadyUsed = await FileDetails.find({
    //   board_id: payload?.board_id,
    //   status_column_id: payload?.status_column_id,
    //   itemViewInstanceId: { $ne: payload.instanceId },
    //   is_deleted: false,
    // });

    // if (statusColumnAlreadyUsed.length) {
    //   throw {
    //     statusCode: 400,
    //     message: 'Status column already used',
    //   };
    // }

    return {
      ...payload,
    };
  } catch (error) {
    throw error;
  }
};

const uploadAdhocDocument = async req => {
  const body = req.body;
  const file = req.files.file;

  const fileDetails = await FileDetails.findOne({
    account_id: body.account_id,
    board_id: Number(body.board_id),
    type: 'adhoc',
  }).sort({ created_at: -1 });

  const uploadedFile = await uploadPreSignedFile({
    accountId: body.account_id,
    columnId: fileDetails?.presigned_file_column_id,
    file: file,
    userId: body?.user_id,
    itemId: body?.item_id,
  });

  const exists = await FileDetails.findOne({
    account_id: body.account_id,
    board_id: body.board_id,
    item_id: body.item_id,
    user_id: body.user_id,
    file_name: file.name,
    itemViewInstanceId: body.instanceId,
    is_deleted: false,
    type: 'adhoc',
  });

  if (!exists) {
    const result = await FileDetails.create({
      account_id: body.account_id,
      board_id: body.board_id,
      item_id: body.item_id,
      user_id: body.user_id,
      file_name: file.name,
      itemViewInstanceId: body.instanceId,
      type: 'adhoc',
    });

    result.email_address = fileDetails?.email_address;
    result.email_column_id = fileDetails?.email_column_id;
    result.status_column_id = fileDetails?.status_column_id;
    result.file_column_id = fileDetails?.file_column_id;
    result.sender_name = fileDetails?.sender_name;
    result.email_title = fileDetails?.email_title;
    result.message = fileDetails?.message;
    result.is_email_verified = fileDetails?.is_email_verified;
    result.presigned_file_column_id = fileDetails?.presigned_file_column_id;

    await result.save();
  }

  const appInstallDetails = await ApplicationModel.findOne({
    type: 'install',
    account_id: body.account_id,
  }).sort({ created_at: 'desc' });

  if (appInstallDetails?.back_office_item_id) {
    await backOfficeUploadedDocument(appInstallDetails.back_office_item_id);
  }

  // if (prev?._id) {
  //   // get itemId that are already signed by receiver or sender
  //   const signedItemIds = await FileHistory.distinct('itemId', {
  //     fileId: prev._id,
  //     status: { $in: ['signed_by_receiver', 'signed_by_sender'] },
  //   });

  //   if (!signedItemIds.length) {
  //     s3.deleteObject(
  //       {
  //         Bucket: process.env.BUCKET_NAME,
  //         Key: prev.file,
  //       },
  //       async (err, data) => {
  //         if (err) {
  //           throw err;
  //         }
  //       }
  //     );

  //     deleted = await FileDetailsModel.findByIdAndDelete(prev.id);
  //   }
  // }

  return uploadedFile.data;
};

const deleteFile = async fileId => {
  const details = await FileDetails.findById(fileId);
  if (!details) {
    throw {
      statusCode: 404,
      message: 'File not found',
    };
  }

  await clearFileColumn({
    itemId: details?.item_id,
    boardId: details?.board_id,
    accountId: details?.account_id,
    columnId: details.presigned_file_column_id,
    userId: details?.user_id,
  });

  details.fields = [];

  await details.save();

  return details;
};

module.exports = {
  addSenderDetails,
  uploadAdhocDocument,
  deleteFile,
};
