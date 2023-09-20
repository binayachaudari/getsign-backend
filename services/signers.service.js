const { mongoose } = require('mongoose');
const statusMapper = require('../config/statusMapper');
const ApplicationModel = require('../models/Application.model');
const FileHistory = require('../models/FileHistory');
const SignerModel = require('../models/Signer.model');
const {
  backOfficeSentDocument,
  backOffice5DocumentSent,
  backOfficeUpdateTotalSent,
  backOfficeUpadateLastDocSentDate,
} = require('./backoffice.service');
const { getEmailColumnValue, updateStatusColumn } = require('./monday.service');
const FileDetails = require('../models/FileDetails');
const { setMondayToken } = require('../utils/monday');
const { sendRequestToSign } = require('../services/mailer');

const createSigner = async signerDetails => {
  try {
    const signer = await SignerModel.create(signerDetails);
    return signer;
  } catch (err) {
    throw err;
  }
};

const getSigners = async signerId => {
  try {
    const signer = await SignerModel.findById(signerId);
    return signer;
  } catch (err) {
    throw err;
  }
};

const getSignerByFileId = async fileId => {
  try {
    const signer = await SignerModel.findOne({ originalFileId: fileId });
    return signer;
  } catch (err) {
    throw err;
  }
};

const getOneSignersByFilter = async (filter = {}) => {
  try {
    const signer = await SignerModel.findOne({ ...filter });
    return signer;
  } catch (err) {}
};

const updateSigner = async (signerId, signerDetails) => {
  try {
    const signer = await SignerModel.findByIdAndUpdate(signerId, signerDetails);
    return signer;
  } catch (err) {
    throw err;
  }
};

const deletePreviousStatusAndSend = async ({
  fileId,
  email,
  session,
  itemId,
}) => {
  try {
    //clear viewed status if already sent
    await FileHistory.deleteMany({
      fileId: fileId,
      itemId,
      status: 'viewed',
      sentToEmail: email,
    })
      .session(session)
      .exec();

    const isAlreadySent = await FileHistory.findOne({
      fileId: fileId,
      itemId,
      status: 'sent',
      sentToEmail: email,
    })
      .session(session)
      .exec();

    const newSentHistory = await FileHistory.create(
      [
        {
          fileId: fileId,
          status: isAlreadySent ? 'resent' : 'sent',
          itemId,
          sentToEmail: email,
        },
      ],
      { session }
    );

    return newSentHistory;
  } catch (error) {
    throw error;
  }
};

const sendEmailAndUpdateBackOffice = async ({
  template,
  to,
  itemId,
  newSentHistory,
  session,
}) => {
  const mailStatus = await sendRequestToSign({
    template,
    to,
    itemId,
    fileId: newSentHistory[0]._id,
  });

  if (mailStatus?.messageId) {
    const appInstallDetails = await ApplicationModel.findOne({
      type: 'install',
      account_id: template.account_id,
    }).sort({ created_at: 'desc' });

    const itemSentList = await FileDetails.aggregate([
      {
        $match: {
          account_id: template?.account_id.toString(),
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
          'filehistories.status': 'sent',
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
    ]).session(session);

    await updateStatusColumn({
      itemId: itemId,
      boardId: template.board_id,
      columnId: template?.status_column_id,
      columnValue: statusMapper[newSentHistory[0].status],
      userId: template?.user_id,
      accountId: template?.account_id,
    });

    if (appInstallDetails?.back_office_item_id) {
      await backOfficeSentDocument(appInstallDetails.back_office_item_id);

      if (itemSentList[0].totalCount >= 5) {
        await backOffice5DocumentSent(appInstallDetails.back_office_item_id);
      }
      // Update count if status is sent
      await backOfficeUpdateTotalSent(
        appInstallDetails.back_office_item_id,
        itemSentList[0].totalCount
      );
      await backOfficeUpadateLastDocSentDate(
        appInstallDetails.back_office_item_id
      );
    }

    await session.commitTransaction();
    return mailStatus;
  }

  await session.abortTransaction();
  session.endSession();
};

const sendFileForMultipleSigners = async ({ itemId, fileId, message = '' }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const template = await FileDetails.findById(fileId);
    if (message) {
      template.message = message;
      await template.save();
    }

    if (!template) throw new Error('No file with such ID');

    if (!template?.is_email_verified) {
      throw {
        statusCode: 403,
        message: 'Email is not verified',
      };
    }

    await setMondayToken(template.user_id, template.account_id);
    const signerDetails = await SignerModel.findOne({
      originalFileId: fileId,
    });

    if (signerDetails?.isSigningOrderRequired) {
      // send file to only first signer
      const emailColumn = signerDetails?.signers?.filter(
        signer => !signer?.isSigned
      )?.[0]?.emailColumnId;

      const emailColumnValue = await getEmailColumnValue(itemId, emailColumn);
      const email =
        emailColumnValue?.data?.items?.[0]?.column_values?.[0]?.text;

      if (email) {
        const newHistory = await deletePreviousStatusAndSend({
          fileId,
          email,
          session,
          itemId,
        });

        await sendEmailAndUpdateBackOffice({
          itemId,
          newSentHistory: newHistory,
          session,
          template,
          to: email,
        });

        const indexOfEmailColumn = signerDetails?.signers?.findIndex(
          signer => signer?.emailColumnId === emailColumn
        );

        signerDetails.signers[indexOfEmailColumn].fileStatus =
          newHistory[0]._id;
        await signerDetails.save();
        return signerDetails;
      }
    } else {
      // send file to all the signers
      const emailColumns = signerDetails?.signers?.map(
        emailCol => emailCol.emailColumnId
      );
      const emailColumnValue = await getEmailColumnValue(itemId, emailColumns);
      const emailList = emailColumnValue?.data?.items?.[0]?.column_values?.map(
        value => ({ email: value?.text, id: value?.id })
      );

      for (const emailDetail of emailList) {
        if (!emailDetail?.email) continue;
        const newHistory = await deletePreviousStatusAndSend({
          fileId,
          email: emailDetail.email,
          session,
          itemId,
        });

        await sendEmailAndUpdateBackOffice({
          itemId,
          newSentHistory: newHistory,
          session,
          template,
          to: emailDetail.email,
        });

        const indexOfEmailColumn = signerDetails?.signers?.findIndex(
          signer => signer?.emailColumnId === emailDetail?.id
        );

        signerDetails.signers[indexOfEmailColumn].fileStatus =
          newHistory[0]._id;
        await signerDetails.save();
        return signerDetails;
      }
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

module.exports = {
  createSigner,
  getSigners,
  getSignerByFileId,
  updateSigner,
  sendFileForMultipleSigners,
  getOneSignersByFilter,
  deletePreviousStatusAndSend,
  sendEmailAndUpdateBackOffice,
};
