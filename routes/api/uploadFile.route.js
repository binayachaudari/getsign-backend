const router = require('express').Router();
const controller = require('../../controller/uploadFile.controller');

router.post('/upload-file', controller.uploadFile);
router.get('/get-file/:id', controller.getFile);
router.post('/add-form-fields/:id', controller.updateFields);

module.exports = router;
