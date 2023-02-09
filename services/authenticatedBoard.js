const AuthenticatedBoardsModel = require('../models/AuthenticatedBoards.model');
const { monday } = require('../utils/monday');
const { me } = require('./monday.service');

const storeAuthTokens = async (boardId, token) => {
  return await AuthenticatedBoardsModel.create({
    boardId,
    accessToken: token,
  });
};

const authenticateBoard = async (boardId, token) => {
  try {
    const exists = await AuthenticatedBoardsModel.findOne({ boardId });
    if (!exists) {
      await storeAuthTokens(boardId, token);
    }
    monday.setToken(exists.accessToken);
    const res = await me();
    console.log(res);
    return res;
  } catch (error) {
    throw error;
  }
};

module.exports = { authenticateBoard };
