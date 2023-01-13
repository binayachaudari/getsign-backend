const mongoose = require('mongoose');

const MONGO = process.env.MONGO;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO);
    mongoose.set('strictQuery', true);
    console.log('Connect to mongoose');
  } catch (error) {
    console.log('Error while connecting to mongoose', error);
  }
};

module.exports = connectDB;
