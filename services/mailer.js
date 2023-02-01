const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileHistory = require('../modals/FileHistory');
const FileDetails = require('../modals/FileDetails');
const { addFileHistory } = require('./fileHistory');

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
      const fromFileHistory = await FileHistory.findById(id);
      if (!fromFileHistory) throw new Error('No file with such ID');
      const parsedFileHistory = fromFileHistory.toJSON();

      let fileDetails;

      if (parsedFileHistory?.fileId) {
        const query = await FileDetails.findById(parsedFileHistory?.fileId);
        fileDetails = query.toJSON();
      }

      const addedHistory = await addFileHistory({
        id: parsedFileHistory.fileId,
        status: 'sent',
      });

      if (addedHistory?._id) {
        return await transporter.sendMail({
          from: process.env.EMAIL_USERNAME,
          to,
          subject: fileDetails.email_title,
          text: `${fileDetails.sender_name} (${fileDetails.email_address}) has requested a signature
        link: https://jetsign.jtpk.app/sign/${addedHistory?._id}?receiver=true
        Document: ${fileDetails.file_name}
        Message from ${fileDetails.sender_name}: ${fileDetails.message}
        `,
        });
      }
    } catch (err) {
      throw err;
    }
  },
};
