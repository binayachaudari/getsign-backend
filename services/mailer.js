const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileDetails = require('../modals/FileDetails');
const { addFileHistory, getFileHistory } = require('./fileHistory');
const FileHistory = require('../modals/FileHistory');

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

const sendSimpleEmail = async ({ template, to, itemId, fileId }) => {
  return await transporter.sendMail({
    from: process.env.EMAIL_USERNAME,
    to,
    subject: template.email_title,
    text: `${template.sender_name} (${template.email_address}) has requested a signature
  link: https://jetsign.jtpk.app/sign/${itemId}/${fileId}?receiver=true
  Document: ${template.file_name}
  Message from ${template.sender_name}: ${template.message}
  `,
  });
};

module.exports = {
  sendEmail: async (itemId, id, to) => {
    const session = await FileHistory.startSession();
    session.startTransaction();

    try {
      const template = await FileDetails.findById(id);
      if (!template) throw new Error('No file with such ID');

      const addedHistory = await FileHistory.findOne({
        fileId: id,
        itemId,
        status: 'sent',
      })
        .session(session)
        .exec();

      if (addedHistory) return;

      const newSentHistory = await FileHistory.create(
        [
          {
            fileId: id,
            status: 'sent',
            itemId,
          },
        ],
        { session }
      );

      const mailStatus = await sendSimpleEmail({
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
