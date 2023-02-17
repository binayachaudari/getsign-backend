const router = require('express').Router();
const controller = require('../../controller/authorization.controller');
const {
  validateRequest,
} = require('../../middleware/validateRequest.middleware');
const {
  authorizationValidation,
} = require('../../validators/authorize.validator');

router.post(
  '/',
  authorizationValidation(),
  validateRequest,
  controller.authorize
);
router.get('/:boardId', controller.isAuthorized);

module.exports = router;
