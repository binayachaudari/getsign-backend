const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const AuthenticatedBoardSchema = new mongoose.Schema(
  {
    boardId: {
      type: Number,
      required: true,
      index: true,
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

AuthenticatedBoardSchema.plugin(encrypt, {
  encryptionKey: encKey,
  signingKey: sigKey,
  encryptedFields: ['accessToken'],
});

module.exports = mongoose.model(
  'AuthenticatedBoards',
  AuthenticatedBoardSchema
);
