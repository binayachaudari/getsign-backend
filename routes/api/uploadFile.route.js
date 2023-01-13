const router = require('express').Router();
const controller = require('../../controller/uploadFile.controller');

router.post('/upload-file', controller.uploadFile);
router.post('/get-file', controller.getFile);

module.exports = router;
