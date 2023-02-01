const nodemailer = require('nodemailer');
const { config, SES } = require('aws-sdk');
const FileHistory = require('../modals/FileHistory');
const FileDetails = require('../modals/FileDetails');

config.update({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

let params = {
  Destination: {
    ToAddresses: ['binaya@jetpackapps.co'], //Recivers emails
  },
  Message: {
    Body: {
      //   Html: {
      //     Charset: 'UTF-8',
      //     Data: html_email // Email as a html
      //   },
      Text: {
        Charset: 'UTF-8',
        Data: 'This is a test email', // Email as a text for email clients dose not support html
      },
    },
    Subject: {
      Charset: 'UTF-8',
      Data: 'Test Email', // Message Subject
    },
  },
  Source: process.env.EMAIL_USERNAME, // Sender Email
};

let ses = new SES({ apiVersion: '2012-08-10' });

// create Nodemailer SES transporter
let transporter = nodemailer.createTransport({
  SES: ses,
});

module.exports = {
  sendEmail: async (id, to) => {
    const fromFileHistory = await FileHistory.findById(id);
    const parsedFileHistory = fromFileHistory.toJSON();

    let fileDetails;

    if (parsedFileHistory?.fileId) {
      const query = await FileDetails.findById(parsedFileHistory?.fileId);
      fileDetails = query.toJSON();
    }

    transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to,
      subject: fileDetails.email_title,
      text: `${fileDetails.sender_name} (${fileDetails.email_address}) has requested a signature
      link: https://https://jetsign.jtpk.app/sign/${id}?receiver=true
      Document: ${fileDetails.file_name}
      Message from ${fileDetails.sender_name}: ${fileDetails.message}
      `,
    });
  },
};
