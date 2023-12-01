const express = require('express');
const fileUpload = require('express-fileupload');
const { config } = require('./config');
const cors = require('cors');
const connectDB = require('./db');
const path = require('path');
const bodyParser = require('body-parser');
const Sentry = require('@sentry/node');
const Logger = require('./utils/logger/logger');
const logger = new Logger();

connectDB();

const { appSubscriptionValidation } = require('./validators/webhook.validator');
const { validateRequest } = require('./middleware/validateRequest.middleware');

const app = express();
const PORT = config.PORT;

// // Sentry
// Sentry.init({
//   dsn: 'https://722fbb53322249b590acf3f85e021260@o509278.ingest.sentry.io/4504966949109760',
//   integrations: [
//     // enable HTTP calls tracing
//     new Sentry.Integrations.Http({ tracing: true }),
//     // enable Express.js middleware tracing
//     new Sentry.Integrations.Express({ app }),
//     // Automatically instrument Node.js libraries and frameworks
//     ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
//   ],

//   // Set tracesSampleRate to 1.0 to capture 100%
//   // of transactions for performance monitoring.
//   // We recommend adjusting this value in production
//   tracesSampleRate: 1.0,
// });

// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(
  Sentry.Handlers.requestHandler({
    ip: true,
  })
);
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(bodyParser.json({ limit: '10MB' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  fileUpload({
    safeFileNames: true,
    preserveExtension: true,
  })
);

app.use((req, res, next) => {
  logger.info(`Requesting ${req.method} ${req.originalUrl}
  
  Additional Info: ${JSON.stringify({ body: req.body, headers: req.headers })}
  `);
  next();
});

app.use('/api/v1', require('./routes/api'));
app.post(
  '/webhook',
  // appSubscriptionValidation(),
  // validateRequest,
  require('./controller/webhook.controller').applicationWebhook
);

/**
 * Server static in production
 */
if (process.env.NODE_ENV === 'production') {
  //set static folder
  app.use(express.static(path.join(__dirname, '..', 'application', 'dist')));
  app.get('*', (req, res, next) => {
    res.sendFile(
      path.join(__dirname, '..', 'application', 'dist', 'index.html')
    );
  });
}

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

app.use((err, req, res, next) => {
  return res.status(err?.statusCode || 500).json({
    message: err.message,
    errorId: res.sentry,
    ...(err?.userId && { userId: err.userId }),
  });
});

app.listen(PORT, () => {
  console.info(
    `🚀 Server started, listening to port: http://127.0.0.1:${PORT}`
  );
});
