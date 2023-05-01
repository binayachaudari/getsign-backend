const router = require('express').Router();
const controller = require('../../controller/integration.controller');

router.post('/auto-send', controller.autoSend);
router.post('/auto-send/subscribe', controller.autoSendSubscribe);
router.post('/auto-send/unsubscribe', controller.autoSendUnsubscribe);

module.exports = router;
