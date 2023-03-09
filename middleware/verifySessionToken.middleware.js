const jwt = require('jsonwebtoken');
const ApplicationModel = require('../models/Application.model');
const { isUserAuthenticated } = require('../services/user.service');

const verifySessionToken = async (req, res, next) => {
  let decoded;
  const token = req?.headers?.sessiontoken;

  if (token) decoded = jwt.decode(token, process.env.CLIENT_SECRET);

  const userId = decoded?.dat?.user_id;
  const accountId = decoded?.dat?.account_id;
  const user = await isUserAuthenticated(userId, accountId);

  const applicationStatus = await ApplicationModel.findOne({
    account_id: accountId,
  })
    .sort({ created_at: 'desc' })
    .exec();

  if (applicationStatus && applicationStatus?.type === 'uninstall') {
    return next({
      statusCode: 401,
      message:
        'Application has been uninstalled, please re-install and re-authenticate',
    });
  }

  if (!user || !user.accessToken) {
    return next({ statusCode: 401, message: 'Unauthorized' });
  }

  req.isAuthenticated = true;
  req.user = user;
  next();
};

module.exports = { verifySessionToken };
