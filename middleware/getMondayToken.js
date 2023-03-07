const AuthenticatedBoardModel = require('../models/AuthenticatedBoard.model');
const FileDetails = require('../models/FileDetails');
const { me } = require('../services/monday.service');
const { monday } = require('../utils/monday');

const getMondayToken = async (req, res, next) => {
  const { fileId } = req.params;
  try {
    const fileDetail = await FileDetails.findById(fileId);
    if (!fileDetail) {
      return next(new Error("File doesn't exist"));
    }
    const token = await AuthenticatedBoardModel.findOne({
      boardId: fileDetail.board_id,
    }).exec();

    if (!token) {
      return next(new Error('Board has not been authenticated'));
    }

    monday.setToken(token.accessToken);
    const res = await me();

    if (
      res.hasOwnProperty('error_message') ||
      res.hasOwnProperty('error_code') ||
      res.hasOwnProperty('errors')
    ) {
      return next({ message: 'Unauthorized', statusCode: 401 });
    }
    req.token = token.accessToken;
    req.boardId = fileDetail.board_id;

    monday.setToken(token.accessToken);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { getMondayToken };
