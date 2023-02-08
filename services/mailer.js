const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileDetails = require('../modals/FileDetails');
const { addFileHistory, getFileHistory } = require('./fileHistory');
const FileHistory = require('../modals/FileHistory');
const { requestSignature } = require('../utils/emailTemplates/templates');

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
    subject: template.email_title,
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

module.exports = {
  emailRequestToSign: async (itemId, id, to) => {
    const session = await FileHistory.startSession();
    session.startTransaction();

    try {
      const template = await FileDetails.findById(id);
      if (!template) throw new Error('No file with such ID');

      const addedHistory = await FileHistory.findOne({
        fileId: id,
        itemId,
        sentToEmail: to,
        status: 'sent',
      })
        .session(session)
        .exec();

      if (addedHistory) return { message: 'Request already sent!' };

      const newSentHistory = await FileHistory.create(
        [
          {
            fileId: id,
            status: 'sent',
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
};
