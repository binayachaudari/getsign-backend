const router = require('express').Router();

router.use('/authorize', require('./authorization.route'));
router.use('/files', require('./uploadFile.route'));

module.exports = router;
