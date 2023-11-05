const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const {
  requestSignature,
  signedDocument,
  emailVerification,
  trialLimitAboutToReach,
  limitReached,
} = require('../utils/emailTemplates/templates');
const { updateStatusColumn, getEmailColumnValue } = require('./monday.service');
const { setMondayToken } = require('../utils/monday');
const statusMapper = require('../config/statusMapper');
const { HOST } = require('../config/config');
const ApplicationModel = require('../models/Application.model');
const {
  backOfficeSentDocument,
  backOffice5DocumentSent,
  backOfficeUpdateTotalSent,
  backOfficeUpadateLastDocSentDate,
} = require('./backoffice.service');
const { default: mongoose, Types } = require('mongoose');

const aws = require('@aws-sdk/client-ses');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { findOneOrCreate } = require('./signers.service');

config.update({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

let ses = new SES({
  apiVersion: '2010-12-01',
  region: process.env.AWS_REGION,
  defaultProvider,
});

// create Nodemailer SES transporter
let transporter = nodemailer.createTransport({
  SES: { ses, aws },
});

const sendRequestToSign = async ({
  template,
  to,
  itemId,
  fileId,
  isMultipleSigner = false,
}) => {
  console.log('Inside send Request to sign ==>');
  return await transporter.sendMail({
    from: `${template.sender_name} - via GetSign <${process.env.EMAIL_USERNAME}>`,
    replyTo: template.email_address,
    to,
    subject: `Signature requested by ${template.sender_name}`,
    text: `Your signature has been requested!
    
    ${template.sender_name} has requested a signature.


    ${template?.email_title}
    Document Name: ${template.file_name}
    message: ${template.message}
    `,
    html: requestSignature({
      requestedBy: {
        name: template.sender_name || '',
        email: template.email_address || '',
      },
      documentName: template.file_name || '',
      message: template.message || '',
      emailTitle: template?.email_title || '',
      url: isMultipleSigner
        ? `${HOST}/sign/${itemId}/${fileId}`
        : `${HOST}/sign/${itemId}/${fileId}?receiver=true`,
    }),
  });
};

const sendSignedDocuments = async (document, to) => {
  let attachments = [];

  if (document?.size < 25000000) {
    attachments.push({
      filename: document.name,
      path: document.file,
    });
  }

  return await transporter.sendMail({
    from: `${document.senderName} - via GetSign <${process.env.EMAIL_USERNAME}>`,
    replyTo: document.senderEmail,
    to,
    subject: `You just signed ${document.name || ''}`,
    text: `You have successfully signed your document!
    
    You can view the document as an attachment below (if it's under 25 MB) or by clicking this link. 

    Link: ${HOST}/download/${document.fileId}

    Warning: To prevent others from accessing your document, please do not forward this email.

    Thanks,
    GetSign.
    `,
    html: signedDocument({
      documentName: document.name || '',
      url: `${HOST}/download/${document.fileId}`,
    }),
    attachments,
  });
};

const sendVerificationEmail = async (token, to) => {
  return await transporter.sendMail({
    from: `GetSign <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `Verify your email address`,
    html: emailVerification(`${HOST}/verify-email/${token}`),
    text: `Verify your email address and complete the document template set up.
    
    verificaiton-link: ${HOST}/verify-email/${token}
    
    If this verification request was not created by you, ignore it.
    
    Thanks,
    GetSign.
    `,
  });
};

const sendLimitAboutToReach = async (url, to) => {
  return await transporter.sendMail({
    from: `GetSign <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `Limit is about to be reached only five documents left`,
    html: trialLimitAboutToReach({ url }),
    text: `Hi there, 
    
    just a quick reminder about your GetSign subscription.
    Your trial subscription have a limit of 15 documents which is about to be reached. Click below to upgrade your account
    
    Upgrade: ${url}
  
    
    Thanks,
    The GetSign Team.
    `,
  });
};

const sendLimitReached = async (url, to) => {
  return await transporter.sendMail({
    from: `GetSign <${process.env.EMAIL_USERNAME}>`,
    to,
    subject: `Limit Reached`,
    html: limitReached({ url }),
    text: `Hi there, you have reached the limit of 15 documents for this month.  
    Click below to upgrade your account
    
    Upgrade: ${url}
  
    
    Thanks,
    The GetSign Team.
    `,
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
  emailRequestToSign: async (itemId, id, message = '') => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const template = await FileDetails.findById(id);

      let signerDoc = await findOneOrCreate({
        originalFileId: Types.ObjectId(id),
        itemId: Number(itemId),
      });

      console.log({ template, signerDoc });

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

      signerDoc.signers = signerDoc.signers.map(signer => {
        if (!signer.userId) {
          return {
            ...signer,
            fileStatus: newSentHistory[0]._id?.toString(),
          };
        }
        return signer;
      });

      await signerDoc.save();

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
            await backOffice5DocumentSent(
              appInstallDetails.back_office_item_id
            );
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
      throw error;
    }
  },
  sendLimitAboutToReach,
  sendLimitReached,
  sendRequestToSign,
};
