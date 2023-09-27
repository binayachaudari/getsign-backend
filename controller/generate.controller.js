const {
  templates,
  uploadDocumentToGeneratePDF,
} = require('../services/generate.service');

const uploadDocument = async (req, res, next) => {
  try {
    const result = await uploadDocumentToGeneratePDF(req);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

const getTemplates = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const result = await templates(boardId);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadDocument,
  getTemplates,
};
