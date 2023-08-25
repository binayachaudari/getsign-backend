const router = require('express').Router();
const UserController = require('../../controller/user.controller');
const {
  verifySessionToken,
} = require('../../middleware/verifySessionToken.middleware');

router.get(
  '/is-editor-onboarded',
  verifySessionToken,
  UserController.isEditorOnboarded
);

router.post(
  '/editor-onboarded',
  verifySessionToken,
  UserController.saveEditorOnboarder
);

module.exports = router;
