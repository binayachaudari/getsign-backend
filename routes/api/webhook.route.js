const router = require('express').Router();

router.post('/generate-pdf/status-change', async (req, res, next) => {
  console.log(JSON.stringify(req?.body, null, 2));
});

module.exports = router;
