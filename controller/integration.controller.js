const { getFileToAutoSend } = require('../services/integrations.service');

async function autoSend(req, res, next) {
  try {
    const payload = req?.body?.payload;
    const itemId = payload?.inputFields?.itemId;
    const boardId = payload?.inputFields?.boardId;
    const columnId = payload?.inputFields?.columnId;
    const columnValue = payload?.inputFields?.columnValue;
    const previousColumnValue = payload?.inputFields?.previousColumnValue;

    if (columnValue?.label?.index === previousColumnValue?.label?.index) {
      return res.send({ data: 'Same status as previous.' }).status(200);
    }

    const result = await getFileToAutoSend(itemId, boardId, columnId);

    res.send({ data: result }).status(200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  autoSend,
};
