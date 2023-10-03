const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  accountId: {
    type: Number,
    required: true,
  },
  userId: {
    type: Number,
    required: true,
  },
  integrationId: Number,
  webhookId: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('integration', schema);
