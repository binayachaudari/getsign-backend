const orderTypes = new Map([
  [
    'app_subscription_created',
    {
      status: 'Created',
    },
  ],
  [
    'app_subscription_changed',
    {
      status: 'Changed',
    },
  ],
  [
    'app_subscription_renewed',
    {
      status: 'Renewed',
    },
  ],
  [
    'app_subscription_cancelled_by_user',
    {
      status: 'Canceled',
    },
  ],
  [
    'app_subscription_cancelled',
    {
      status: 'Ended',
    },
  ],
  [
    'app_subscription_cancellation_revoked_by_user',
    {
      status: 'Undo Cancelation',
    },
  ],
]);

module.exports = { orderTypes };
