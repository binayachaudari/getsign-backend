const router = require('express').Router();
const controller = require('../../controller/integration.controller');
const {
  integrationValidateTrial,
} = require('../../middleware/integrationTrialValidation.middleware');

router.post('/auto-send', integrationValidateTrial, controller.autoSend);

router.post(
  '/generate-pdf/status-change/subscribe',
  controller.subscribeGenerateWithStatus
);
router.post(
  '/generate-pdf/status-change/unsubscribe',
  controller.unsubscribeGenerateWithStatus
);

router.post(
  '/templates-for-pdf',
  // integrationValidateTrial,
  controller.getTemplatesForPDF
);

router.post(
  '/generate-pdf-status',
  // integrationValidateTrial,
  controller.generatePDFWithButton
);

module.exports = router;
