const { verifyEmailServie } = require('../services/email.service');

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

module.exports = {
  verifyEmail,
};
