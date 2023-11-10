const { param, body } = require('express-validator');

const boardGetBoardFileValidator = () => [
  param('boardId').trim().not().isEmpty().toInt(),
  param('itemId').trim().not().isEmpty().toInt(),
];

const addColumnToBoardValidator = () => [
  param('board').trim().not().isEmpty().toInt(),
  body('title').trim().not().isEmpty().escape(),
  body('description').trim().optional().escape(),
  body('column_type').trim().not().isEmpty().escape(),
];

module.exports = {
  boardGetBoardFileValidator,
  addColumnToBoardValidator,
};
