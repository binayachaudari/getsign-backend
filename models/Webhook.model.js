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
  boardId: {
    type: Number,
    required: true,
  },
  recipeId: Number,
  integrationId: Number,
  subscriptionId: Number,
  inputFields: {},
  webhookId: {
    type: Number,
    required: true,
  },
  webhookUrl: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('webhooks', schema);
