const mondaySdk = require('monday-sdk-js');
const ApplicationModel = require('../models/Application.model');
const UserModel = require('../models/User.model');
const monday = mondaySdk();

const setMondayToken = async (userId, accountId) => {
  const user = await UserModel.findOne({
    user_id: userId,
    account_id: accountId,
  }).exec();

  const applicationStatus = await ApplicationModel.findOne({
    account_id: accountId,
  })
    .sort({ created_at: 'desc' })
    .exec();

  if (applicationStatus.type === 'uninstall') {
    throw new Error({
      status: 401,
      message:
        'Application has been uninstalled, please re-install and re-authenticate',
    });
  }

  if (!user || !user?.accessToken) {
    throw new Error({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  monday.setToken(user.accessToken);
};

module.exports = { monday, setMondayToken };
