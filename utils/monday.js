const mondaySdk = require('monday-sdk-js');
const UserModel = require('../models/User.model');
const monday = mondaySdk();

const me = async () => {
  try {
    return await monday.api(`{
  me {
    id
  }
}
`);
  } catch (error) {
    throw error;
  }
};

const setMondayToken = async (userId, accountId) => {
  const user = await UserModel.findOne({
    user_id: userId,
    account_id: accountId,
  }).exec();

  if (!user || !user?.accessToken) {
    throw {
      statusCode: 401,
      message: 'Unauthorized',
    };
  }

  monday.setToken(user.accessToken);
  const res = await me();
  const mondayAPIError =
    res.hasOwnProperty('error_message') ||
    res.hasOwnProperty('error_code') ||
    res.hasOwnProperty('errors');

  if (mondayAPIError) {
    throw {
      statusCode: 401,
      message: 'Unauthorized',
    };
  }
};

module.exports = { monday, setMondayToken };
