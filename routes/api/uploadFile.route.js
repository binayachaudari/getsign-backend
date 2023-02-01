const router = require('express').Router();
const controller = require('../../controller/uploadFile.controller');

router.post('/upload-file', controller.uploadFile);
router.get('/get-file/:id', controller.getFile);
router.get('/history/:id', controller.getFileHistory);
router.post('/add-form-fields/:id', controller.updateFields);
router.delete('/:id', controller.deleteFile);
router.post('/generate', controller.generatePDF);
router.put('/:id', controller.addSenderDetails);
router.post('/sign/:id', controller.addSignature);

router.get('/send-mail/:id', controller.sendPDF);
router.get('/viewed/:id', controller.viewedPDF);

module.exports = router;
