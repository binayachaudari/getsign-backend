const { getFileToAutoSend } = require('../services/integrations.service');

async function autoSend(req, res, next) {
  console.log(req.body);
  try {
    const payload = req?.body?.payload;
    const itemId = payload?.inputFields?.itemId;
    const boardId = payload?.inputFields?.boardId;
    const columnId = payload?.inputFields?.columnId;

    const result = await getFileToAutoSend(itemId, boardId, columnId);

    res.send({ data: result }).status(200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  autoSend,
};
