const router = require('express').Router();
const controller = require('../../controller/signer.controller');

router.post('/add-signer', controller.createSigner);
router.get('/get-signers/:signerId', controller.getSigners);
router.get('/get-signer-by-file-id/:fil2eId', controller.getSignerByFileId);
router.put('/update-signer/:signerId', controller.updateSigner);

module.exports = router;
