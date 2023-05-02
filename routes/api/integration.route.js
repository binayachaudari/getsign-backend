const router = require('express').Router();
const controller = require('../../controller/integration.controller');

router.post('/auto-send', controller.autoSend);

module.exports = router;
