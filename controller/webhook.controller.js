const ApplicationModel = require('../models/Application.model');
const jwt = require('jsonwebtoken');
const { backOfficeAddItem } = require('../services/backoffice.service');

const applicationWebhook = async (req, res, next) => {
  let decoded;
  let backOfficeItemId;
  const auth = req?.headers?.authorization;
  if (auth) decoded = jwt.decode(auth, process.env.CLIENT_SECRET);

  const payload = req.body;

  if (payload.type === 'install') {
    backOfficeItemId = await backOfficeAddItem({
      customerName: payload?.data?.user_name,
      accountEmail: payload?.data?.user_email,
      accountId: payload?.data?.account_id,
      username: payload?.data?.user_name,
      slug: decoded?.dat?.slug,
      subscription: 'Trial',
      tier: undefined,
    });
  }

  const app = await ApplicationModel.create({
    type: payload.type,
    slug: decoded?.dat?.slug,
    back_office_item_id:
      Number(backOfficeItemId?.data?.create_item?.id) || null,
    ...payload?.data,
  });

  return res.status(201).json({ data: app });
};

module.exports = applicationWebhook;
