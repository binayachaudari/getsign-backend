require('dotenv').config('../.env');
const mondaySdk = require('monday-sdk-js');
const monday = mondaySdk();
const ApplicationModel = require('../models/Application.model');
const connectDB = require('../db');
const SubscriptionModel = require('../models/Subscription.model');
const {
  getDateAndTime,
  backOfficeAddItem,
} = require('../services/backoffice.service');
const { pricingV1 } = require('../config/pricing.v1');
const { orderTypes } = require('../config/orderTypes');

connectDB();

const backOfficeMondayToken = process.env.BACK_OFFICE_TOKEN;
const customerBoardId = process.env.BACK_OFFICE_CUSTOMER_BOARD_ID;
const ordersBoardId = process.env.BACK_OFFICE_ORDERS_BOARD_ID;

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

const init = async () => {
  monday.setToken(backOfficeMondayToken);

  const history = await ApplicationModel.find({
    type: 'install',
    back_office_item_id: { $eq: null },
  });

  monday.setToken(backOfficeMondayToken);

  for (h of history) {
    const itemsByAccountId = await monday.api(
      `
    query getItemByColumnValue($boardId: Int!, $columnId: String!, $columnValue: String!) {
      items_by_column_values (board_id: $boardId, column_id: $columnId, column_value: $columnValue) {
          id
          name
      }
  }
    `,
      {
        variables: {
          boardId: Number(customerBoardId),
          columnId: 'numbers',
          columnValue: h?.account_id.toString(),
        },
      }
    );
    console.log(itemsByAccountId);

    if (itemsByAccountId?.data?.items_by_column_values?.[0]?.id) {
      const result = await ApplicationModel.findByIdAndUpdate(h.id, {
        back_office_item_id:
          itemsByAccountId?.data?.items_by_column_values?.[0].id,
      });
      console.log(`Updated ${result.slug}`);
    } else {
      const pricingPlan = h?.subscription?.plan_id
        ? pricingV1.get(h?.subscription?.plan_id)
        : null;
      const version = h?.version_data
        ? `${h?.version_data?.major}.${h?.version_data?.minor}.${h?.version_data?.patch}`
        : null;
      const addedCustomer = await backOfficeAddItem({
        customerName: h?.user_name,
        accountEmail: h?.user_email,
        accountId: h?.account_id,
        username: h?.user_name,
        slug: h?.slug,
        dateJoined: h?.timestamp,
        subscription:
          h.type === 'app_subscription_cancelled'
            ? 'Cancelled'
            : subscriptionType(h?.subscription),
        tier: pricingPlan ? pricingPlan.max_seats.toString() : null,
        version,
        type: getBillingPeriod(h?.subscription?.billing_period),
        subscribedDate:
          subscriptionType(h?.subscription) === 'Paid'
            ? getDateAndTime()
            : null,
        renewalDate: h?.subscription?.renewal_date
          ? getDateAndTime(h?.subscription?.renewal_date)
          : null,
        amount:
          getBillingPeriod(h?.subscription?.billing_period) === 'Monthly'
            ? pricingPlan.monthly
            : getBillingPeriod(h?.subscription?.billing_period) === 'Yearly'
            ? pricingPlan.yearly
            : null,
      });

      const backOfficeItemId = addedCustomer?.data?.create_item?.id;

      const result = await ApplicationModel.findByIdAndUpdate(h.id, {
        back_office_item_id: backOfficeItemId,
      });
      console.log(`Updated ${result.slug}`);
    }
    // if (h?.type && orderTypes.get(h?.type)) {
    //   const transactionType = orderTypes.get(h?.type).status;
    //   const pricingPlan = h?.subscription?.plan_id
    //     ? pricingV1.get(h?.subscription?.plan_id)
    //     : null;

    //   const payload = {
    //     date: getDateAndTime(h.timestamp),
    //     email_1: {
    //       email: h?.user_email,
    //       text: h?.user_email,
    //     },
    //     numbers1: h?.account_id,
    //     status: {
    //       label: transactionType,
    //     },
    //     status9: {
    //       label: pricingPlan.max_seats.toString(),
    //     },
    //     status97: {
    //       label: getBillingPeriod(h?.subscription?.billing_period),
    //     },
    //     status91: {
    //       label: h?.type === 'app_subscription_cancelled' ? 'NO' : 'YES',
    //     },
    //     numbers: [
    //       'app_subscription_cancelled_by_user',
    //       'app_subscription_cancelled',
    //     ].includes(h?.type)
    //       ? null
    //       : getBillingPeriod(h?.subscription?.billing_period) === 'Monthly'
    //       ? pricingPlan.monthly
    //       : getBillingPeriod(h?.subscription?.billing_period) === 'Yearly'
    //       ? pricingPlan.yearly
    //       : null,

    //     date0: h?.subscription?.renewal_date
    //       ? getDateAndTime(h?.subscription?.renewal_date)
    //       : null,
    //   };

    //   const values = JSON.stringify(payload);

    //   const result = await monday.api(
    //     `
    //   mutation createItem($itemName: String!, $boardId: Int!, $values: JSON) {
    //     create_item(board_id: $boardId, item_name: $itemName, column_values: $values, create_labels_if_missing: true) {
    //       id
    //     }
    //   }
    // `,
    //     {
    //       variables: {
    //         boardId: Number(ordersBoardId),
    //         itemName: h.user_name,
    //         values,
    //       },
    //     }
    //   );

    //   console.log(result);
    // }
  }
};

init();
