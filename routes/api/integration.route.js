const router = require('express').Router();
const controller = require('../../controller/integration.controller');
const {
  integrationValidateTrial,
} = require('../../middleware/integrationTrialValidation.middleware');

router.post('/auto-send', integrationValidateTrial, controller.autoSend);

module.exports = router;
