const {
  verifyEmailServie,
  resendVerificationEmail,
} = require('../services/email.service');

const verifyEmail = async (req, res, next) => {
  const { token } = req.params;
  try {
    if (!token) {
      return next({ statusCode: 400, message: 'Invalid verification token.' });
    }
    const result = await verifyEmailServie(token);

    return res.json({ data: result }).status(200);
  } catch (error) {
    return next({ statusCode: error?.status, message: error?.message });
  }
};

const resendVerification = async (req, res, next) => {
  const { fileId } = req.params;
  try {
    await resendVerificationEmail(fileId);
    return res.json({ data: 'Sent verification email' }).status(200);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  verifyEmail,
  resendVerification,
};
