const router = require('express').Router();
const controller = require('../../controller/integration.controller');
const { validateTrial } = require('../../middleware/validateTrial');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');

router.post(
  '/auto-send',
  verifySessionToken,
  validateTrial,
  controller.autoSend
);

module.exports = router;
