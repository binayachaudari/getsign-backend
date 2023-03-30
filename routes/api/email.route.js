const router = require('express').Router();
const controller = require('../../controller/email.controller');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');

router.get('/verify-email/:token', controller.verifyEmail);

router.get(
  '/resend-verification/:fileId',
  verifySessionToken,
  controller.resendVerification
);

module.exports = router;
