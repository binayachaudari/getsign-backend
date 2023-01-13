const router = require('express').Router();
const controller = require('../../controller/authorization.controller');

router.post('/', controller.authorize);

module.exports = router;
