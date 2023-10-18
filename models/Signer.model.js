const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new mongoose.Schema(
  {
    originalFileId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'FileDetails',
    },
    itemId: {
      type: Number,
      required: true,
    },
    isSigningOrderRequired: Boolean,
    file: String,
    signers: [{}],
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('signer', schema);
