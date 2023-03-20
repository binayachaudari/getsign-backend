const router = require('express').Router();
const controller = require('../../controller/email.controller');

router.get('/verify-email/:token', controller.verifyEmail);

module.exports = router;
