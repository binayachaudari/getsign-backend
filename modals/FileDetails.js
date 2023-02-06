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
      enum: [
        'ready_to_sign',
        'pending',
        'signed_by_sender',
        'signed_by_receiver',
        'viewed',
      ],
    },
    is_deleted: {
      type: Boolean,
      default: false,
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
