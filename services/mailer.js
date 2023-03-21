const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const {
  requestSignature,
  signedDocument,
  emailVerification,
} = require('../utils/emailTemplates/templates');
const { updateStatusColumn, getEmailColumnValue } = require('./monday.service');
const { setMondayToken } = require('../utils/monday');
const statusMapper = require('../config/statusMapper');
const { HOST } = require('../config/config');
const ApplicationModel = require('../models/Application.model');
const {
  backOfficeSentDocument,
  backOffice5DocumentSent,
} = require('./backoffice.service');
const { default: mongoose } = require('mongoose');

config.update({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

let ses = new SES({ apiVersion: '2012-08-10' });

// create Nodemailer SES transporter
let transporter = nodemailer.createTransport({
  SES: ses,
});

const sendRequestToSign = async ({ template, to, itemId, fileId }) => {
  return await transporter.sendMail({
    from: `${template.sender_name} - via GetSign <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `${template.file_name} - Signature requested by ${template.sender_name}`,
    html: requestSignature({
      requestedBy: {
        name: template.sender_name,
        email: template.email_address,
      },
      documentName: template.file_name,
      message: template.message,
      url: `${HOST}/sign/${itemId}/${fileId}?receiver=true`,
    }),
  });
};

const sendSignedDocuments = async (document, to) => {
  return await transporter.sendMail({
    from: `${document.senderName} - via GetSign <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `You just signed ${document.name}`,
    html: signedDocument({
      documentName: document.name,
      url: `${HOST}/download/${document.fileId}`,
    }),
    attachments: [
      {
        filename: document.name,
        path: document.file,
      },
    ],
  });
};

const sendVerificationEmail = async (token, to) => {
  return await transporter.sendMail({
    from: `GetSign <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `Verify your email address`,
    html: emailVerification(`${HOST}/verify-email/${token}`),
  });
};

module.exports = {
  emailVerification: async (token, to) => {
    try {
      return await sendVerificationEmail(token, to);
    } catch (error) {
      throw error;
    }
  },
  emailRequestToSign: async (itemId, id) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const template = await FileDetails.findById(id);
      if (!template) throw new Error('No file with such ID');

      if (!template?.is_email_verified) {
        throw {
          statusCode: 403,
          message: 'Email is not verified',
        };
      }

      await setMondayToken(template.user_id, template.account_id);
      const emailColumn = await getEmailColumnValue(
        itemId,
        template.email_column_id
      );
      const to = emailColumn?.data?.items?.[0]?.column_values?.[0]?.text;

      //clear viewed status if already sent
      await FileHistory.deleteOne({
        fileId: id,
        itemId,
        status: 'viewed',
      });

      const addedHistory = await FileHistory.findOne({
        fileId: id,
        itemId,
        status: 'sent',
      })
        .session(session)
        .exec();

      const newSentHistory = await FileHistory.create(
        [
          {
            fileId: id,
            status: addedHistory ? 'resent' : 'sent',
            itemId,
            sentToEmail: to,
          },
        ],
        { session }
      );

      const mailStatus = await sendRequestToSign({
        template,
        to,
        itemId,
        fileId: newSentHistory[0]._id,
      });

      if (mailStatus?.messageId) {
        await updateStatusColumn({
          itemId: itemId,
          boardId: template.board_id,
          columnId: template?.status_column_id,
          columnValue: statusMapper[newSentHistory[0].status],
          userId: template?.user_id,
          accountId: template?.account_id,
        });

        const appInstallDetails = await ApplicationModel.findOne({
          type: 'install',
          account_id: template.account_id,
        }).sort({ created_at: 'desc' });

        if (appInstallDetails?.back_office_item_id) {
          await backOfficeSentDocument(appInstallDetails.back_office_item_id);
        }

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

        if (itemSentList[0].totalCount === 5) {
          await backOffice5DocumentSent(appInstallDetails.back_office_item_id);
        }

        await session.commitTransaction();
        return mailStatus;
      }

      await session.abortTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  },
  sendFinalContract: async (file, to) => {
    try {
      return await sendSignedDocuments(file, to);
    } catch (error) {
      throw err;
    }
  },
};
