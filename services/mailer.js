const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const {
  requestSignature,
  signedDocument,
} = require('../utils/emailTemplates/templates');
const { updateStatusColumn, getEmailColumnValue } = require('./monday.service');
const { setMondayToken } = require('../utils/monday');
const statusMapper = require('../config/statusMapper');

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
    from: process.env.EMAIL_USERNAME,
    to,
    subject: `${template.file_name} - Signature requested by ${template.sender_name}`,
    html: requestSignature({
      requestedBy: {
        name: template.sender_name,
        email: template.email_address,
      },
      documentName: template.file_name,
      message: template.message,
      url: `https://jetsign.jtpk.app/sign/${itemId}/${fileId}?receiver=true`,
    }),
  });
};

const sendSignedDocuments = async (document, to) => {
  return await transporter.sendMail({
    from: process.env.EMAIL_USERNAME,
    to,
    subject: `You just signed ${document.name}`,
    html: signedDocument({
      documentName: document.name,
      url: `https://jetsign.jtpk.app/download/${document.fileId}`,
    }),
    attachments: [
      {
        filename: document.name,
        path: document.file,
      },
    ],
  });
};

module.exports = {
  emailRequestToSign: async (itemId, id) => {
    const session = await FileHistory.startSession();
    session.startTransaction();

    try {
      const template = await FileDetails.findById(id);
      if (!template) throw new Error('No file with such ID');

      await setMondayToken(template.board_id);
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
        sentToEmail: to,
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
        });
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
