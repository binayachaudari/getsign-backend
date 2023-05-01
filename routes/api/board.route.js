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

router.get('/installed', verifySessionToken, controller.installedItemView);

router.put(
  '/update-instance/:fileId',
  verifySessionToken,
  controller.setInstanceId
);

router.get(
  '/:boardId/:itemId',
  verifySessionToken,
  boardGetBoardFileValidator(),
  validateRequest,
  controller.getBoardFile
);

router.get('/:boardId', verifySessionToken, controller.getFiles);

module.exports = router;
