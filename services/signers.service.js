const SignerModel = require('../models/Signer.model');

const createSigner = async signerDetails => {
  try {
    const signer = await SignerModel.create(signerDetails);
    return signer;
  } catch (err) {
    throw err;
  }
};

const getSigners = async signerId => {
  try {
    const signer = await SignerModel.findById(signerId);
    return signer;
  } catch (err) {
    throw err;
  }
};

const getSignerByFileId = async fileId => {
  try {
    const signer = await SignerModel.findOne({ originalFileId: fileId });
    return signer;
  } catch (err) {
    throw err;
  }
};

const updateSigner = async (signerId, signerDetails) => {
  try {
    const signer = await SignerModel.findByIdAndUpdate(signerId, signerDetails);
    return signer;
  } catch (err) {
    throw err;
  }
};

// const sendFileForNextSigner = async (fileId, signerId) => {
//   try {
//     const document = await SignerModel.findOne({ originalFileId: fileId });

//     // find last signed user
//     // send file to next user
//     // update status of last signed user
//   } catch (err) {r
//     throw err;
//   }
// };

module.exports = {
  createSigner,
  getSigners,
  getSignerByFileId,
  updateSigner,
};
