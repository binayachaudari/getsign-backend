const FileDetails = require('../models/FileDetails');
const crypto = require('crypto');
const { emailVerification } = require('./mailer');

const verifyEmailServie = async token => {
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

  return {
    message: 'Email verified successfully.',
  };
};

const resendVerificationEmail = async fileId => {
  try {
    const fileDetails = await FileDetails.findById(fileId);
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

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
