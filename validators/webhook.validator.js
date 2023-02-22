const { body } = require('express-validator');

const appSubscriptionValidation = () => [
  body('type').trim().not().isEmpty().escape(),
  body('data.app_id').trim().toInt(),
  body('data.user_id').trim().toInt(),
  body('data.account_id').trim().toInt(),
  body('data.user_email').trim().not().isEmpty().escape(),
  body('data.user_name').trim().not().isEmpty().escape(),
  body('data.user_cluster').trim().not().isEmpty().escape(),
  body('data.version_data').isObject(),
  body('data.timestamp').trim().not().isEmpty().escape(),
];

module.exports = {
  appSubscriptionValidation,
};
