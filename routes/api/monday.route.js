const router = require('express').Router();
const controller = require('../../controller/monday.controller');
const { getMondayToken } = require('../../middleware/getMondayToken');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');

router.get(
  '/item-details/:fileId/:itemId',
  getMondayToken,
  controller.itemDetails
);

// router.get(
//   '/get-email-persons/:fileId/:itemId',
//   getMondayToken,
//   controller.getEmailAndPersons
// );

router.post(
  '/create-new-column/:boardId/:columnType/:columnName',
  verifySessionToken,
  controller.createNewColumn
);

module.exports = router;
