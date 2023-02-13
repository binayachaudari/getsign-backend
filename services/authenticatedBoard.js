const AuthenticatedBoardsModel = require('../models/AuthenticatedBoard.model');
const { monday } = require('../utils/monday');
const { me } = require('./monday.service');

const storeAuthTokens = async (boardId, token) => {
  return await AuthenticatedBoardsModel.create({
    boardId,
    accessToken: token,
  });
};

const updateToken = async (boardId, token) => {
  const result = await AuthenticatedBoardsModel.findOne({
    boardId,
  }).exec();
  result.accessToken = token;
  result.save();
};

const authenticateBoard = async (boardId, token) => {
  try {
    const exists = await AuthenticatedBoardsModel.findOne({ boardId }).exec();
    if (!exists) {
      await storeAuthTokens(boardId, token);
    }
    monday.setToken(exists.accessToken);
    const res = await me();

    if (
      res.hasOwnProperty('error_message') ||
      res.hasOwnProperty('error_code') ||
      res.hasOwnProperty('errors')
    ) {
      await updateToken(boardId, token);
    }
  } catch (error) {
    throw error;
  }
};

const isAlreadyAuthenticated = async (boardId) => {
  try {
    const res = await AuthenticatedBoardsModel.findOne({ boardId })
      .select('_id, boardId')
      .exec();
    return res;
  } catch (error) {
    throw error;
  }
};

module.exports = { authenticateBoard, isAlreadyAuthenticated };
