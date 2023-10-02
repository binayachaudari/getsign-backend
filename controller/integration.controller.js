const { getFileToAutoSend } = require('../services/integrations.service');

async function autoSend(req, res, next) {
  try {
    console.log('AutoSend Payload', JSON.stringify(req?.body, null, 2));
    const payload = req?.body?.payload;
    const itemId = payload?.inputFields?.itemId;
    const boardId = payload?.inputFields?.boardId;
    const columnId = payload?.inputFields?.columnId;
    const columnValue = payload?.inputFields?.columnValue;
    const previousColumnValue = payload?.inputFields?.previousColumnValue;

    if (columnValue?.label?.index === previousColumnValue?.label?.index) {
      return res.status(200).send({});
    }

    await getFileToAutoSend(itemId, boardId, columnId);

    return res.status(200).send({});
  } catch (error) {
    console.error(error);
    next(error);
  }
}

async function getTemplatesForPDF(req, res, next) {
  try {
    console.log('getTemplatesForPDF Payload', req?.body);
    return res.status(200).send({
      options: [
        {
          title: 'Test Template',
          value: 'test-template',
        },
      ],
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
}

async function generatePDFWithButton(req, res, next) {
  try {
    console.log('generatePDFWithButton', req?.body);
    res.status(200).send({});
  } catch (err) {
    console.log(err);
    next(err);
  }
}

module.exports = {
  autoSend,
  getTemplatesForPDF,
  generatePDFWithButton,
};
