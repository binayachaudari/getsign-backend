const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const {
  addFormFields,
  generatePDF,
  addSenderDetails,
} = require('../services/file');
const {
  addFileHistory,
  getFileHistory,
  viewedFile,
  getFileToSign,
  getFinalContract,
} = require('../services/fileHistory');
const { emailRequestToSign, sendFinalContract } = require('../services/mailer');
const { uploadFile, getFile, deleteFile } = require('../services/s3');

module.exports = {
  uploadFile: async (req, res, next) => {
    try {
      const result = await uploadFile(req);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
  getFile: async (req, res, next) => {
    const id = req.params.id;

    try {
      const result = await getFile(id);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
  updateFields: async (req, res, next) => {
    const id = req.params.id;
    const { fields } = req.body;
    try {
      const result = await addFormFields(id, fields);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
  deleteFile: async (req, res, next) => {
    const id = req.params.id;
    try {
      const result = await deleteFile(id);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
  generatePDF: async (req, res, next) => {
    const { id, fields } = req.body;
    try {
      const result = await generatePDF(id, fields);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  addSenderDetails: async (req, res, next) => {
    const id = req.params.id;
    const {
      sender_name,
      email_address,
      email_title,
      message,
      email_column_id,
      status_column_id,
    } = req.body;

    try {
      const result = await addSenderDetails(id, {
        sender_name,
        email_address,
        email_title,
        message,
        email_column_id,
        status_column_id,
      });

      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  addSignature: async (req, res, next) => {
    const id = req.params.id;
    let ips = (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      ''
    ).split(',');

    const ip = ips[0].trim();
    const { status, signatures, itemId, values } = req.body;
    try {
      const result = await addFileHistory({
        id,
        itemId,
        status,
        signatures,
        values,
        ipAddress: ip,
      });

      if (result.status === 'signed_by_receiver') {
        const finalFile = await getFinalContract(result._id);
        const fileDetails = await FileDetails.findById(result.fileId);
        const receiverEmail = await FileHistory.findOne({
          fileId: result.fileId,
          itemId: result.itemId,
          status: 'sent',
        });
        await sendFinalContract(
          { file: finalFile.file, name: fileDetails.file_name },
          [fileDetails.email_address, receiverEmail.sentToEmail]
        );
      }
      return res.json({ data: { ...result } }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getFileHistory: async (req, res, next) => {
    const { itemId, id } = req.params;
    try {
      const result = await getFileHistory(itemId, id);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  sendPDF: async (req, res, next) => {
    const { itemId, id } = req.params;
    const { to } = req.body;
    try {
      const result = await emailRequestToSign(itemId, id, to);
      return res.json({ data: result }).status(200);
    } catch (error) {
      console.log(error);
      next(error);
    }
  },

  viewedPDF: async (req, res, next) => {
    const { itemId, id } = req.params;
    let ips = (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      ''
    ).split(',');

    const ip = ips[0].trim();
    try {
      const result = await viewedFile(id, itemId, ip);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getFileForReceiver: async (req, res, next) => {
    // fileHistory id having status = 'sent'
    const { itemId, id } = req.params;
    try {
      const result = await getFileToSign(id, itemId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getContract: async (req, res, next) => {
    const { id } = req.params;
    try {
      const result = await getFinalContract(id);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
};
