const router = require('express').Router();
const controller = require('../../controller/authorization.controller');

router.post('/', controller.authorize);
router.get('/:boardId', controller.isAuthorized);

module.exports = router;
