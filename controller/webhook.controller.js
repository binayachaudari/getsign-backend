const ApplicationModel = require('../models/Application.model');
const jwt = require('jsonwebtoken');
const { backOfficeAddItem } = require('../services/backoffice.service');
const SubscriptionModel = require('../models/Subscription.model');

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
      subscription: payload?.data?.subscription?.is_trial ? 'Trial' : 'Paid',
      tier: payload?.data?.subscription?.plan_id,
    });
  }

  const app = await ApplicationModel.create({
    type: payload.type,
    slug: decoded?.dat?.slug,
    back_office_item_id:
      Number(backOfficeItemId?.data?.create_item?.id) || null,
    ...payload?.data,
  });

  const subscriptionExists = await SubscriptionModel.findOne({
    account_id: payload?.data?.account_id,
  });

  if (!subscriptionExists) {
    await SubscriptionModel.create({
      type: payload.type,
      user_id: payload?.data?.user_id,
      user_email: payload?.data?.user_email,
      user_name: payload?.data?.user_name,
      user_cluster: payload?.data?.user_cluster,
      account_tier: payload?.data?.account_tier,
      account_name: payload?.data?.account_name,
      account_slug: payload?.data?.account_slug,
      account_max_users: payload?.data?.account_max_users,
      account_id: payload?.data?.account_id,
      timestamp: payload?.data?.timestamp,
      subscription: payload?.data?.subscription,
    });
  } else {
    await SubscriptionModel.findByIdAndUpdate(subscriptionExists._id, {
      type: payload.type,
      user_id: payload?.data?.user_id,
      user_email: payload?.data?.user_email,
      user_name: payload?.data?.user_name,
      user_cluster: payload?.data?.user_cluster,
      account_tier: payload?.data?.account_tier,
      account_name: payload?.data?.account_name,
      account_slug: payload?.data?.account_slug,
      account_max_users: payload?.data?.account_max_users,
      account_id: payload?.data?.account_id,
      timestamp: payload?.data?.timestamp,
      subscription: payload?.data?.subscription,
    });
  }

  return res.status(201).json({ data: app });
};

module.exports = applicationWebhook;
