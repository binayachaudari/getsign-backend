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

/** this is because there was typos on webhook url in the workflow block in version <= 6.7.0 */
router.post(
  '/generate-pdf/status-change/ussubscribe',
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
  controller.generatePDFWithStatus
);

module.exports = router;
