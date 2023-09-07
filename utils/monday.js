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

const handleFormatNumericColumn = item => {
  const columns = item?.board?.columns || [];
  const column_values = item?.column_values || [];
  if (column_values?.length > 0) {
    for (const [columnIndex, columnValue] of column_values.entries()) {
      if (columnValue?.type === 'numeric') {
        let textVal = columnValue?.text || 0;

        const boardColumn = columns.find(col => col.id === columnValue.id);

        const colSetting = JSON.parse(boardColumn?.settings_str || '{}');

        const absValue = Math.abs(textVal);

        textVal =
          colSetting?.unit?.direction === 'left'
            ? ` ${
                String(textVal < 0 ? '-' : '') +
                String(colSetting?.unit?.symbol || '') +
                String(absValue)
              }`
            : `${
                String(textVal < 0 ? '-' : '') +
                String(absValue) +
                String(colSetting?.unit?.symbol || '')
              }`;

        item.column_values[columnIndex] = {
          ...columnValue,
          formattedValue: textVal,
        };
      }
    }
  }
  const sub_items = item?.subitems || [];

  for (const [index, subitem] of sub_items.entries()) {
    item.subitems[index] = handleFormatNumericColumn(subitem);
  }

  return item;
};

module.exports = {
  monday,
  setMondayToken,
  getUserDetails,
  handleFormatNumericColumn,
};
