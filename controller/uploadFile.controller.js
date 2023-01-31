const {
  addFormFields,
  generatePDF,
  addSenderDetails,
} = require('../services/file');
const { addFileHistory } = require('../services/fileHistory');
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
    try {
      const result = await addFormFields(id, req.body);
      await addFileHistory(id, { status: req?.body?.status });
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
    const { sender_name, email_address, email_title, message } = req.body;

    try {
      const result = await addSenderDetails(id, {
        sender_name,
        email_address,
        email_title,
        message,
      });

      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
};
