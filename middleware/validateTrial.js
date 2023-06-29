const ApplicationModel = require('../models/Application.model');
const FileDetails = require('../models/FileDetails');
const {
  sendLimitAboutToReach,
  sendLimitReached,
} = require('../services/mailer');
const { updateStatusColumn } = require('../services/monday.service');

const validateTrial = async (req, res, next) => {
  try {
    if (process.env.IS_DEV) {
      return next();
    }
    const subscription = req?.subscription;
    if (!subscription) {
      return next({
        message: 'You need to upgrade/re-install GetSign',
        statusCode: 426,
      });
    }
    let isTrial = true;
    let trialPeriodExpired = true;
    let isFreePlan = subscription?.plan_id === '3seats';
    const { accountId, slug } = req;
    const { itemId, id } = req.params;

    const template = await FileDetails.findById(id);
    const adminDetails = await ApplicationModel.findOne({
      account_id: accountId,
      type: 'install',
    }).sort({ created_at: 'desc' });

    if (subscription) {
      if (!isFreePlan) {
        const renewalDate = new Date(subscription?.renewal_date);
        const now = new Date();

        trialPeriodExpired = Boolean(renewalDate - now < 0);
        isTrial = subscription?.is_trial;
      }

      if (!isFreePlan && !isTrial && !trialPeriodExpired) {
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
        await sendLimitAboutToReach(
          `https://${slug}.monday.com/apps/installed_apps/10050849?billing`,
          [template.email_address, adminDetails?.user_email]
        );
      }

      if (itemSentList?.[0]?.totalCount === 15) {
        await sendLimitReached(
          `https://${slug}.monday.com/apps/installed_apps/10050849?billing`,
          [template.email_address, adminDetails?.user_email]
        );
      }

      if (itemSentList.length === 0 || itemSentList?.[0]?.totalCount < 15) {
        return next();
      }

      if (itemSentList?.[0]?.totalCount >= 15) {
        await updateStatusColumn({
          itemId: itemId,
          boardId: template.board_id,
          columnId: template?.status_column_id,
          columnValue: 'Limit Reached',
          userId: template?.user_id,
          accountId: template?.account_id,
        });
        return res
          .json({
            message: 'Trial usage limit reached',
          })
          .status(402);
      }
    }
  } catch (error) {
    return next(error);
  }
};

module.exports = { validateTrial };
