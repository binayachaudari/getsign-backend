const mondaySdk = require('monday-sdk-js');
const AuthenticatedBoardModel = require('../models/AuthenticatedBoard.model');
const monday = mondaySdk();

const setMondayToken = async (boardId) => {
  const mondayToken = await AuthenticatedBoardModel.findOne({
    boardId,
  }).exec();

  if (!mondayToken) {
    throw new Error('Unauthorized');
  }
  monday.setToken(mondayToken.accessToken);
};

module.exports = { monday, setMondayToken };
