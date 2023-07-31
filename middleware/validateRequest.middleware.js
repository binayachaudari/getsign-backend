const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ status: 500, message: errors });
  }

  next();
};

module.exports = {
  validateRequest,
};
