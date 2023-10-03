const { changeStatusWebhook } = require('../../controller/webhook.controller');

const router = require('express').Router();

router.post('/generate-pdf/status-change', changeStatusWebhook);

module.exports = router;
