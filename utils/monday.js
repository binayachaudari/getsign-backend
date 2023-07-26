const mondaySdk = require('monday-sdk-js');
const UserModel = require('../models/User.model');
const monday = mondaySdk();

const me = async () => {
  try {
    return await monday.api(`{
  me {
    name
    email
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
  console.log(res);
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

  return user?.accessToken;
};

const getUserDetails = async (userId, accountId) => {
  const user = await UserModel.findOne({
    user_id: userId,
    account_id: accountId,
  }).exec();

  return user;
};

module.exports = { monday, setMondayToken, getUserDetails };
