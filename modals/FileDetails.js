const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    account_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    board_id: {
      type: Number,
      required: true,
    },
    item_id: {
      type: Number,
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('FileDetails', schema);
