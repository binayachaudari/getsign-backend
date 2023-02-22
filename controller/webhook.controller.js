const ApplicationModel = require('../models/Application.model');
const jwt = require('jsonwebtoken');

const applicationWebhook = async (req, res, next) => {
  let decoded;
  const auth = req?.headers?.authorization;
  if (auth) decoded = jwt.decode(auth, process.env.CLIENT_SECRET);

  const payload = req.body;
  const app = await ApplicationModel.create({
    type: payload.type,
    slug: decoded?.dat?.slug,
    ...payload?.data,
  });

  return res.status(201).json({ data: app });
};

module.exports = applicationWebhook;
