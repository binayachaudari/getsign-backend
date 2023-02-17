const { body } = require('express-validator');

const validateUploadFile = () => [
  body('file').custom((value, { req }) => {
    if (req.files?.file?.mimetype === 'application/pdf') {
      return '.pdf';
    }
    return false;
  }),
  body('account_id').trim().not().isEmpty().toInt(),
  body('board_id').trim().not().isEmpty().toInt(),
  body('item_id').trim().not().isEmpty().toInt(),
  body('user_id').trim().not().isEmpty().toInt(),
  body('file_name').trim().not().isEmpty().escape(),
];

const validateTemplateDetails = () => [
  body('fields').isArray(),
  body('fields.*.id').trim().not().isEmpty().escape(),
  body('fields.*.itemId').trim().not().isEmpty().escape(),
  body('fields.*.title').trim().not().isEmpty().escape(),
  body('fields.*.placeholder.x').trim().not().isEmpty().toFloat(),
  body('fields.*.placeholder.y').trim().not().isEmpty().toFloat(),
  body('fields.*.formField.pageNumber').trim().not().isEmpty().toInt(),
  body('fields.*.formField.pageIndex').trim().not().isEmpty().toInt(),
  body('fields.*.formField.coordinates.x').trim().not().isEmpty().toFloat(),
  body('fields.*.formField.coordinates.y').trim().not().isEmpty().toFloat(),
];

const validateSenderDetails = () => [
  body('sender_name').trim().not().isEmpty().escape(),
  body('email_address').trim().isEmail().escape(),
  body('email_title').trim().not().isEmpty().escape(),
  body('message').trim().not().isEmpty().escape(),
  body('email_column_id').trim().not().isEmpty().escape(),
  body('status_column_id').trim().not().isEmpty().escape(),
];
const validateSignatures = () => [
  body('status').trim().isIn(['signed_by_sender', 'signed_by_receiver']),
  body('item_id').trim().not().isEmpty().toInt(),
  body('signatures').isArray(),
  body('signatures.*.id').trim().not().isEmpty().escape(),
  body('signatures.*.itemId').trim().not().isEmpty().escape(),
  body('signatures.*.title').trim().not().isEmpty().escape(),
  body('signatures.*.placeholder.x').trim().not().isEmpty().toFloat(),
  body('signatures.*.placeholder.y').trim().not().isEmpty().toFloat(),
  body('signatures.*.formField.pageNumber').trim().not().isEmpty().toInt(),
  body('signatures.*.formField.pageIndex').trim().not().isEmpty().toInt(),
  body('signatures.*.formField.coordinates.x').trim().not().isEmpty().toFloat(),
  body('signatures.*.formField.coordinates.y').trim().not().isEmpty().toFloat(),
  body('signatures.*.image.src').trim().not().isEmpty(),
  body('signatures.*.image.height').trim().not().isEmpty().toFloat(),
  body('signatures.*.image.width').trim().not().isEmpty().toFloat(),
];

module.exports = {
  validateUploadFile,
  validateTemplateDetails,
  validateSenderDetails,
  validateSignatures,
};
