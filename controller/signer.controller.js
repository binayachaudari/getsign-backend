const signerService = require('../services/signers.service');
const FileHistory = require('../models/FileHistory');
const { loadFileDetails } = require('../services/s3');
const fileHistoryService = require('../services/fileHistory');
const { Types } = require('mongoose');

const {
  updateMultipleTextColumnValues,
  uploadContract,
  getEmailColumnValue,
  getUsersByIds,
  updateStatusColumn,
} = require('../services/monday.service');
const STANDARD_FIELDS = require('../config/standardFields');
const ApplicationModel = require('../models/Application.model');
const { backOfficeDocumentSigned } = require('../services/backoffice.service');
const { setMondayToken } = require('../utils/monday');
const { default: mongoose } = require('mongoose');
const SignerModel = require('../models/Signer.model');
const FileDetails = require('../models/FileDetails');

const createSigner = async (req, res, next) => {
  try {
    const signerDetails = req.body;
    const signer = await signerService.createSigner(signerDetails);
    return res.json({ data: signer }).status(200);
  } catch (err) {
    return next(err);
  }
};

const getSignersOrDuplicate = async (req, res, next) => {
  try {
    const { fileId, item_id } = req.params;
    let signer = await signerService.getOneSignersByFilter({
      originalFileId: Types.ObjectId(fileId),
      itemId: item_id,
    });

    let originlFileDetails = await FileDetails.findOne({ _id: fileId });

    if (!signer && originlFileDetails?.type !== 'adhoc') {
      signer = await signerService.getOneSignersByFilter({
        originalFileId: Types.ObjectId(fileId),
      });

      if (signer) {
        signer = await signerService.createSigner({
          originalFileId: Types.ObjectId(fileId),
          itemId: item_id,
          signers:
            signer.signers?.map(sgn => {
              const { fileStatus, isSigned, ...rest } = sgn;
              return rest;
            }) || [],
          isSigningOrderRequired: signer.isSigningOrderRequired,
        });
      }
    }
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

const signPDF = async (req, res, next) => {
  const fileHistoryId = req.params.id;
  let ips = (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    ''
  ).split(',');
  const ip = ips[0].trim();
  const { status, signatures, itemId, standardFields } = req.body;
  console.log({ status });
  try {
    const fileHistory = await FileHistory.findById(fileHistoryId).populate(
      'fileId'
    );

    if (!fileHistory) throw new Error('File History not found !');

    const template = fileHistory.fileId; // assigns linked FileDetail doc to template variable.

    let signers = await signerService.getOneSignersByFilter({
      originalFileId: template._id,
      itemId,
    });

    let pdfSigners = signers.signers || [];
    const indexOfCurrentSigner = pdfSigners.findIndex(
      signer => signer.fileStatus === fileHistoryId
    );

    let signerEmail;
    let currentSigner;

    if (indexOfCurrentSigner > -1) {
      currentSigner = pdfSigners[indexOfCurrentSigner];

      await setMondayToken(template.user_id, template.account_id);

      if (currentSigner.emailColumnId && !currentSigner.userId) {
        const currentSignerEmailRes = await getEmailColumnValue(
          itemId,
          currentSigner.emailColumnId
        );
        signerEmail =
          currentSignerEmailRes?.data?.items?.[0]?.column_values?.[0]?.text;
      }

      if (currentSigner.userId) {
        const userResp = await getUsersByIds(currentSigner.userId);
        signerEmail = userResp?.data?.users?.[0]?.email;
      }
    }

    let file;
    // takes the latest signed file if already signed else takes original file
    if (signers.file) {
      file = signers.file;
    } else {
      file = template.file;
    }

    if (standardFields?.length) {
      let fields = [];
      fields = [...standardFields]?.filter(
        field =>
          (field.itemId === STANDARD_FIELDS.textBox ||
            field.itemId === STANDARD_FIELDS.status) &&
          Boolean(field?.column?.value)
      );

      updateMultipleTextColumnValues({
        itemId,
        boardId: template?.board_id,
        userId: template?.user_id,
        accountId: template?.account_id,
        standardFields: [...fields],
      });
    }

    const lineItemFields =
      template?.fields?.filter(field => field.itemId === 'line-item') || [];

    // Modify the PDF to put the standard fields data and signatures.
    let signedPDF = await fileHistoryService.multipleSignerAddFileHistory({
      id: template._id,
      itemId,
      status,
      interactedFields: [...signatures, ...standardFields, ...lineItemFields],
      ipAddress: ip,
      s3fileKey: file,
      fileHistory,
    });

    signedPDF = await fileHistoryService.updateOne(
      { _id: signedPDF._id },
      { sentToEmail: signerEmail }
    );

    pdfSigners = pdfSigners.map(signer => {
      if (signer.fileStatus === fileHistoryId) {
        return {
          ...signer,
          isSigned: true,
        };
      } else {
        return signer;
      }
    });

    signers.signers = pdfSigners;
    signers.file = signedPDF.file;
    await signers.save(); // Update Signers.

    // upload the PDF to Board
    const finalFile = await fileHistoryService.getFinalContract(
      signedPDF._id,
      true
    );

    // Commenting update Status Column for now.

    // await updateStatusColumn({
    //   itemId: itemId,
    //   boardId: template.board_id,
    //   columnId: template?.status_column_id,
    //   columnValue: 'Completed',
    //   userId: template?.user_id,
    //   accountId: template?.account_id,
    // });

    const appInstallDetails = await ApplicationModel.findOne({
      type: 'install',
      account_id: template.account_id,
    }).sort({ created_at: 'desc' });

    if (appInstallDetails?.back_office_item_id) {
      await backOfficeDocumentSigned(appInstallDetails.back_office_item_id);
    }

    const hasAllSigned = pdfSigners.every(signer => signer.isSigned);
    if (hasAllSigned) {
      await uploadContract({
        itemId,
        boardId: template.board_id,
        columnId: template?.file_column_id,
        file: finalFile,
        userId: template?.user_id,
        accountId: template?.account_id,
      });

      await updateStatusColumn({
        itemId: itemId,
        boardId: template.board_id,
        columnId: template?.status_column_id,
        columnValue: 'Completed',
        userId: template?.user_id,
        accountId: template?.account_id,
      });
    }

    if (
      signers.isSigningOrderRequired &&
      indexOfCurrentSigner > -1 &&
      indexOfCurrentSigner < pdfSigners.length - 1 &&
      !hasAllSigned
    ) {
      const indexOfNextSigner = indexOfCurrentSigner + 1;
      const nextSigner = pdfSigners[indexOfNextSigner];

      let email;
      await setMondayToken(template.user_id, template.account_id);

      if (nextSigner.emailColumnId && !nextSigner?.isSigned) {
        const nextSignerEmailRes = await getEmailColumnValue(
          itemId,
          nextSigner.emailColumnId
        );
        email = nextSignerEmailRes?.data?.items?.[0]?.column_values?.[0]?.text;
      }

      if (nextSigner.userId && !nextSigner?.isSigned) {
        const userResp = await getUsersByIds(nextSigner.userId);
        email = userResp?.data?.users?.[0]?.email;
      }

      if (email) {
        const session = await mongoose.startSession();
        session.startTransaction();

        const newHistory = await signerService.deletePreviousStatusAndSend({
          fileId: template._id,
          email,
          session,
          itemId,
        });

        await signerService.sendEmailAndUpdateBackOffice({
          itemId,
          newSentHistory: newHistory,
          session,
          template,
          to: email,
        });

        pdfSigners[indexOfNextSigner].fileStatus =
          newHistory[0]._id?.toString();

        await SignerModel.findOneAndUpdate(
          { _id: signers._id },
          { signers: pdfSigners },
          { new: 1 }
        );
      }
    }

    return res.status(200).json({ data: 'All good' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSigner,
  getSignersOrDuplicate,
  getSignerByFileId,
  updateSigner,
  sendMail,
  signPDF,
};
