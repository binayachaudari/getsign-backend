const { isAlreadyAuthenticated } = require('../services/authenticatedBoard');
const { storeOrUpdateUser } = require('../services/user.service');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const OAUTH_URL = process.env.OAUTH_URL;

module.exports = {
  authorize: (req, res, next) => {
    var code = req.query.code || null;
    var state = req.query.state || null;

    const context = state ? JSON.parse(state) : null;

    const raw = JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: OAUTH_URL,
    });

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
      .then(async (result) => {
        if (result.error) {
          return next({ error: result, statusCode: 400 });
        }

        const user = await storeOrUpdateUser(context, result.access_token);
        const params = new URLSearchParams();
        params.append('result', JSON.stringify(result));
        params.append('user', JSON.stringify(user));
        return res.redirect('/authorize?' + params).status(200);
      })
      .catch((error) => next({ message: error, statusCode: 400 }));
  },
  isAuthorized: async (req, res, next) => {
    const { boardId } = req.params;

    try {
      const result = await isAlreadyAuthenticated(boardId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
};
