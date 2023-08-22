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

router.post(
  '/upload-adhoc-document',
  verifySessionToken,
  adhocController.uploadAdhocDocument
);

router.get(
  '/send-adhoc-document/:itemId/:id',
  verifySessionToken,
  adhocController.requestSignature
);

router.delete(
  '/delete-file/:fileId',
  verifySessionToken,
  adhocController.deleteFile
);

module.exports = router;
