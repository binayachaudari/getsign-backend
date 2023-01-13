const router = require('express').Router();

router.use('/', require('./authorization.route'));

module.exports = router;
