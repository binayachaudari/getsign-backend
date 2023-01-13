module.exports = {
  authorize: (req, res, next) => {
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
  },
};
