const router = require('express').Router();
const generateController = require('../../controller/generate.controller');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');

router.post(
  '/upload-document',
  verifySessionToken,
  generateController.uploadDocument
);

router.get(
  '/templates/:boardId',
  verifySessionToken,
  generateController.getTemplates
);

router.delete(
  '/templates/:fileId',
  verifySessionToken,
  generateController.removeTemplate
);

module.exports = router;
