const ApplicationModel = require('../models/Application.model');
const jwt = require('jsonwebtoken');
const {
  backOfficeAddItem,
  updateColumnValues,
  getDateAndTime,
  addItemsToOrders,
} = require('../services/backoffice.service');
const SubscriptionModel = require('../models/Subscription.model');
const FileDetailsModel = require('../models/FileDetails');
const { pricingV1 } = require('../config/pricing.v1');
const { orderTypes } = require('../config/orderTypes');

const subscriptionType = subscription => {
  if (!subscription) {
    return 'Trial';
  }

  if (subscription?.is_trial) {
    return 'Trial';
  }

  return 'Paid';
};

const getBillingPeriod = billingPeriod => {
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
  console.log({ payload });

  // reset fields when they uninstall
  if (
    payload?.type === 'uninstall' &&
    ((payload?.data?.version_data && payload?.data?.version_data.major <= 4) ||
      payload?.data?.version_data?.minor <= 5)
  ) {
    await FileDetailsModel.find({
      account_id: payload?.data?.account_id,
    }).update({ fields: [] });
  }

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

  if (!applicationHistory?.back_office_item_id && payload.type === 'install') {
    const addedCustomer = await backOfficeAddItem({
      customerName: payload?.data?.user_name,
      accountEmail: payload?.data?.user_email,
      accountId: payload?.data?.account_id,
      username: payload?.data?.user_name,
      slug: decoded?.dat?.slug,
      subscription:
        payload.type === 'app_subscription_cancelled'
          ? 'Cancelled'
          : subscriptionType(payload?.data?.subscription),
      tier: pricingPlan ? pricingPlan.max_seats.toString() : null,
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
          ? pricingPlan?.monthly
          : getBillingPeriod(payload?.data?.subscription?.billing_period) ===
            'Yearly'
          ? pricingPlan?.yearly
          : null,
    });

    backOfficeItemId = addedCustomer?.data?.create_item?.id;
  } else {
    backOfficeItemId = applicationHistory?.back_office_item_id;
    const values = {
      text2: version || null,
      status: {
        label:
          payload.type === 'app_subscription_cancelled'
            ? 'Cancelled'
            : subscriptionType(payload?.data?.subscription),
      },
      status5: {
        label: pricingPlan ? pricingPlan.max_seats.toString() : null,
      },
      status88: {
        label: getBillingPeriod(payload?.data?.subscription?.billing_period),
      },
      date3:
        subscriptionType(payload?.data?.subscription) === 'Paid'
          ? getDateAndTime()
          : null,
      date6: payload?.data?.subscription?.renewal_date
        ? getDateAndTime(payload?.data?.subscription?.renewal_date)
        : null,
      numbers59:
        getBillingPeriod(payload?.data?.subscription?.billing_period) ===
        'Monthly'
          ? pricingPlan?.monthly
          : getBillingPeriod(payload?.data?.subscription?.billing_period) ===
            'Yearly'
          ? pricingPlan?.yearly
          : null,
    };

    const updatedColumnValues = await updateColumnValues(
      backOfficeItemId,
      JSON.stringify(values)
    );
    console.log('backoffice=> update column values', updatedColumnValues);
  }

  const app = await ApplicationModel.create({
    type: payload.type,
    slug: decoded?.dat?.slug,
    back_office_item_id: Number(backOfficeItemId) || null,
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

  if (payload?.type && orderTypes.get(payload.type)) {
    const transactionType = orderTypes.get(payload.type).status;

    await addItemsToOrders({
      customerName: payload?.data?.user_name,
      createdDate: getDateAndTime(payload?.data?.timestamp),
      email: payload?.data?.user_email,
      accountId: payload?.data?.account_id,
      transactionType,
      plan: pricingPlan ? pricingPlan.max_seats.toString() : null,
      type:
        getBillingPeriod(payload?.data?.subscription?.billing_period) ===
        'Yearly'
          ? 'Annual'
          : getBillingPeriod(payload?.data?.subscription?.billing_period),
      active: payload?.type === 'app_subscription_cancelled' ? 'NO' : 'YES',
      amount: [
        'app_subscription_cancelled_by_user',
        'app_subscription_cancelled',
      ].includes(payload?.type)
        ? null
        : getBillingPeriod(payload?.data?.subscription?.billing_period) ===
          'Monthly'
        ? pricingPlan?.monthly
        : getBillingPeriod(payload?.data?.subscription?.billing_period) ===
          'Yearly'
        ? pricingPlan?.yearly
        : null,
      deactivationDate: payload?.data?.subscription?.renewal_date
        ? getDateAndTime(payload?.data?.subscription?.renewal_date)
        : null,
    });
  }

  return res.status(201).json({ data: app });
};

module.exports = applicationWebhook;
