const generateService = require('../services/generate.service');

const uploadDocument = async (req, res, next) => {
  try {
    const result = await generateService.uploadDocumentToGeneratePDF(req);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

const getTemplates = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const result = await generateService.templates(boardId);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

const removeTemplate = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const result = await generateService.removeTemplate(fileId);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadDocument,
  getTemplates,
  removeTemplate,
};
