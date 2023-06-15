const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    slug: String,
    app_id: {
      type: Number,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    user_email: {
      type: String,
      required: true,
    },
    user_name: {
      type: String,
      required: true,
    },
    user_cluster: String,
    account_tier: String,
    account_name: String,
    account_slug: String,
    account_max_users: {
      type: Number,
      required: true,
    },
    account_id: {
      type: Number,
      required: true,
      index: true,
    },
    back_office_item_id: Number,
    version_data: Object,
    timestamp: String,
    subscription: Object,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('application', schema);
