const mondaySdk = require('monday-sdk-js');
const AuthenticatedBoardModel = require('../models/AuthenticatedBoard.model');
const monday = mondaySdk();

const setMondayToken = async (boardId) => {
  const mondayToken = await AuthenticatedBoardModel.findOne({
    boardId,
  }).exec();

  if (!mondayToken) {
    await AuthenticatedBoardModel.deleteMany({ boardId });
    throw new Error({
      statusCode: 403,
      message:
        'You might have uninstalled the application, please reauthorize monday token',
    });
  }
  monday.setToken(mondayToken.accessToken);
};

module.exports = { monday, setMondayToken };
