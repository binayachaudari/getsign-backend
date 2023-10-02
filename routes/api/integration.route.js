const router = require('express').Router();
const controller = require('../../controller/integration.controller');
const {
  integrationValidateTrial,
} = require('../../middleware/integrationTrialValidation.middleware');

router.post('/auto-send', integrationValidateTrial, controller.autoSend);

router.post(
  '/templates-for-pdf',
  // integrationValidateTrial,
  controller.getTemplatesForPDF
);

router.post(
  '/generate-pdf-button',
  // integrationValidateTrial,
  controller.generatePDFWithButton
);

module.exports = router;
