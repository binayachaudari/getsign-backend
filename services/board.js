const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');

const getStoredBoardFile = async (boardId, itemId) => {
  try {
    const alreadySignedFile = await FileHistory.findOne({
      itemId,
      status: { $in: ['signed_by_receiver', 'signed_by_sender'] },
    }).exec();

    if (alreadySignedFile?.fileId) {
      const doc = await FileDetails.findById(alreadySignedFile.fileId).select(
        '-email_verification_token -email_verification_token_expires'
      );
      const hasStartedSigningProcess = await FileHistory.findOne({
        fileId: doc?._id,
      });
      return {
        doc,
        alreadySignedFile: !!alreadySignedFile?._id,
        hasStartedSigningProcess: !!hasStartedSigningProcess?._id,
      };
    }
    const doc = await FileDetails.findOne({
      board_id: boardId,
      is_deleted: false,
    })
      .select('-email_verification_token -email_verification_token_expires')
      .exec();

    const hasStartedSigningProcess = await FileHistory.findOne({
      fileId: doc?._id,
    });

    return {
      doc,
      alreadySignedFile: !!alreadySignedFile?._id,
      hasStartedSigningProcess: !!hasStartedSigningProcess?.id,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = { getStoredBoardFile };
