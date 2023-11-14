const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema(
  {
    account_id: {
      type: Number,
      required: true,
      index: true,
    },
    subscription_start_date: {
      type: Date,
    },
    subscription_end_date: { type: Date },
    count: { type: Number, default: 0 },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('Total', schema, 'total');
