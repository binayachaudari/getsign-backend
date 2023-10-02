const jwt = require('jsonwebtoken');

const decodeSessionToken = async (req, res, next) => {
  try {
    let decoded;
    const token = req?.headers?.sessiontoken;

    if (token) decoded = jwt.decode(token, process.env.CLIENT_SECRET);

    const userId = decoded?.dat?.user_id;
    const accountId = decoded?.dat?.account_id;
    const subscription = decoded?.dat?.subscription;
    const slug = decoded?.dat?.slug;

    req.isAuthenticated = true;
    req.userId = userId;
    req.accountId = accountId;
    req.subscription = subscription;
    req.slug = slug;

    next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { decodeSessionToken };
