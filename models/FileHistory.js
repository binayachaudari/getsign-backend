const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new mongoose.Schema(
  {
    itemId: {
      type: Number,
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
    },
    viewedIpAddress: String,
    receiverSignedIpAddress: String,
    sentToEmail: String,
    file: String,
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('FileHistory', schema);
