const router = require('express').Router();
const controller = require('../../controller/signer.controller');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');

router.post('/add-signer', controller.createSigner);
router.get('/get-signers/:signerId', controller.getSigners);
router.get('/get-signer-by-file-id/:fil2eId', controller.getSignerByFileId);
router.put('/update-signer/:signerId', controller.updateSigner);
router.get('/send-mail/:itemId/:id', verifySessionToken, controller.sendMail);

module.exports = router;
