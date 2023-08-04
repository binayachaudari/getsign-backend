const FileDetails = require('../models/FileDetails');
const crypto = require('crypto');
const { emailVerification } = require('./mailer');
const { uploadContract } = require('./monday.service');

const addSenderDetails = async payload => {
  try {
    const previous = await FileDetails.find({
      account_id: payload.account_id,
      board_id: payload.board_id,
      item_id: payload.item_id,
      user_id: payload.user_id,
      itemViewInstanceId: payload.instanceId,
      type: payload?.type,
    });

    if (previous?.length) {
      if (previous?.[0]?.email_address !== payload.email_address) {
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

        previous.forEach(item => {
          item.is_email_verified = false;
          item.email_verification_token = verificationToken;
          item.email_verification_token_expires = verificationTokenExpires;
        });

        await emailVerification(
          previous?.[0].email_verification_token,
          payload.email_address
        );
      }

      previous.forEach(item => {
        item.email_address = payload?.email_address;
        item.email_column_id = payload?.email_column_id;
        item.status_column_id = payload?.status_column_id;
        item.file_column_id = payload?.file_column_id;
        item.presigned_file_column_id = payload?.presigned_file_column_id;
        item.sender_name = payload?.sender_name;
        item.save();
      });
    } else {
      const result = await FileDetails.create({
        account_id: payload.account_id,
        board_id: payload.board_id,
        item_id: payload.item_id,
        user_id: payload.user_id,
        itemViewInstanceId: payload.instanceId,
        type: payload.type,
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

    const statusColumnAlreadyUsed = await FileDetails.find({
      board_id: payload?.board_id,
      status_column_id: payload?.status_column_id,
      itemViewInstanceId: { $ne: payload.instanceId },
      is_deleted: false,
    });

    if (statusColumnAlreadyUsed.length) {
      throw {
        statusCode: 400,
        message: 'Status column already used',
      };
    }

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

  const fileDetails = await FileDetails.find({
    account_id: body.account_id,
    board_id: body.board_id,
    item_id: body.item_id,
    user_id: body.user_id,
    itemViewInstanceId: body.instanceId,
    type: 'adhoc',
  });

  const uploadedFile = await uploadContract({
    accountId: body.account_id,
    columnId: fileDetails?.presigned_file_column_id,
    file: file.data,
    userId: body?.user_id,
    itemId: body?.item_id,
  });

  // get values from previous file that has been deleted
  const prev = await FileDetails.findOne({
    account_id: body.account_id,
    board_id: body.board_id,
    item_id: body.item_id,
    is_deleted: true,
  });

  // const result = await FileDetails.create({
  //   account_id: body.account_id,
  //   board_id: body.board_id,
  //   file: s3Res.Key,
  //   item_id: body.item_id,
  //   user_id: body.user_id,
  //   file_name: file.name,
  //   itemViewInstanceId: body.instanceId,
  // });

  // result.email_address = prev?.email_address;
  // result.email_column_id = prev?.email_column_id;
  // result.status_column_id = prev?.status_column_id;
  // result.file_column_id = prev?.file_column_id;
  // result.sender_name = prev?.sender_name;
  // result.email_title = prev?.email_title;
  // result.message = prev?.message;
  // result.is_email_verified = prev?.is_email_verified;

  // await result.save();

  // const appInstallDetails = await ApplicationModel.findOne({
  //   type: 'install',
  //   account_id: result.account_id,
  // }).sort({ created_at: 'desc' });

  // if (appInstallDetails?.back_office_item_id) {
  //   await backOfficeUploadedDocument(appInstallDetails.back_office_item_id);
  // }

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

  console.log(uploadedFile);
  console.log({ data: uploadedFile?.data });

  // return result;
};

module.exports = {
  addSenderDetails,
  uploadAdhocDocument,
};
