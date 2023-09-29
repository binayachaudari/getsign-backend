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

router.get('/get-signers/:fileId/:item_id', controller.getSignersOrDuplicate);

router.post(
  '/get-signer-by-file-id/:fil2eId',
  verifySessionToken,
  controller.getSignerByFileId
);
router.put('/update-signer/:signerId', controller.updateSigner);
router.get('/send-mail/:itemId/:id', verifySessionToken, controller.sendMail);
router.post(
  '/sign/:id',
  validateSignatures(),
  validateRequest,
  controller.signPDF
);

module.exports = router;
