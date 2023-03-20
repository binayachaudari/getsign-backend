const { verifyEmailServie } = require('../services/email.service');

const verifyEmail = async (req, res, next) => {
  const { token } = req.params.token;
  try {
    if (!token) {
      return next({ statusCode: 400, message: 'Invalid verification token.' });
    }
    const res = await verifyEmailServie(token);

    return res.json({ data: res }).status(200);
  } catch (error) {
    return next({ statusCode: error?.status, message: error?.message });
  }
};

module.exports = {
  verifyEmail,
};
