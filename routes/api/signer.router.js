const router = require('express').Router();
const controller = require('../../controller/signer.controller');

router.post('/create-signer', controller.createSigner);
router.get('/get-signers/:signerId', controller.getSigners);
router.get('/get-signer-by-file-id/:fileId', controller.getSignerByFileId);
router.put('/update-signer/:signerId', controller.updateSigner);
