const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'signed_by_sender', 'signed_by_receiver', 'viewed'],
    },
    viewedIpAddress: String,
    receiverSignedIpAddress: String,
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

module.exports = mongoose.model('FileHistory', schema);
