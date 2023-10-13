const router = require('express').Router();
const controller = require('../../controller/signer.controller');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');
const {
  validateRequest,
} = require('../../middleware/validateRequest.middleware');
const { validateSignatures } = require('../../validators/files.validator');

router.post('/add-signer', controller.createSigner);
// router.get('/get-signers/:signerId', controller.getSigners);

router.post('/get-signers/:fileId/:item_id', controller.getSignersOrDuplicate);

router.post(
  '/get-signer-by-file-id/:fil2eId',
  verifySessionToken,
  controller.getSignerByFileId
);
router.put('/update-signer/:signerId', controller.updateSigner);
router.get('/send-mail/:itemId/:id', verifySessionToken, controller.sendMail);
router.get(
  '/resend-mail/:itemId/:id',
  verifySessionToken,
  controller.resendMail
);

router.post(
  '/sign/:id',
  validateSignatures(),
  validateRequest,
  controller.signPDF
);

router.post('/view-document/:id', controller.viewDocument);

router.post(
  '/request-sign-by-me/:originalFileId/:itemId',
  controller.handleRequestSignByMe
);

module.exports = router;
