const router = require('express').Router();
const controller = require('../../controller/board.controller');
const {
  validateRequest,
} = require('../../middleware/validateRequest.middleware');
const {
  boardGetBoardFileValidator,
} = require('../../validators/board.validator');

router.get(
  '/:boardId/:itemId',
  boardGetBoardFileValidator(),
  validateRequest,
  controller.getBoardFile
);

module.exports = router;