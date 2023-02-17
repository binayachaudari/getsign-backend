const router = require('express').Router();

router.use('/authorize', require('./authorization.route'));
router.use('/files', require('./files.route'));
router.use('/board', require('./board.route'));
router.use('/monday', require('./monday.route'));

module.exports = router;
