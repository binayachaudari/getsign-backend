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
      required: true,
      index: true,
    },
    board_id: {
      type: Number,
      required: true,
    },
    workspace_id: {
      type: Number,
      required: true,
    },
    item_id: {
      type: Number,
      required: true,
    },
    accessToken: {
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

const encKey = process.env.SOME_32BYTE_BASE64_STRING;
const sigKey = process.env.SOME_64BYTE_BASE64_STRING;

schema.plugin(encrypt, {
  encryptionKey: encKey,
  signingKey: sigKey,
  encryptedFields: ['accessToken'],
});

module.exports = mongoose.model('User', schema);
