const FileDetails = require('../models/FileDetails');
const { getFileToAutoSend } = require('../services/integrations.service');
const jwt = require('jsonwebtoken');
const {
  registerWebhook,
  uploadContract,
  updateStatusColumn,
} = require('../services/monday.service');
const WebhookModel = require('../models/Webhook.model');
const { config } = require('../config');
const {
  generateFilePreviewWithPlaceholders,
} = require('../services/fileHistory');

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
    const { payload } = req?.body;

    const boardId = payload?.inputFields?.boardId; // this is a board Id column from the integration
    const columnId = payload?.inputFields?.columnId; // this is a file column from the integration
    const itemId = payload?.inputFields?.itemId;
    const fileId = payload?.inputFields?.fileId;

    const fileDetails = await FileDetails.findById(fileId);
    const webhookDetails = await WebhookModel.findOne({ fileId });
    const placeholders = fileDetails.fields;

    const generatedPDF = await generateFilePreviewWithPlaceholders(
      fileId,
      itemId,
      placeholders,
      true
    );

    await uploadContract({
      itemId,
      columnId,
      file: generatedPDF,
      userId: fileDetails.user_id,
      accountId: fileDetails.account_id,
    });

    await updateStatusColumn({
      itemId,
      boardId,
      columnId: webhookDetails?.inputFields?.columnId,
      columnValue: 'PDF Generated',
      userId: fileDetails.user_id,
      accountId: fileDetails.account_id,
    });

    res.status(200).send(generatedPDF);
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

      const registeredWebhook = await registerWebhook({
        boardId: inputFields?.boardId,
        url: config.HOST + '/api/v1/webhooks/generate-pdf/status-change',
        event: 'change_status_column_value',
        token: shortLivedToken,
        config: JSON.stringify({
          columnId: inputFields?.columnId,
          columnValue: {
            index: inputFields?.statusColumnValue?.index,
          },
        }),
      });

      const webhookDetails = await WebhookModel.create({
        boardId: inputFields?.boardId,
        webhookUrl,
        accountId,
        integrationId,
        recipeId,
        subscriptionId,
        userId,
        inputFields,
        webhookId: registeredWebhook?.id,
        fileId: inputFields?.fileId?.value,
      });

      return res.status(200).send({ webhookId: webhookDetails._id });
    } catch (err) {
      console.error(
        'Error while decoding request token (Integration subscribe)',
        err
      );
    }
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
