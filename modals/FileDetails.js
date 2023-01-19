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
      unique: true,
    },
    item_id: {
      type: Number,
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
    file_name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ready_to_sign', 'pending', 'signed'],
    },
    fields: [{}],
    sender_name: String,
    email_address: String,
    email_title: String,
    message: String,
    deadline: Number,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('FileDetails', schema);
