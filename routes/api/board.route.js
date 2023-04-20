const router = require('express').Router();
const controller = require('../../controller/board.controller');
const {
  validateRequest,
} = require('../../middleware/validateRequest.middleware');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');
const {
  boardGetBoardFileValidator,
} = require('../../validators/board.validator');

router.get(
  '/:boardId/:itemId',
  verifySessionToken,
  boardGetBoardFileValidator(),
  validateRequest,
  controller.getBoardFile
);

router.get(
  '/:boardId',
  verifySessionToken,
  boardGetBoardFileValidator(),
  validateRequest,
  controller.getFiles
);

router.get('/installed', verifySessionToken, controller.installedItemView);

module.exports = router;
