const FileDetails = require('../models/FileDetails');
const { getFileToAutoSend } = require('../services/integrations.service');
const jwt = require('jsonwebtoken');
const {
  registerWebhook,
  uploadContract,
  updateStatusColumn,
  unregisterWebhook,
} = require('../services/monday.service');
const WebhookModel = require('../models/Webhook.model');
const { config } = require('../config');
const {
  generateFilePreviewWithPlaceholders,
} = require('../services/fileHistory');
const SubscriptionModel = require('../models/Subscription.model');
const TotalModel = require('../models/Total.model');
const {
  backofficeUpdateTotalGenerated,
} = require('../services/backoffice.service');
const ApplicationModel = require('../models/Application.model');
const { sendLimitAboutToReach } = require('../services/mailer');

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

    const subscriptionDetail = await SubscriptionModel.findOne({
      account_id: fileDetails.account_id,
    });

    if (!subscriptionDetail?.subscription && !process.env.IS_DEV) {
      throw {
        message: 'You need to upgrade/re-install GetSign',
        statusCode: 426,
      };
    }

    if (subscriptionDetail?.subscription) {
      const backOfficeDetails = await ApplicationModel.findOne({
        account_id: fileDetails.account_id,
        back_office_item_id: { $exists: true },
      });

      const exists = await TotalModel.findOne({
        account_id: fileDetails.account_id,
        subscription_start_date: {
          $lte: new Date(),
        },
        subscription_end_date: {
          $gte: new Date(),
        },
      }).sort({ subscription_end_date: -1 });

      if (exists) {
        // Limit trial users to 15 documents
        let isTrial = true;
        let trialPeriodExpired = true;
        let isFreePlan = subscriptionDetail?.subscription?.plan_id === '3seats';
        if (!isFreePlan) {
          const renewalDate = new Date(
            subscriptionDetail?.subscription?.renewal_date
          );
          const now = new Date();

          trialPeriodExpired = Boolean(renewalDate - now < 0);
          isTrial = subscriptionDetail?.subscription?.is_trial;
        }

        if ((isTrial && trialPeriodExpired) || isFreePlan) {
          if (exists.count === 10) {
            await sendLimitAboutToReach(
              `https://${subscriptionDetail?.account_slug}.monday.com/apps/installed_apps/10050849?billing`,
              [fileDetails?.email_address, subscriptionDetail?.user_email]
            );
          } else if (exists.count >= 15) {
            await updateStatusColumn({
              itemId,
              boardId,
              columnId: webhookDetails?.inputFields?.columnId,
              columnValue: 'Limit Reached',
              userId: fileDetails.user_id,
              accountId: fileDetails.account_id,
            });
            return;
          }
        }

        exists.count += 1;
        if (backOfficeDetails.back_office_item_id) {
          backofficeUpdateTotalGenerated(
            backOfficeDetails.back_office_item_id,
            exists.count
          );
        }
        await exists.save();
      } else {
        const today = new Date();
        const subscription_start_date = new Date(
          new Date(today).getFullYear(),
          new Date(today).getMonth(),
          new Date(subscriptionDetail?.subscription?.renewal_date).getDay()
        );

        const subscription_end_date = new Date(
          subscription_start_date
        ).setMonth(subscription_start_date.getMonth() + 1);

        await TotalModel.create({
          account_id: fileDetails.account_id,
          subscription_start_date,
          subscription_end_date,
          count: 1,
        });
        if (backOfficeDetails.back_office_item_id) {
          backofficeUpdateTotalGenerated(
            backOfficeDetails.back_office_item_id,
            1
          );
        }
      }
    }

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
    const webhookId = req?.body?.payload?.webhookId;

    const requestToken = req?.header('authorization');
    console.log('**** requestToken: integration subscribe ****', requestToken);

    try {
      const reqTokenData = jwt.decode(requestToken, process.env.CLIENT_SECRET);
      accountId = reqTokenData?.accountId;
      userId = reqTokenData?.userId;
      shortLivedToken = reqTokenData?.shortLivedToken;
      const webhookDetails = await WebhookModel.findById(webhookId);

      const removedWebhook = await unregisterWebhook({
        webhookId: webhookDetails?.webhookId,
        token: shortLivedToken,
      });

      if (!removedWebhook?.errors?.length)
        await WebhookModel.findByIdAndDelete(webhookId);

      return res.status(200).send();
    } catch (err) {
      console.error(
        'Error while decoding request token (Integration unsubscribe)',
        err
      );
    }
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
