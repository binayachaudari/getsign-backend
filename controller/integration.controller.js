const { getFileToAutoSend } = require('../services/integrations.service');

async function autoSend(req, res, next) {
  try {
    console.log(JSON.stringify(req.body));
    const payload = req?.body?.payload;
    const itemId = payload?.inputFields?.itemId;
    const boardId = payload?.inputFields?.boardId;
    const columnId = payload?.inputFields?.columnId;
    const columnValue = payload?.inputFields?.columnValue;
    const previousColumnValue = payload?.inputFields?.previousColumnValue;

    if (columnValue?.label?.index === previousColumnValue?.label?.index) {
      return res.status(200).send({});
    }

    const result = await getFileToAutoSend(itemId, boardId, columnId);
    console.log(result);

    return res.status(200).send({});
  } catch (error) {
    console.log(error);
    next(error);
  }
}

module.exports = {
  autoSend,
};
