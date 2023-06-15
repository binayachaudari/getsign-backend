const ApplicationModel = require('../models/Application.model');
const jwt = require('jsonwebtoken');
const {
  backOfficeAddItem,
  updateColumnValues,
  getDateAndTime,
} = require('../services/backoffice.service');
const SubscriptionModel = require('../models/Subscription.model');
const { pricingV1 } = require('../config/pricing.v1');

const subscriptionType = (subscription) => {
  if (!subscription) {
    return 'Trial';
  }

  if (subscription?.is_trial) {
    return 'Trial';
  }

  return 'Paid';
};

const getBillingPeriod = (billingPeriod) => {
  switch (billingPeriod) {
    case 'monthly':
      return 'Monthly';

    case 'yearly':
      return 'Yearly';

    default:
      null;
  }
};

const applicationWebhook = async (req, res, next) => {
  let decoded;
  let backOfficeItemId;
  const auth = req?.headers?.authorization;
  if (auth) decoded = jwt.decode(auth, process.env.CLIENT_SECRET);

  const payload = req.body;

  const applicationHistory = await ApplicationModel.findOne({
    account_id: payload?.data?.account_id,
    back_office_item_id: { $ne: null },
  });

  const version = payload?.data?.version_data
    ? `${payload?.data?.version_data?.major}.${payload?.data?.version_data?.minor}.${payload?.data?.version_data?.patch}`
    : null;

  const pricingPlan = payload?.data?.subscription?.plan_id
    ? pricingV1.get(payload?.data?.subscription?.plan_id)
    : null;

  if (!applicationHistory?.back_office_item_id) {
    backOfficeItemId = await backOfficeAddItem({
      customerName: payload?.data?.user_name,
      accountEmail: payload?.data?.user_email,
      accountId: payload?.data?.account_id,
      username: payload?.data?.user_name,
      slug: decoded?.dat?.slug,
      subscription: subscriptionType(payload?.data?.subscription),
      tier: pricingPlan.max_seats,
      version,
      type: getBillingPeriod(payload?.data?.subscription?.billing_period),
      subscribedDate:
        subscriptionType(payload?.data?.subscription) === 'Paid'
          ? getDateAndTime()
          : null,
      renewalDate: payload?.data?.subscription?.renewal_date
        ? getDateAndTime(payload?.data?.subscription?.renewal_date)
        : null,
      amount:
        getBillingPeriod(payload?.data?.subscription?.billing_period) ===
        'Monthly'
          ? pricingPlan.monthly
          : getBillingPeriod(payload?.data?.subscription?.billing_period) ===
            'Yearly'
          ? pricingPlan.yearly
          : null,
    });
  } else {
    backOfficeItemId = applicationHistory?.back_office_item_id;
    const payload = {
      text2: version || null,
      status: {
        label: subscriptionType(payload?.data?.subscription),
      },
      status5: {
        label: pricingPlan.max_seats,
      },
      status88: {
        label: getBillingPeriod(payload?.data?.subscription?.billing_period),
      },
      date6: payload?.data?.subscription?.renewal_date
        ? getDateAndTime(payload?.data?.subscription?.renewal_date)
        : null,
      numbers59:
        getBillingPeriod(payload?.data?.subscription?.billing_period) ===
        'Monthly'
          ? pricingPlan.monthly
          : getBillingPeriod(payload?.data?.subscription?.billing_period) ===
            'Yearly'
          ? pricingPlan.yearly
          : null,
    };

    const values = JSON.stringify(payload);
    await updateColumnValues(backOfficeItemId, values);
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
