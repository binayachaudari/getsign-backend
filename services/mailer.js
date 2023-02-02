const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileDetails = require('../modals/FileDetails');
const { addFileHistory, getFileHistory } = require('./fileHistory');

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

module.exports = {
  sendEmail: async (id, to) => {
    try {
      let fileId;
      const template = await FileDetails.findById(id);
      if (!template) throw new Error('No file with such ID');

      const shouldUseFileHistoryId = template?.fields?.filter(
        (item) => item.title === 'Sender Signature'
      )?.length;

      if (shouldUseFileHistoryId) {
        const history = await getFileHistory(id);
        fileId = history?.find(
          (item) => item.status === 'signed_by_sender'
        )?.id;
      }

      fileId = template.id;
      const addedHistory = await addFileHistory({
        id: template.id,
        status: 'sent',
      });

      if (addedHistory?.id) {
        return await transporter.sendMail({
          from: process.env.EMAIL_USERNAME,
          to,
          subject: template.email_title,
          text: `${template.sender_name} (${template.email_address}) has requested a signature
        link: https://jetsign.jtpk.app/sign/${fileId}?receiver=true
        Document: ${template.file_name}
        Message from ${template.sender_name}: ${template.message}
        `,
        });
      }
    } catch (err) {
      throw err;
    }
  },
};
