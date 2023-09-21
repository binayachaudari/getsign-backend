const statusMapper = require('../config/statusMapper');
const ApplicationModel = require('../models/Application.model');
const FileDetails = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const { backOfficeDocumentSigned } = require('../services/backoffice.service');
const STANDARD_FIELDS = require('../config/standardFields');

const {
  addFormFields,
  generatePDF,
  addSenderDetails,
} = require('../services/file');

const {
  getSignerByFileId,
  createSigner,
  getOneSignersByFilter,
} = require('../services/signers.service');

const {
  addFileHistory,
  getFileHistory,
  viewedFile,
  getFileToSignReceiver,
  getFinalContract,
  getFileToSignSender,
  downloadContract,
  generateFilePreview,
  generateFilePreviewWithPlaceholders,
  getFileForSigner,
} = require('../services/fileHistory');
const { emailRequestToSign, sendFinalContract } = require('../services/mailer');
const {
  updateStatusColumn,
  getEmailColumnValue,
  uploadContract,
  updateMultipleTextColumnValues,
} = require('../services/monday.service');
const {
  uploadFile,
  getFile,
  deleteFile,
  loadFileDetails,
} = require('../services/s3');
const { setMondayToken } = require('../utils/monday');

const TEXT_BOX_ITEM_ID = 'text-box';

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
    const accountId = req.accountId;

    try {
      const result = await getFile(id, accountId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
  getFileDetails: async (req, res, next) => {
    const id = req.params.id;
    try {
      const result = await loadFileDetails(id);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },
  updateFields: async (req, res, next) => {
    const id = req.params.id;
    const item_id = req.params.item_id;
    const { fields, signers_settings } = req.body;
    try {
      const result = await addFormFields(id, fields);
      const signerOrder = await getOneSignersByFilter({
        originalFileId: id,
        itemId: item_id,
      });

      const signerOrderPayload = {
        signers: signers_settings.signers || [],
        originalFileId: id,
        itemId: item_id,
        isSigningOrderRequired:
          signers_settings.isSigningOrderRequired || false,
      };

      if (signerOrder) {
        await signerOrder.updateOne(signerOrderPayload);
      } else {
        await createSigner(signerOrderPayload);
      }

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
    const {
      sender_name,
      email_address,
      email_title,
      message,
      email_column_id,
      status_column_id,
      file_column_id,
    } = req.body;

    try {
      const result = await addSenderDetails(id, {
        sender_name,
        email_address,
        email_title,
        message,
        email_column_id,
        status_column_id,
        file_column_id,
      });

      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  addSignature: async (req, res, next) => {
    const id = req.params.id;
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
      const template = await FileDetails.findById(id);

      const senderSignRequired = template?.fields?.filter(field =>
        ['Sender Signature', 'Sender Initials'].includes(field?.title)
      )?.length;

      const receiverSignRequired = template?.fields?.filter(field =>
        ['Receiver Signature', 'Receiver Initials'].includes(field?.title)
      )?.length;

      if (standardFields?.length) {
        let fields = [];
        fields = [...standardFields]?.filter(
          field =>
            (field.itemId === STANDARD_FIELDS.textBox ||
              field.itemId === STANDARD_FIELDS.status) &&
            Boolean(field?.column?.value)
        );

        await updateMultipleTextColumnValues({
          itemId,
          boardId: template.board_id,
          userId: template?.user_id,
          accountId: template?.account_id,
          standardFields: [...fields],
        });
      }

      const lineItemFields =
        template?.fields?.filter(field => field.itemId === 'line-item') || [];

      const result = await addFileHistory({
        id,
        itemId,
        status,
        interactedFields: [...signatures, ...standardFields, ...lineItemFields],
        ipAddress: ip,
      });

      await setMondayToken(template.user_id, template.account_id);
      const alsoSignedBySender = await FileHistory.findOne({
        fileId: template.id,
        itemId,
        status: 'signed_by_sender',
      }).exec();

      const alsoSignedByReceiver = await FileHistory.findOne({
        fileId: template.id,
        itemId,
        status: 'signed_by_receiver',
      }).exec();

      // const onlySenderSigRequired =
      //   !receiverSignRequired && senderSignRequired && alsoSignedBySender?._id;

      const onlyReceiverSigRequired =
        !senderSignRequired &&
        receiverSignRequired &&
        alsoSignedByReceiver?._id;

      const bothPartySigned =
        alsoSignedByReceiver?._id && alsoSignedBySender?._id;

      if (onlyReceiverSigRequired || bothPartySigned) {
        const finalFile = await getFinalContract(result._id, true);

        const emailColumn = await getEmailColumnValue(
          itemId,
          template.email_column_id
        );
        const to = emailColumn?.data?.items?.[0]?.column_values?.[0]?.text;

        await updateStatusColumn({
          itemId: itemId,
          boardId: template.board_id,
          columnId: template?.status_column_id,
          columnValue: 'Completed',
          userId: template?.user_id,
          accountId: template?.account_id,
        });
        const appInstallDetails = await ApplicationModel.findOne({
          type: 'install',
          account_id: template.account_id,
        }).sort({ created_at: 'desc' });

        if (appInstallDetails?.back_office_item_id) {
          await backOfficeDocumentSigned(appInstallDetails.back_office_item_id);
        }

        await uploadContract({
          itemId,
          boardId: template.board_id,
          columnId: template?.file_column_id,
          file: finalFile,
          userId: template?.user_id,
          accountId: template?.account_id,
        });

        const receivers = [to];

        if (!onlyReceiverSigRequired) {
          receivers.push(template.email_address);
        }

        await sendFinalContract(
          {
            file: finalFile.file,
            name: template.file_name || 'signed-adhoc-contract.pdf',
            size: finalFile?.size,
            itemId,
            fileId: result._id,
            senderName: template.sender_name,
            senderEmail: template.email_address,
          },
          receivers
        );
        return res.status(200).json({ data: 'Contract has been sent!' });
      }

      await updateStatusColumn({
        itemId: itemId,
        boardId: template.board_id,
        columnId: template?.status_column_id,
        columnValue: statusMapper[result.status],
        userId: template?.user_id,
        accountId: template?.account_id,
      });

      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getFileHistory: async (req, res, next) => {
    const { itemId, id } = req.params;
    try {
      const result = await getFileHistory(itemId, id);
      return res
        .json({ data: result.data, resentHistory: result.resendStatus })
        .status(200);
    } catch (error) {
      next(error);
    }
  },

  sendPDF: async (req, res, next) => {
    const { itemId, id } = req.params;
    try {
      const result = await emailRequestToSign(itemId, id);
      return res.json({ data: result }).status(200);
    } catch (error) {
      console.log(error);
      next(error);
    }
  },

  viewedPDF: async (req, res, next) => {
    const { itemId, id } = req.params;
    let ips = (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      ''
    ).split(',');

    const ip = ips[0].trim();
    try {
      const result = await viewedFile(id, itemId, ip);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getFileForSender: async (req, res, next) => {
    // actual fileId
    const { itemId, id } = req.params;
    try {
      const result = await getFileToSignSender(id, itemId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getFileForReceiver: async (req, res, next) => {
    // fileHistory id having status = 'sent' | 'resent'
    const { itemId, id } = req.params;
    try {
      const result = await getFileToSignReceiver(id, itemId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getFileForSigner: async (req, res, next) => {
    // fileHistory id having status = 'sent' | 'resent'
    const { itemId, id } = req.params;
    try {
      const result = await getFileForSigner(id, itemId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getContract: async (req, res, next) => {
    const { itemId, fileId } = req.params;
    try {
      const result = await downloadContract(itemId, fileId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  getContractFile: async (req, res, next) => {
    const { id } = req.params;
    try {
      const result = await getFinalContract(id);
      return res.json({ data: result }).status(200);
    } catch (error) {
      next(error);
    }
  },

  generatePreview: async (req, res, next) => {
    const { itemId, fileId } = req.params;
    const accountId = req.accountId;
    try {
      const result = await generateFilePreview(fileId, itemId, accountId);
      return res.json({ data: result }).status(200);
    } catch (error) {
      if (error?.status === 403 && error?.userId) {
        return res.redirect(
          '/re-authenticate?context=' +
            JSON.stringify({ updateTokenUserId: error?.userId })
        );
      }
      next(error);
    }
  },

  generateRealtimeFilePreview: async (req, res, next) => {
    const { itemId, fileId } = req.params;
    const { placeholders } = req.body;
    try {
      const result = await generateFilePreviewWithPlaceholders(
        fileId,
        itemId,
        placeholders || []
      );
      return res.json({ data: result }).status(200);
    } catch (error) {
      if (error?.status === 403 && error?.userId) {
        return res.redirect(
          '/re-authenticate?context=' +
            JSON.stringify({ updateTokenUserId: error?.userId })
        );
      }
      next(error);
    }
  },
};
