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

app.post('/authorize', async (req, res, next) => {
  const payload = req.body;
  var raw = JSON.stringify(payload);

  var requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: raw,
    redirect: 'follow',
  };

  fetch('https://auth.monday.com/oauth2/token', requestOptions)
    .then((response) => response.json())
    .then((result) => {
      if (result.error) {
        return next({ error: result, statusCode: 400 });
      }

      return res.json({ data: result }).status(200);
    })
    .catch((error) => next({ message: error, statusCode: 400 }));
});

app.use((err, req, res, next) => {
  res.json({ ...err }).status(err?.statusCode || 500);
});

app.listen(PORT, () => {
  console.info(
    `🚀 Server started, listening to port: http://127.0.0.1:${PORT}`
  );
});
