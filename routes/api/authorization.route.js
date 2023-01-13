const router = require('express').Router();
const controller = require('../../controller/authorization.controller');

router.post('/authorize', controller.authorize);

module.exports = router;
