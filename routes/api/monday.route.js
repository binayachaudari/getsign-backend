const router = require('express').Router();
const controller = require('../../controller/monday.controller');
const { getMondayToken } = require('../../middleware/getMondayToken');

router.get('/item-details/:fileId', getMondayToken, controller.itemDetails);

module.exports = router;
