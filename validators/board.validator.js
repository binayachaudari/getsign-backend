const { param } = require('express-validator');

const boardGetBoardFileValidator = () => [
  param('boardId').trim().not().isEmpty().toInt(),
];

module.exports = {
  boardGetBoardFileValidator,
};
