const jwt = require('jsonwebtoken');
const FileDetails = require('../models/FileDetails');
const ApplicationModel = require('../models/Application.model');
const { updateStatusColumn } = require('../services/monday.service');

const integrationValidateTrial = async (req, res, next) => {
  try {
    if (process.env.IS_DEV) {
      return next();
    }
    let decoded;
    const token = req?.headers?.authorization;

    if (token) decoded = jwt.decode(token, process.env.CLIENT_SECRET);

    console.log({ decoded, token });

    const payload = req?.body?.payload;
    const accountId = decoded?.accountId;
    const subscription = decoded?.subscription;
    const itemId = payload?.inputFields?.itemId;
    const boardId = payload?.inputFields?.boardId;
    const columnId = payload?.inputFields?.columnId;

    if (!subscription) {
      console.log(
        '********************************** NO SUBSCRIPTION **********************************',
        JSON.stringify({ payload, subscription, decoded, token })
      );
      return next();
      // return next({
      //   message: 'You need to upgrade/re-install GetSign',
      //   statusCode: 426,
      // });
    }

    let trialPeriodExpired = true;
    let isFreePlan = subscription?.plan_id === '3seats';
    const file = await FileDetails.findOne({
      board_id: boardId,
      status_column_id: columnId,
      is_deleted: false,
    });

    const adminDetails = await ApplicationModel.findOne({
      account_id: accountId,
      type: 'install',
    }).sort({ created_at: 'desc' });

    const slug = adminDetails?.slug;

    if (subscription) {
      if (!isFreePlan) {
        const renewalDate = new Date(subscription?.renewal_date);
        const now = new Date();

        trialPeriodExpired = Boolean(renewalDate - now < 0);
      }

      if (!isFreePlan && !trialPeriodExpired) {
        return next();
      }

      // calculate no of documents
      const startOfMonth = new Date().setDate(
        new Date(subscription?.renewal_date).getDate()
      );
      const endOfMonth = new Date(startOfMonth).setMonth(
        new Date(startOfMonth).getMonth() + 1
      );

      // check no of documents sent this month depending upon subscrition document created_at date
      const itemSentList = await FileDetails.aggregate([
        {
          $match: {
            account_id: accountId.toString(),
          },
        },
        {
          $lookup: {
            from: 'filehistories',
            localField: '_id',
            foreignField: 'fileId',
            as: 'filehistories',
          },
        },
        {
          $unwind: {
            path: '$filehistories',
          },
        },
        {
          $match: {
            $and: [
              {
                'filehistories.status': 'sent',
              },
              {
                'filehistories.created_at': {
                  $gte: new Date(
                    new Date(startOfMonth).getFullYear(),
                    new Date(startOfMonth).getMonth(),
                    new Date(startOfMonth).getDate()
                  ),
                  $lte: new Date(
                    new Date(endOfMonth).getFullYear(),
                    new Date(endOfMonth).getMonth(),
                    new Date(endOfMonth).getDate()
                  ),
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: '$filehistories.fileId',
            count: {
              $sum: 1,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCount: {
              $sum: '$count',
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
          },
        },
      ]);

      if (itemSentList?.[0]?.totalCount === 10) {
        if (slug) {
          await sendLimitAboutToReach(
            `https://${slug}.monday.com/apps/installed_apps/10050849?billing`,
            [file.email_address, adminDetails?.user_email]
          );
        } else {
          await sendLimitAboutToReach(
            `https://monday.com/apps/installed_apps/10050849?billing`,
            [file.email_address, adminDetails?.user_email]
          );
        }
      }

      if (itemSentList?.[0]?.totalCount === 15) {
        if (slug) {
          await sendLimitReached(
            `https://${slug}.monday.com/apps/installed_apps/10050849?billing`,
            [file.email_address, adminDetails?.user_email]
          );
        } else {
          await sendLimitReached(
            `https://monday.com/apps/installed_apps/10050849?billing`,
            [file.email_address, adminDetails?.user_email]
          );
        }
      }

      if (itemSentList.length === 0 || itemSentList?.[0]?.totalCount < 15) {
        return next();
      }

      if (itemSentList?.[0]?.totalCount >= 15) {
        await updateStatusColumn({
          itemId: itemId,
          boardId: file.board_id,
          columnId: file?.status_column_id,
          columnValue: 'Limit Reached',
          userId: file?.user_id,
          accountId: file?.account_id,
        });
        return res
          .json({
            message: 'Trial usage limit reached',
          })
          .status(402);
      }
    }
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  integrationValidateTrial,
};
