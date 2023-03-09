const jwt = require('jsonwebtoken');
const { isUserAuthenticated } = require('../services/user.service');
const { setMondayToken } = require('../utils/monday');

const verifySessionToken = async (req, res, next) => {
  let decoded;
  const token = req?.headers?.sessiontoken;

  if (token) decoded = jwt.decode(token, process.env.CLIENT_SECRET);

  const userId = decoded?.dat?.user_id;
  const accountId = decoded?.dat?.account_id;
  const user = await isUserAuthenticated(userId, accountId);

  try {
    await setMondayToken(userId, accountId);
  } catch (err) {
    return next(err);
  }

  if (!user || !user?.accessToken) {
    return next({ statusCode: 401, message: 'Unauthorized' });
  }

  req.isAuthenticated = true;
  req.user = user;
  next();
};

module.exports = { verifySessionToken };
