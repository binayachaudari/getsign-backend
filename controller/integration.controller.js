const FileDetails = require('../models/FileDetails');
const { getFileToAutoSend } = require('../services/integrations.service');
const jwt = require('jsonwebtoken');
const { registerWebhook } = require('../services/monday.service');
const { config } = require('../config');

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
    const { payload } = req?.body;

    const files = await FileDetails.find({
      board_id: payload?.boardId,
      is_deleted: false,
      type: 'generate',
    }).select('id file_name');

    return res.status(200).send({
      options: files?.map(f => ({ title: f.file_name, value: f._id })),
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
}

async function generatePDFWithStatus(req, res, next) {
  try {
    console.log('generatePDFWithStatus', JSON.stringify(req?.body, null, 2));
    res.status(200).send({});
  } catch (err) {
    console.log(err);
    next(err);
  }
}

async function subscribeGenerateWithStatus(req, res, next) {
  try {
    console.log(
      'subscribeGenerateWithStatus',
      JSON.stringify(req?.body, null, 2)
    );

    const { webhookUrl, subscriptionId, inputFields, recipeId, integrationId } =
      req?.body?.payload;

    const requestToken = req?.header('authorization');
    console.log('**** requestToken: integration subscribe ****', requestToken);

    try {
      const reqTokenData = jwt.decode(requestToken, process.env.CLIENT_SECRET);
      accountId = reqTokenData?.accountId;
      userId = reqTokenData?.userId;
      shortLivedToken = reqTokenData?.shortLivedToken;

      await registerWebhook({
        boardId: inputFields?.boardId,
        url: config.HOST + '/api/v1/webhooks/generate-pdf/status-change',
        event: 'change_status_column_value',
        token: shortLivedToken,
      });
    } catch (err) {
      console.error(
        'Error while decoding request token (Integration subscribe)',
        err
      );
    }

    res.status(200).send({ webhookId: '123' });
  } catch (err) {
    console.log(err);
    next(err);
  }
}

async function unsubscribeGenerateWithStatus(req, res, next) {
  try {
    console.log(
      'unsubscribeGenerateWithStatus',
      JSON.stringify(req?.body, null, 2)
    );
    res.status(200).send({ webhookId: '123' });
  } catch (err) {
    console.log(err);
    next(err);
  }
}

module.exports = {
  autoSend,
  subscribeGenerateWithStatus,
  unsubscribeGenerateWithStatus,
  getTemplatesForPDF,
  generatePDFWithStatus,
};
