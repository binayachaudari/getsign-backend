const express = require('express');
const fileUpload = require('express-fileupload');
const { config } = require('./config');
const cors = require('cors');
const connectDB = require('./db');

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

app.use((err, req, res, next) => {
  res.json({ ...err }).status(err?.statusCode || 500);
});

app.listen(PORT, () => {
  console.info(
    `🚀 Server started, listening to port: http://127.0.0.1:${PORT}`
  );
});
