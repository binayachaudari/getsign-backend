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

router.post(
  '/templates/:boardId',
  verifySessionToken,
  generateController.getTemplates
);

router.delete(
  '/delete-file/:fileId',
  verifySessionToken
  // adhocController.deleteFile
);

module.exports = router;
