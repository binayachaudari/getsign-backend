const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    app_id: {
      type: Number,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    user_email: {
      type: String,
      required: true,
    },
    user_name: {
      type: String,
      required: true,
    },
    user_cluster: {
      type: String,
      required: true,
    },
    account_id: {
      type: Number,
      required: true,
    },
    version_data: Object,
    timestamp: String,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('application', schema);
