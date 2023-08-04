const FileDetails = require('../models/FileDetails');
const crypto = require('crypto');
const { emailVerification } = require('./mailer');

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

module.exports = {
  addSenderDetails,
};
