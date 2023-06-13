const FileDetails = require('../models/FileDetails');
const SubscriptionModel = require('../models/Subscription.model');
const { updateStatusColumn } = require('../services/monday.service');

const validateTrial = async (req, res, next) => {
  try {
    let isTrial = true;
    let trialPeriodExpired = true;
    const { accountId } = req;
    const { itemId, id } = req.params;

    const template = await FileDetails.findById(id);

    const subscribed = await SubscriptionModel.findOne(
      {
        account_id: accountId,
      },
      null,
      { lean: true }
    );

    if (subscribed?.subscription) {
      const trialPeriodDate = new Date(subscribed?.created_at).setDate(
        new Date().getDate() + 14
      );
      trialPeriodExpired = Boolean(
        trialPeriodDate - new Date(subscribed.created_at) < 0
      );

      const renewalDate = new Date(subscribed?.subscription?.renewal_date);
      const today = new Date();
      isTrial =
        subscribed?.subscription?.is_trial || Boolean(renewalDate - today < 0);
    }

    if (!isTrial || !trialPeriodExpired) {
      return next();
    }

    const startOfMonth = new Date().setDate(
      new Date(subscribed?.created_at).getDate()
    );
    const endOfMonth = new Date(startOfMonth).setMonth(
      new Date(startOfMonth) + 1
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
                $gte: startOfMonth,
                $lte: endOfMonth,
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

    if (itemSentList[0].totalCount === 10) {
      // if sent documents count is 10; tag mailchimp
      return next();
    }

    if (itemSentList[0].totalCount === 15) {
      // if sent documents count is 15; tag mailchimp
      return next();
    }

    if (itemSentList[0].totalCount > 15) {
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
  } catch (error) {
    return next(error);
  }
};

module.exports = { validateTrial };
