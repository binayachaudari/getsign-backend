require('dotenv').config('../.env');
const mondaySdk = require('monday-sdk-js');
const monday = mondaySdk();
const ApplicationModel = require('../models/Application.model');
const connectDB = require('../db');
const SubscriptionModel = require('../models/Subscription.model');
const fileHistory = require('../models/FileHistory');
const {
  getDateAndTime,
  backOfficeAddItem,
} = require('../services/backoffice.service');
const { pricingV1 } = require('../config/pricing.v1');
const { orderTypes } = require('../config/orderTypes');
const FileDetails = require('../models/FileDetails');
const UserModel = require('../models/User.model');

connectDB();

const init = async () => {
  const history = await ApplicationModel.find({
    type: 'install',
    back_office_item_id: { $eq: null },
  });

  const filesDetails = await FileDetails.find({ account_id: '12634356' });

  await ApplicationModel.deleteMany({ account_id: '12634356' });
  await UserModel.deleteMany({ account_id: '12634356' });

  for (const f of filesDetails) {
    await fileHistory.deleteMany({ fileId: f._id });
    await FileDetails.deleteOne({ _id: f._id });
  }
};

init();
