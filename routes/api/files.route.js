const router = require('express').Router();
const controller = require('../../controller/uploadFile.controller');
const {
  validateRequest,
} = require('../../middleware/validateRequest.middleware');
const {
  validateUploadFile,
  validateTemplateDetails,
  validateSenderDetails,
  validateSignatures,
  validateIdParam,
  validateItemIdAndIdParam,
} = require('../../validators/files.validator');

router.post(
  '/upload-file',
  validateUploadFile(),
  validateRequest,
  controller.uploadFile
);
router.get(
  '/get-file/:id',
  validateIdParam(),
  validateRequest,
  controller.getFile
);
router.get(
  '/history/:itemId/:id',
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
  validateIdParam(),
  validateRequest,
  controller.deleteFile
);
router.put(
  '/:id',
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
  '/send-mail/:itemId/:id',
  validateItemIdAndIdParam(),
  validateRequest,
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
  validateItemIdAndIdParam(),
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
