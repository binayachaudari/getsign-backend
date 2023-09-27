const router = require('express').Router();

router.use('/authorize', require('./authorization.route'));
router.use('/files', require('./files.route'));
router.use('/board', require('./board.route'));
router.use('/monday', require('./monday.route'));
router.use('/email', require('./email.route'));
router.use('/integrations', require('./integration.route'));
router.use('/adhoc', require('./adhoc.route'));
router.use('/generate', require('./generate.route'));
router.use('/user', require('./user.route'));
router.use('/signer', require('./signer.route'));

module.exports = router;
