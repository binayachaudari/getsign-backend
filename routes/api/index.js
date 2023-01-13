const router = require('express').Router();

router.use('/authorize', require('./authorization.route'));

module.exports = router;
