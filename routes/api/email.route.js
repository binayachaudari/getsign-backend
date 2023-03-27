const router = require('express').Router();
const controller = require('../../controller/email.controller');

router.get('/verify-email/:token', controller.verifyEmail);

router.get('/resend-verification/:fileId', controller.resendVerification);

module.exports = router;
