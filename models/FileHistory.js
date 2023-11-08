const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const { Schema } = mongoose;

const schema = new mongoose.Schema(
  {
    itemId: {
      type: Number,
      required: true,
      required: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: 'FileDetails',
    },
    status: {
      type: String,
      enum: [
        'sent',
        'resent',
        'signed_by_sender',
        'signed_by_receiver',
        'viewed',
      ],
      required: true,
    },
    viewedIpAddress: String,
    receiverSignedIpAddress: String,
    sentToEmail: String,
    file: String,
    assignedReciever: {
      // New field to accommodate having same email column for different signers. Similar to Signer Model ->type of signers
      type: {
        emailColumnId: String, // Email/Mirrored Email column id of signer
        userId: String, // to seperate signer that are 'Me'
      },
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
  encryptedFields: [
    'viewedIpAddress',
    'receiverSignedIpAddress',
    'sentToEmail',
  ],
});

module.exports = mongoose.model('FileHistory', schema);
