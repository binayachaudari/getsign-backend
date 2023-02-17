const router = require('express').Router();
const controller = require('../../controller/uploadFile.controller');

router.post('/upload-file', controller.uploadFile);
router.get('/get-file/:id', controller.getFile);
router.get('/history/:itemId/:id', controller.getFileHistory);
router.post('/add-form-fields/:id', controller.updateFields);
router.delete('/:id', controller.deleteFile);
router.post('/generate', controller.generatePDF);
router.put('/:id', controller.addSenderDetails);
router.post('/sign/:id', controller.addSignature);

router.get('/send-mail/:itemId/:id', controller.sendPDF);
router.get('/viewed/:itemId/:id', controller.viewedPDF);
router.get('/file-for-sender/:itemId/:id', controller.getFileForSender);
router.get('/file-for-receiver/:itemId/:id', controller.getFileForReceiver);

router.get('/contract/:itemId/:fileId', controller.getContract);
router.get('/download/:id', controller.getContractFile);

module.exports = router;
