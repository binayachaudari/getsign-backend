const router = require('express').Router();
const controller = require('../../controller/authorization.controller');
const {
  authorizationValidation,
} = require('../../validators/authorize.validator');

router.post('/', authorizationValidation(), controller.authorize);
router.get('/:boardId', controller.isAuthorized);

module.exports = router;
