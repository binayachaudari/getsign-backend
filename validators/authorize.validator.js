const { body, param } = require('express-validator');

const authorizationValidation = () => [
  body('client_id').trim().not().isEmpty(),
  body('client_secret').trim().not().isEmpty(),
  body('boardId').trim().not().isEmpty(),
  body('code').trim().not().isEmpty(),
];

const authorizationBoardId = () => [
  param('boardId').trim().not().isEmpty().toInt(),
];

module.exports = {
  authorizationValidation,
  authorizationBoardId,
};
