const express = require('express');
const fileUpload = require('express-fileupload');
const { config } = require('./config');
const cors = require('cors');
const connectDB = require('./db');
const path = require('path');

connectDB();

var bodyParser = require('body-parser');

const app = express();
const PORT = config.PORT;

app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

app.use('/api/v1', require('./routes/api'));

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

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err?.statusCode || 500).json({ message: err.message });
});

app.listen(PORT, () => {
  console.info(
    `🚀 Server started, listening to port: http://127.0.0.1:${PORT}`
  );
});
