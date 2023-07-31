const router = require('express').Router();
const adhocController = require('../../controller/adhoc.controller');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');

router.post(
  '/sender-details',
  verifySessionToken,
  adhocController.addSenderDetails
);

module.exports = router;
