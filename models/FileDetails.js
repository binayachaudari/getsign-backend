const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

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
    file_name: {
      type: String,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    email_column_id: String,
    status_column_id: String,
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

const encKey = process.env.SOME_32BYTE_BASE64_STRING;
const sigKey = process.env.SOME_64BYTE_BASE64_STRING;

schema.plugin(encrypt, {
  encryptionKey: encKey,
  signingKey: sigKey,
  encryptedFields: ['sender_name', 'email_address', 'email_title', 'message'],
});

module.exports = mongoose.model('FileDetails', schema);
