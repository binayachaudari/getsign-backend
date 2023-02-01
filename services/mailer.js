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

      const parsedTemplate = template.toJSON();

      const shouldUseFileHistoryId = parsedTemplate?.fields?.filter(
        (item) => item.title === 'Sender Signature'
      )?.length;

      if (shouldUseFileHistoryId) {
        const history = await getFileHistory(parsedTemplate?._id);
        const parsedHistory = history.toJSON();
        fileId = parsedHistory?.find(
          (item) => item.title === 'Sender Signature'
        )?._id;
      }

      fileId = parsedTemplate?._id;

      const addedHistory = await addFileHistory({
        id: parsedTemplate._id,
        status: 'sent',
      });

      if (addedHistory?._id) {
        return await transporter.sendMail({
          from: process.env.EMAIL_USERNAME,
          to,
          subject: parsedTemplate.email_title,
          text: `${parsedTemplate.sender_name} (${parsedTemplate.email_address}) has requested a signature
        link: https://jetsign.jtpk.app/sign/${fileId}?receiver=true
        Document: ${parsedTemplate.file_name}
        Message from ${parsedTemplate.sender_name}: ${parsedTemplate.message}
        `,
        });
      }
    } catch (err) {
      throw err;
    }
  },
};
