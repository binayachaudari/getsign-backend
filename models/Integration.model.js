const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new mongoose.Schema({
  fileId: {
    type: Schema.Types.ObjectId,
    ref: 'FileDetails',
  },
  accountId: {
    type: Number,
    required: true,
  },
  userId: {
    type: Number,
    required: true,
  },
  recipientId: Number,
  integrationId: Number,
  boardId: Number,
  dependencyData: {},
  pageRequestData: {},
  automationID: Number,
});

module.exports = mongoose.model('integration', schema);
