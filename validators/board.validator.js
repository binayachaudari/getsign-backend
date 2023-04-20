const { param } = require('express-validator');

const boardGetBoardFileValidator = () => [
  param('boardId').trim().not().isEmpty().toInt(),
  param('itemId').trim().not().isEmpty().toInt(),
];

module.exports = {
  boardGetBoardFileValidator,
};
