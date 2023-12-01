const { createLogger, format } = require('winston'),
  WinstonCloudWatch = require('winston-cloudwatch');

// Implement a logger class that logs to cloudwatch
class Logger {
  constructor() {
    this.logger = createLogger({
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD hh:mm:ss.SS A',
        }),
        format.json()
      ),
      transports: [
        new WinstonCloudWatch({
          logGroupName: process.env.AWS_CLOUDWATCH_GROUP_NAME,
          logStreamName: process.env.AWS_CLOUDWATCH_STREAM,
          awsOptions: {
            credentials: {
              accessKeyId: process.env.AWS_CLOUDWATCH_ACCESS_KEY,
              secretAccessKey: process.env.AWS_CLOUDWATCH_SECRET_ACCESS_KEY,
            },
          },
          awsRegion: process.env.AWS_REGION,
          jsonMessage: true,
        }),
      ],
    });
  }

  info(request, message) {
    this.logger.info(request, message);
  }

  error(request, message) {
    this.logger.error(request, message);
  }
}

module.exports = Logger;
