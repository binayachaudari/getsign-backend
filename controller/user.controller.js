const UserModel = require('../models/User.model');

module.exports = {
  isEditorOnboarded: async (req, res, next) => {
    const { user } = req;

    console.log({ user });
    return res
      .status(200)
      .json({ editorOnboarded: user?.editorOnboarded || false });
  },
  saveEditorOnboarder: async (req, res, next) => {
    const { user } = req;

    user.editorOnboarded = true;

    await user.save();
    return res
      .status(200)
      .json({ editorOnboarded: user?.editorOnboarded || false });
  },
};
