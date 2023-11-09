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
const {
  getEmailColumnValue,
  updateStatusColumn,
  getUsersByIds,
} = require('./monday.service');
const FileDetails = require('../models/FileDetails');
const { setMondayToken } = require('../utils/monday');

const { Types } = require('mongoose');

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
    const signer = await SignerModel.findOne({ ...filter }).sort({
      updated_at: -1, //gets the latest updated document for the filter
    });
    return signer;
  } catch (err) {}
};

const updateSigner = async (signerId, signerDetails) => {
  try {
    const signer = await SignerModel.findByIdAndUpdate(
      signerId,
      signerDetails,
      { new: true }
    );
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
  signerDetail,
}) => {
  try {
    let option = {};

    if (signerDetail.userId) {
      option = {
        assignedReciever: {
          userId: signerDetail.userId,
        },
      };
    } else if (!signerDetail.userId && signerDetail.emailColumnId) {
      option = {
        assignedReciever: {
          emailColumnId: signerDetail.emailColumnId,
        },
      };
    }

    //clear viewed status if already sent
    const fileHistories = await FileHistory.find({
      fileId: fileId,
      itemId,
      status: 'viewed',
      ...option,
    })
      .session(session)
      .exec();

    for (const history of fileHistories) {
      if (history?.sentToEmail === email) {
        await history.deleteOne();
      }
    }

    const isAlreadySentDocs = await FileHistory.find({
      fileId: fileId,
      itemId,
      status: 'sent',
      ...option,
    })
      .session(session)
      .exec();

    let isAlreadySent = isAlreadySentDocs?.find(
      doc => doc.sentToEmail === email
    );

    const newSentHistory = await FileHistory.create(
      [
        {
          fileId: fileId,
          status: isAlreadySent ? 'resent' : 'sent',
          itemId,
          sentToEmail: email,
          ...option,
        },
      ],
      { session }
    );

    console.log({ newSentHistory });

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
  shouldUpdateMondayStatus = true,
}) => {
  console.log('Incside send Email');
  const { sendRequestToSign } = require('../services/mailer');
  const mailStatus = await sendRequestToSign({
    template,
    to,
    itemId,
    fileId: newSentHistory[0]._id,
    isMultipleSigner: true,
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

    if (shouldUpdateMondayStatus) {
      await updateStatusColumn({
        itemId: itemId,
        boardId: template.board_id,
        columnId: template?.status_column_id,
        columnValue: statusMapper[newSentHistory[0].status],
        userId: template?.user_id,
        accountId: template?.account_id,
      });
    }

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

const extractAllEmails = async ({ template, signerDetails, itemId }) => {
  const emailColumns = signerDetails?.signers
    ?.filter(emailCol => emailCol.emailColumnId && !emailCol.userId)
    ?.map(
      emailCol => emailCol.emailColumnId // added emailCol.id temporarily
    );

  const userColumns = signerDetails?.signers
    ?.filter(emailCol => emailCol.userId)
    ?.map(
      emailCol => emailCol.userId // added emailCol.id temporarily
    );
  let emailList = [];

  try {
    await setMondayToken(template.user_id, template.account_id);

    if (emailColumns?.length) {
      const emailColumnValue = await getEmailColumnValue(itemId, emailColumns);
      const emailColRes =
        emailColumnValue?.data?.items?.[0]?.column_values?.map(
          value => value?.text
        );
      if (emailColRes?.length > 0)
        emailList = emailList.concat([...emailColRes]);
    }

    if (userColumns?.length) {
      const userColumnValue = await getUsersByIds(userColumns);

      const userColRes = userColumnValue?.data?.users?.map(user => user.email);

      if (userColRes?.length > 0) emailList = emailList.concat([...userColRes]);
    }

    return emailList;
  } catch (err) {
    return emailList;
  }
};

const findOneOrCreate = async ({ originalFileId, itemId }) => {
  let signerDetails = await getOneSignersByFilter({
    originalFileId: Types.ObjectId(originalFileId),
    itemId: Number(itemId),
  });

  if (signerDetails) return signerDetails;

  if (!signerDetails) {
    signerDetails = await getOneSignersByFilter({
      originalFileId: Types.ObjectId(originalFileId),
    });

    signerDetails = await signerDetails.populate('originalFileId');
    if (signerDetails) {
      signerDetails = await createSigner({
        originalFileId: Types.ObjectId(originalFileId),
        itemId: Number(itemId),
        signers:
          signerDetails?.signers?.map(sgn => {
            const { fileStatus = '', isSigned = false, ...rest } = sgn;
            return rest;
          }) || [],
        isSigningOrderRequired: signerDetails?.isSigningOrderRequired || false,
      });
    }
  }

  return signerDetails;
};

const sendFileForMultipleSigners = async ({ itemId, fileId, message = '' }) => {
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
    let signerDetails = await getOneSignersByFilter({
      originalFileId: Types.ObjectId(fileId),
      itemId: Number(itemId),
    });

    if (!signerDetails && template?.type !== 'adhoc') {
      signerDetails = await getOneSignersByFilter({
        originalFileId: Types.ObjectId(fileId),
      });

      if (signerDetails) {
        signerDetails = await createSigner({
          originalFileId: Types.ObjectId(fileId),
          itemId: Number(itemId),
          signers:
            signerDetails?.signers?.map(sgn => {
              const { fileStatus = '', isSigned = false, ...rest } = sgn;
              return rest;
            }) || [],
          isSigningOrderRequired:
            signerDetails?.isSigningOrderRequired || false,
        });
      }
    }

    if (signerDetails?.isSigningOrderRequired) {
      let session = await mongoose.startSession();
      session.startTransaction();
      try {
        const firstSignerDetail = signerDetails?.signers?.filter(
          signer => !signer?.isSigned
        )?.[0];

        console.log({ firstSignerDetail });

        let email;
        let indexOfEmailColumn;

        if (firstSignerDetail?.userId) {
          // const userResp = await getUsersByIds(firstSignerDetail.userId);
          email = template.email_address;
          // userResp?.data?.users?.[0]?.email;
          indexOfEmailColumn = signerDetails?.signers?.findIndex(
            signer => signer?.userId === firstSignerDetail.userId
          );
        }

        if (!firstSignerDetail?.userId && firstSignerDetail?.emailColumnId) {
          // send file to only first signer
          const emailColumn = firstSignerDetail.emailColumnId;
          const emailColumnValue = await getEmailColumnValue(
            itemId,
            emailColumn
          );
          email = emailColumnValue?.data?.items?.[0]?.column_values?.[0]?.text;
          indexOfEmailColumn = signerDetails?.signers?.findIndex(
            signer => signer?.emailColumnId === emailColumn
          );
        }
        console.log({ email });

        if (email) {
          const newHistory = await deletePreviousStatusAndSend({
            fileId,
            email,
            session,
            itemId,
            signerDetail: firstSignerDetail,
          });

          await sendEmailAndUpdateBackOffice({
            itemId,
            newSentHistory: newHistory,
            session,
            template,
            to: email,
          });

          signerDetails.signers[indexOfEmailColumn].fileStatus =
            newHistory[0]._id.toString();

          const updatedSiger = await SignerModel.findOneAndUpdate(
            { _id: signerDetails._id },
            { signers: signerDetails.signers },
            { new: true }
          );

          return updatedSiger;
        }
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      // send file to all the signers
      const emailColumns = signerDetails?.signers
        ?.filter(
          emailCol =>
            emailCol.emailColumnId && !emailCol.userId && !emailCol.isSigned
        )
        ?.map(
          emailCol => emailCol.emailColumnId // added emailCol.id temporarily
        );

      const userColumns = signerDetails?.signers
        ?.filter(emailCol => emailCol.userId && !emailCol.isSigned)
        ?.map(
          emailCol => emailCol.userId // added emailCol.id temporarily
        );

      let emailList = [];

      if (emailColumns?.length) {
        const emailColumnValue = await getEmailColumnValue(
          itemId,
          emailColumns
        );
        const emailColRes =
          emailColumnValue?.data?.items?.[0]?.column_values?.map(value => ({
            email: value?.text,
            id: value?.id,
            userCol: false,
          }));
        if (emailColRes?.length > 0)
          emailList = emailList.concat([...emailColRes]);
      }

      if (userColumns?.length) {
        const userColumnValue = await getUsersByIds(userColumns);

        const userColRes = userColumnValue?.data?.users?.map(user => ({
          id: user.id,
          email: user.email,
          userCol: true,
        }));

        if (userColRes?.length > 0)
          emailList = emailList.concat([...userColRes]);
      }

      for (const emailDetail of emailList) {
        if (!emailDetail?.email) continue;
        let session = await mongoose.startSession();
        session.startTransaction();

        let signerDetail = {};

        if (emailDetail?.userCol) {
          signerDetail.userId = emailDetail.id;
        } else if (!emailDetail?.userCol) {
          signerDetail.emailColumnId = emailDetail.id;
        }
        try {
          const newHistory = await deletePreviousStatusAndSend({
            fileId,
            email: emailDetail.email,
            session,
            itemId,
            signerDetail,
          });

          await sendEmailAndUpdateBackOffice({
            itemId,
            newSentHistory: newHistory,
            session,
            template,
            to: emailDetail.email,
          });

          const indexOfEmailColumn = signerDetails?.signers?.findIndex(
            signer =>
              (Number(signer?.userId) || signer?.emailColumnId) ===
              emailDetail?.id // added emailCol.id temporarily
          );

          if (indexOfEmailColumn > -1) {
            signerDetails.signers[indexOfEmailColumn].fileStatus =
              newHistory[0]._id.toString();

            const updatedSigner = await SignerModel.findOneAndUpdate(
              { _id: signerDetails._id },
              { signers: signerDetails.signers }
            );
          }
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }

      return SignerModel.findById(signerDetails._id);
    }
  } catch (err) {
    console.log({ err });
    throw err;
  }
};

const resendMail = async ({ fileId, itemId }) => {};
module.exports = {
  createSigner,
  getSigners,
  getSignerByFileId,
  updateSigner,
  sendFileForMultipleSigners,
  getOneSignersByFilter,
  deletePreviousStatusAndSend,
  sendEmailAndUpdateBackOffice,
  extractAllEmails,
  resendMail,
  findOneOrCreate,
};
