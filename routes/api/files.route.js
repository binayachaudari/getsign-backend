const router = require('express').Router();
const controller = require('../../controller/uploadFile.controller');
const {
  validateRequest,
} = require('../../middleware/validateRequest.middleware');
const { validateTrial } = require('../../middleware/validateTrial');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');
const {
  validateUploadFile,
  validateTemplateDetails,
  validateSenderDetails,
  validateSignatures,
  validateIdParam,
  validateItemIdAndIdParam,
  validateItemIdAndFileId,
} = require('../../validators/files.validator');

router.post(
  '/upload-file',
  validateUploadFile(),
  validateRequest,
  verifySessionToken,
  controller.uploadFile
);
router.get(
  '/get-file/:id',
  validateIdParam(),
  validateRequest,
  verifySessionToken,
  controller.getFile
);
router.get(
  '/history/:itemId/:id',
  verifySessionToken,
  validateItemIdAndIdParam(),
  validateRequest,
  controller.getFileHistory
);
router.post(
  '/add-form-fields/:id',
  validateTemplateDetails(),
  validateRequest,
  controller.updateFields
);
router.delete(
  '/:id',
  verifySessionToken,
  validateIdParam(),
  validateRequest,
  controller.deleteFile
);
router.put(
  '/:id',
  verifySessionToken,
  validateSenderDetails(),
  validateRequest,
  controller.addSenderDetails
);
router.post(
  '/sign/:id',
  validateSignatures(),
  validateRequest,
  controller.addSignature
);

router.get(
  '/generate-preview/:itemId/:fileId',
  verifySessionToken,
  controller.generatePreview
);

router.post(
  '/generate-realtime-preview/:itemId/:fileId',
  controller.generateRealtimeFilePreview
);

router.get(
  '/send-mail/:itemId/:id',
  verifySessionToken,
  validateItemIdAndIdParam(),
  validateRequest,
  validateTrial,
  controller.sendPDF
);
router.get(
  '/viewed/:itemId/:id',
  validateItemIdAndIdParam(),
  validateRequest,
  controller.viewedPDF
);
router.get(
  '/file-for-sender/:itemId/:id',
  validateItemIdAndIdParam(),
  validateRequest,
  controller.getFileForSender
);
router.get(
  '/file-for-receiver/:itemId/:id',
  validateItemIdAndIdParam(),
  validateRequest,
  controller.getFileForReceiver
);

router.get(
  '/contract/:itemId/:fileId',
  verifySessionToken,
  validateItemIdAndFileId(),
  validateRequest,
  controller.getContract
);
router.get(
  '/download/:id',
  validateIdParam(),
  validateRequest,
  controller.getContractFile
);

module.exports = router;
