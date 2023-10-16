const signerService = require('../services/signers.service');
const FileHistory = require('../models/FileHistory');
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
const statusMapper = require('../config/statusMapper');
const { sendFinalContract } = require('../services/mailer');

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

    if (signer) return res.json({ data: signer }).status(200);

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
            signer?.signers?.map(sgn => {
              const { fileStatus = '', isSigned = false, ...rest } = sgn;
              return rest;
            }) || [],
          isSigningOrderRequired: signer?.isSigningOrderRequired || false,
        });
      }
    }

    if (!signer && originlFileDetails?.type === 'adhoc') {
      signer = await signerService.createSigner({
        originalFileId: Types.ObjectId(fileId),
        itemId: item_id,
        signers: [],
        isSigningOrderRequired: signer?.isSigningOrderRequired || false,
      });
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

    const message = req?.query?.message || '';

    const sentFile = await signerService.sendFileForMultipleSigners({
      fileId: id,
      itemId,
      message,
    });

    return res.json({ data: sentFile }).status(200);
  } catch (err) {
    return next(err);
  }
};

const resendMail = async (req, res, next) => {
  try {
    const { itemId, id } = req.params;
    /*
    1. Get the Signer Doc.
    2. |- Signing Order not required -> For Each signer in doc that have not signed delete the Filehistory of the signer that has viewed status and create a new Filehistory with resent status.-> Send mail to each signer that satisfies previous condition.
       |- Signing Order required -> Get the first signer that has not signed document and delete the Filehistory of the signer that has viewed status and create a new Filehistory with resent status. -> Send mail to that signer.
    */
    let signerDetails = await signerService.getOneSignersByFilter({
      originalFileId: Types.ObjectId(id),
      itemId: Number(itemId),
    });

    if (!signerDetails) {
      signerDetails = await signerService.findOneOrCreate({
        originalFileId: Types.ObjectId(id),
        itemId: Number(itemId),
      });
    }

    signerDetails = await signerDetails.populate('originalFileId');
    const template = signerDetails.originalFileId;

    delete signerDetails.originalFileId;

    signerDetails.originalFileId = Types.ObjectId(id);

    await setMondayToken(template.user_id, template.account_id);

    if (signerDetails.isSigningOrderRequired) {
      let session = await mongoose.startSession();
      session.startTransaction();
      try {
        const firstSignerDetail = signerDetails?.signers?.filter(
          signer => !signer?.isSigned
        )?.[0];
        let email;
        let indexOfEmailColumn;

        if (firstSignerDetail?.userId) {
          const userResp = await getUsersByIds(firstSignerDetail.userId);
          email = userResp?.data?.users?.[0]?.email;
          indexOfEmailColumn = signerDetails?.signers?.findIndex(
            signer => signer?.userId === firstSignerDetail.userId
          );
        }

        if (!firstSignerDetail?.userId && firstSignerDetail?.emailColumnId) {
          const emailColumn = firstSignerDetail.emailColumnId;
          const emailColumnValue = await getEmailColumnValue(
            itemId,
            emailColumn
          );
          email = emailColumnValue?.data?.items?.[0]?.column_values?.[0]?.text;
          indexOfEmailColumn = signerDetails?.signers?.findIndex(
            signer => signer?.emailColumnId === emailColumn
          );
        }

        if (email) {
          const newHistory = await signerService.deletePreviousStatusAndSend({
            fileId: Types.ObjectId(id),
            itemId: Number(itemId),
            email,
            session,
          });

          await signerService.sendEmailAndUpdateBackOffice({
            itemId,
            newSentHistory: newHistory,
            session,
            template,
            to: email,
          });

          signerDetails.signers[indexOfEmailColumn].fileStatus =
            newHistory[0]._id.toString();
          signerDetails = await signerService.updateSigner(signerDetails._id, {
            signers: signerDetails.signers,
          });
        }
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    }
    if (!signerDetails.isSigningOrderRequired) {
      const emailColumns = signerDetails?.signers
        ?.filter(
          emailCol =>
            emailCol.emailColumnId && !emailCol.userId && !emailCol.isSigned
        )
        ?.map(emailCol => emailCol.emailColumnId);

      const userColumns = signerDetails?.signers
        ?.filter(emailCol => emailCol.userId && !emailCol.isSigned)
        ?.map(emailCol => emailCol.userId);

      let emailList = [];

      if (emailColumns?.length) {
        const emailColumnValue = await getEmailColumnValue(
          itemId,
          emailColumns
        );
        const emailColRes =
          emailColumnValue?.data?.items?.[0]?.column_values?.map(value => ({
            email: value?.text,
            id: value?.id,
          }));
        if (emailColRes?.length > 0)
          emailList = emailList.concat([...emailColRes]);
      }
      if (userColumns?.length) {
        const userColumnValue = await getUsersByIds(userColumns);
        const userColRes = userColumnValue?.data?.users?.map(user => ({
          id: user.id,
          email: user.email,
        }));
        if (userColRes?.length > 0)
          emailList = emailList.concat([...userColRes]);
      }

      for (const emailDetail of emailList) {
        if (!emailDetail?.email) continue;
        let session = await mongoose.startSession();
        session.startTransaction();

        try {
          const newHistory = await signerService.deletePreviousStatusAndSend({
            fileId: Types.ObjectId(id),
            email: emailDetail.email,
            session,
            itemId,
          });

          await signerService.sendEmailAndUpdateBackOffice({
            itemId,
            newSentHistory: newHistory,
            session,
            template,
            to: emailDetail.email,
          });

          const indexOfEmailColumn = signerDetails?.signers?.findIndex(
            signer =>
              (Number(signer?.userId) || signer?.emailColumnId) ===
              emailDetail?.id // added emailCol.id temporarily
          );

          if (indexOfEmailColumn > -1) {
            signerDetails.signers[indexOfEmailColumn].fileStatus =
              newHistory[0]._id.toString();

            signerDetails = await signerService.updateSigner(
              signerDetails._id,
              { signers: signerDetails.signers }
            );
          }
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    }

    return res.json({ data: signerDetails }).status(200);
  } catch (error) {
    return next(error);
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

    // let signerEmail;
    // let currentSigner;

    // if (indexOfCurrentSigner > -1) {
    //   currentSigner = pdfSigners[indexOfCurrentSigner];

    //   await setMondayToken(template.user_id, template.account_id);

    //   if (currentSigner.emailColumnId && !currentSigner.userId) {
    //     const currentSignerEmailRes = await getEmailColumnValue(
    //       itemId,
    //       currentSigner.emailColumnId
    //     );
    //     signerEmail =
    //       currentSignerEmailRes?.data?.items?.[0]?.column_values?.[0]?.text;
    //   }

    //   if (currentSigner.userId) {
    //     const userResp = await getUsersByIds(currentSigner.userId);
    //     signerEmail = userResp?.data?.users?.[0]?.email;
    //   }
    // }

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

    pdfSigners = pdfSigners.map(signer => {
      if (signer.fileStatus === fileHistoryId) {
        return {
          ...signer,
          fileStatus: signedPDF?._id?.toString(), //updates the allocated filehistory
          isSigned: true,
        };
      } else {
        return signer;
      }
    });

    signers.signers = pdfSigners;
    signers.file = signedPDF.file;
    await signers.save(); // Update Signers.

    const appInstallDetails = await ApplicationModel.findOne({
      type: 'install',
      account_id: template.account_id,
    }).sort({ created_at: 'desc' });

    if (appInstallDetails?.back_office_item_id) {
      await backOfficeDocumentSigned(appInstallDetails.back_office_item_id);
    }

    const hasAllSigned = pdfSigners.every(signer => signer.isSigned);

    if (hasAllSigned) {
      let receivers = await signerService.extractAllEmails({
        template,
        signerDetails: signers,
        itemId,
      });

      // upload the PDF to Board
      const finalFile = await fileHistoryService.getFinalContract(
        signedPDF._id,
        true
      );
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

      await sendFinalContract(
        {
          file: finalFile.file,
          name: template.file_name || 'signed-adhoc-contract.pdf',
          size: finalFile?.size,
          itemId,
          fileId: signedPDF._id,
          senderName: template.sender_name,
          senderEmail: template.email_address,
        },
        receivers
      );
    }

    // When Signing order is required then change the status of the item to {index of signer}+Signed
    if (
      !hasAllSigned &&
      signers.isSigningOrderRequired &&
      indexOfCurrentSigner > -1
    ) {
      await updateStatusColumn({
        itemId: itemId,
        boardId: template.board_id,
        columnId: template?.status_column_id,
        columnValue: pdfSigners[indexOfCurrentSigner].userId
          ? `Me Signed`
          : `${indexOfCurrentSigner + 1} Signed`,
        userId: template?.user_id,
        accountId: template?.account_id,
      });
    }

    if (
      !hasAllSigned &&
      !signers.isSigningOrderRequired &&
      indexOfCurrentSigner > -1
    ) {
      await updateStatusColumn({
        itemId: itemId,
        boardId: template.board_id,
        columnId: template?.status_column_id,
        columnValue: pdfSigners[indexOfCurrentSigner].userId
          ? `Me Signed`
          : `${indexOfCurrentSigner + 1} Signed`,
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
          shouldUpdateMondayStatus: !signers.isSigningOrderRequired,
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

const viewDocument = async (req, res, next) => {
  try {
    const fileHistoryId = req.params.id;
    let ips = (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      ''
    ).split(',');
    const ip = ips[0].trim();

    const fileHistory = await FileHistory.findById(fileHistoryId).populate(
      'fileId'
    );

    if (!fileHistory) throw new Error('File History not found !');

    const template = fileHistory.fileId;
    let itemId = fileHistory.itemId;
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

    const isViewedAlready = await FileHistory.find({
      fileId: Types.ObjectId(template._id),
      status: 'viewed',
      itemId,
    });

    if (isViewedAlready?.find(doc => doc.sentToEmail === signerEmail)) {
      delete fileHistory.fileId;
      return res.status(200).json({
        data: isViewedAlready?.find(doc => doc.sentToEmail === signerEmail),
      });
    }

    const viewedFileHistory = await FileHistory.create({
      fileId: template._id,
      status: 'viewed',
      itemId,
      file: fileHistory.file,
      viewedIpAddress: ip,
      sentToEmail: signerEmail,
    });

    if (viewedFileHistory?.status) {
      await setMondayToken(template.user_id, template.account_id);

      await updateStatusColumn({
        itemId: itemId,
        boardId: template.board_id,
        columnId: template?.status_column_id,
        columnValue: `Viewed by ${currentSigner.label}`,
        userId: template?.user_id,
        accountId: template?.account_id,
      });
    }

    return res.json({ data: viewedFileHistory }).status(200);
  } catch (err) {
    next(err);
  }
};

const handleRequestSignByMe = async (req, res, next) => {
  const { originalFileId, itemId } = req.params;
  let ips = (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    ''
  ).split(',');
  const ip = ips[0].trim();

  try {
    let signerDetails = await signerService.getOneSignersByFilter({
      originalFileId: Types.ObjectId(originalFileId),
      itemId: Number(itemId),
    });

    if (!signerDetails) throw new Error('Signers not found!');

    const meUserIndex = signerDetails.signers?.findIndex(
      doc => doc?.userId && !doc?.isSigned
    );

    if (meUserIndex === -1) throw new Error('Signer not found!');
    let meUserDetail;

    signerDetails = await signerDetails.populate('originalFileId');
    const template = signerDetails.originalFileId;
    meUserDetail = signerDetails.signers[meUserIndex];

    await setMondayToken(template?.user_id, template?.account_id);
    const userResp = await getUsersByIds(meUserDetail.userId);
    let meUserEmail = userResp?.data?.users?.[0]?.email;

    const fileHistory = await FileHistory.create({
      itemId: Number(itemId),
      fileId: Types.ObjectId(originalFileId),
      status: 'viewed',
      sentToEmail: meUserEmail,
      viewedIpAddress: ip,
    });

    signerDetails.signers[meUserIndex].fileStatus = fileHistory._id.toString();

    const updatedSiger = await SignerModel.findOneAndUpdate(
      { _id: signerDetails._id },
      { signers: signerDetails.signers },
      { new: true }
    );

    return res.status(200).json({
      fileHistory: fileHistory._id.toString(),
      signerDetails: updatedSiger,
    });
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
  viewDocument,
  resendMail,
  handleRequestSignByMe,
};
