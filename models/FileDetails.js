const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const schema = new mongoose.Schema(
  {
    account_id: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
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
    },
    file_name: {
      type: String,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    type: String,
    presigned_file_column_id: String,
    email_column_id: String,
    status_column_id: String,
    file_column_id: String,
    fields: [{}],
    sender_name: String,
    email_address: String,
    email_title: String,
    message: String,
    deadline: Number,
    is_email_verified: {
      type: Boolean,
      default: false,
    },
    email_verification_token: String,
    email_verification_token_expires: {
      type: Date,
    },
    itemViewInstanceId: {
      type: Number,
      requred: true,
    },
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
