const FileDetails = require('../models/FileDetails');
const crypto = require('crypto');
const { emailVerification } = require('./mailer');

const verifyEmailServie = async token => {
  const adhocExists = await FileDetails.findOne({
    email_verification_token: token,
    email_verification_token_expires: { $gt: Date.now() },
    type: 'adhoc',
  });

  if (adhocExists) {
    const previous = await FileDetails.find({
      email_verification_token: token,
      email_verification_token_expires: { $gt: Date.now() },
      type: 'adhoc',
    });
    for (const item of previous) {
      item.is_email_verified = true;
      item.email_verification_token = null;
      item.email_verification_token_expires = null;
      await item.save();
    }
  } else {
    const fileDetails = await FileDetails.findOne({
      email_verification_token: token,
      email_verification_token_expires: { $gt: Date.now() },
    });

    if (!fileDetails) {
      throw {
        status: 400,
        message: 'Invalid or expired verification token.',
      };
    }

    fileDetails.is_email_verified = true;
    fileDetails.email_verification_token = null;
    fileDetails.email_verification_token_expires = null;

    await fileDetails.save();
  }

  return {
    message: 'Email verified successfully.',
  };
};

const resendVerificationEmail = async fileId => {
  try {
    const fileDetails = await FileDetails.findById(fileId);

    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    if (fileDetails?.type === 'adhoc') {
      const previous = await FileDetails.find({
        account_id: fileDetails.account_id,
        board_id: fileDetails.board_id,
        user_id: fileDetails.user_id,
        itemViewInstanceId: fileDetails.itemViewInstanceId,
        type: 'adhoc',
        is_email_verified: false,
      });

      for (const item of previous) {
        item.is_email_verified = false;
        item.email_verification_token = verificationToken;
        item.email_verification_token_expires = verificationTokenExpires;
        await item.save();
      }
    }

    fileDetails.is_email_verified = false;
    fileDetails.email_verification_token = verificationToken;
    fileDetails.email_verification_token_expires = verificationTokenExpires;

    await emailVerification(verificationToken, fileDetails.email_address);

    await fileDetails.save();
  } catch (err) {
    throw err;
  }
};

module.exports = {
  verifyEmailServie,
  resendVerificationEmail,
};
