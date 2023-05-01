async function autoSend(req, res, next) {
  console.log(JSON.stringify(req.body));
  res.send({ data: req.body }).status(200);
}

async function autoSendSubscribe(req, res, next) {
  console.log(JSON.stringify(req.body));
  res.send({ data: req.body }).status(200);
}
async function autoSendUnsubscribe(req, res, next) {
  console.log(JSON.stringify(req.body));
  res.send({ data: req.body }).status(200);
}

module.exports = {
  autoSend,
  autoSendSubscribe,
  autoSendUnsubscribe,
};
