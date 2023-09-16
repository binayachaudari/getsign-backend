const signerService = require('../services/signers.service');

const createSigner = async (req, res, next) => {
  try {
    const signerDetails = req.body;
    const signer = await signerService.createSigner(signerDetails);
    return res.json({ data: signer }).status(200);
  } catch (err) {
    return next(err);
  }
};

const getSigners = async (req, res, next) => {
  try {
    const { signerId } = req.params;
    const signer = await signerService.getSigners(signerId);
    return res.json({ data: signer }).status(200);
  } catch (err) {
    return next(err);
  }
};

const getSignerByFileId = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const signer = await signerService.getSignerByFileId(fileId);
    return res.json({ data: signer }).status(200);
  } catch (err) {
    return next(err);
  }
};

const updateSigner = async (req, res, next) => {
  try {
    const { signerId } = req.params;
    const signerDetails = req.body;
    const signer = await signerService.updateSigner(signerId, signerDetails);
    return res.json({ data: signer }).status(200);
  } catch (err) {
    return next(err);
  }
};

const sendMail = async (req, res, next) => {
  try {
    const { itemId, id } = req.params;
    const sentFile = await signerService.sendFileForMultipleSigners({
      fileId: id,
      itemId,
    });
    return res.json({ data: sentFile }).status(200);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createSigner,
  getSigners,
  getSignerByFileId,
  updateSigner,
  sendMail,
};
