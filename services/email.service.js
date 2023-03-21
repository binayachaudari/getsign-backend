const FileDetails = require('../models/FileDetails');

const verifyEmailServie = async (token) => {
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

module.exports = {
  verifyEmailServie,
};
