const router = require('express').Router();
const controller = require('../../controller/authorization.controller');
const {
  validateRequest,
} = require('../../middleware/validateRequest.middleware');
const {
  authorizationBoardId,
} = require('../../validators/authorize.validator');

router.get('/callback', controller.authorize);

router.get(
  '/:boardId',
  authorizationBoardId(),
  validateRequest,
  controller.isAuthorized
);

module.exports = router;
