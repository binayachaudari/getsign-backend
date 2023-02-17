const applicationWebhook = (req, res, next) => {
  const payload = req.body;
  console.log(payload);
};

module.exports = applicationWebhook;
