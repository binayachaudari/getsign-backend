const ApplicationModel = require('../models/Application.model');

const applicationWebhook = async (req, res, next) => {
  const payload = req.body;
  const app = await ApplicationModel.create({
    type: payload.type,
    ...payload?.data,
  });

  return res.status(201).json({ data: app });
};

module.exports = applicationWebhook;
