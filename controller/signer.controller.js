const signerService = require('../services/signers.service');

const createSigner = async signerDetails => {
  try {
    const signer = await signerService.createSigner(signerDetails);
    return signer;
  } catch (err) {
    throw err;
  }
};

const getSigners = async signerId => {
  try {
    const signer = await signerService.getSigners(signerId);
    return signer;
  } catch (err) {
    throw err;
  }
};

const getSignerByFileId = async fileId => {
  try {
    const signer = await signerService.getSignerByFileId(fileId);
    return signer;
  } catch (err) {
    throw err;
  }
};

const updateSigner = async (signerId, signerDetails) => {
  try {
    const signer = await signerService.updateSigner(signerId, signerDetails);
    return signer;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  createSigner,
  getSigners,
  getSignerByFileId,
  updateSigner,
};
