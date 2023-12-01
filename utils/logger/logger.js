const { createLogger, format } = require('winston'),
  WinstonCloudWatch = require('winston-cloudwatch');

// Implement a logger class that logs to cloudwatch
class Logger {
  constructor() {
    this.logger = createLogger({
      format: format.combine(format.timestamp(), format.json()),
      transports: [
        new WinstonCloudWatch({
          logGroupName: process.env.AWS_CLOUDWATCH_GROUP_NAME,
          logStreamName: process.env.AWS_CLOUDWATCH_STREAM,
          awsAccessKeyId: process.env.AWS_CLOUDWATCH_ACCESS_KEY,
          awsSecretKey: process.env.AWS_CLOUDWATCH_SECRET_ACCESS_KEY,
          awsRegion: process.env.AWS_REGION,
          jsonMessage: true,
        }),
      ],
    });
  }

  info(message) {
    this.logger.info(message);
  }

  error(message) {
    this.logger.error(message);
  }
}

module.exports = Logger;
