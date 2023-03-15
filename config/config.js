require('dotenv').config();

module.exports = {
  PORT: process.env.PORT,
  HOST: process.env.OAUTH_URL.split('/api/v1/')[0],
};
