const { body, param } = require('express-validator');

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
];

const validateIdParam = () => [param('id').trim().not().isEmpty().escape()];

const validateItemIdAndIdParam = () => [
  param('itemId').trim().not().isEmpty().toInt(),
  param('id').trim().not().isEmpty().escape(),
];

const validateItemIdAndFileId = () => [
  param('itemId').trim().not().isEmpty().toInt(),
  param('fileId').trim().not().isEmpty().escape(),
];

const validateTemplateDetails = () => [
  param('id').trim().not().isEmpty().escape(),
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
  param('id').trim().not().isEmpty().escape(),
  body('sender_name').trim().escape().not().isEmpty(),
  body('email_address')
    .trim()
    .escape()
    .normalizeEmail()
    .isEmail()
    .withMessage({ message: 'Invalid Email Provided' }),
  body('email_title').trim().not().isEmpty().escape(),
  body('message').trim().not().isEmpty().escape(),
  body('email_column_id').trim().not().isEmpty().escape(),
  body('status_column_id').trim().not().isEmpty().escape(),
  body('file_column_id').trim().not().isEmpty().escape(),
];

const validateSignatures = () => [
  param('id').trim().not().isEmpty().escape(),
  body('status').trim().isIn(['signed_by_sender', 'signed_by_receiver']),
  body('itemId').trim().not().isEmpty().toInt(),
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
  body('standardFields').isArray(),
  body('standardFields.*.id').trim().not().isEmpty().escape(),
  body('standardFields.*.itemId').trim().not().isEmpty().escape(),
  body('standardFields.*.title').trim().not().isEmpty().escape(),
  body('standardFields.*.placeholder.x').trim().not().isEmpty().toFloat(),
  body('standardFields.*.placeholder.y').trim().not().isEmpty().toFloat(),
  body('standardFields.*.formField.pageNumber').trim().not().isEmpty().toInt(),
  body('standardFields.*.formField.pageIndex').trim().not().isEmpty().toInt(),
  body('standardFields.*.formField.coordinates.x')
    .trim()
    .not()
    .isEmpty()
    .toFloat(),
  body('standardFields.*.formField.coordinates.y')
    .trim()
    .not()
    .isEmpty()
    .toFloat(),
  body('standardFields.*.isChecked').toBoolean(),
  body('standardFields.*.image.height').toFloat(),
  body('standardFields.*.image.width').toFloat(),
];

module.exports = {
  validateUploadFile,
  validateTemplateDetails,
  validateSenderDetails,
  validateSignatures,
  validateIdParam,
  validateItemIdAndIdParam,
  validateItemIdAndFileId,
};
