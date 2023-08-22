const adhocService = require('../services/adhoc.service');
const mailService = require('../services/mailer');

const addSenderDetails = async (req, res, next) => {
  try {
    const body = req.body;
    const details = await adhocService.addSenderDetails(body);

    return res
      .json({
        data: details,
      })
      .status(200);
  } catch (error) {
    next(error);
  }
};

const uploadAdhocDocument = async (req, res, next) => {
  try {
    const result = await adhocService.uploadAdhocDocument(req);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

const requestSignature = async (req, res, next) => {
  try {
    const { itemId, id } = req.params;
    const { message } = req.query;
    const result = await mailService.emailRequestToSign(itemId, id, message);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const result = await adhocService.deleteFile(fileId);
    return res.json({ data: result }).status(200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addSenderDetails,
  uploadAdhocDocument,
  requestSignature,
  deleteFile,
};
