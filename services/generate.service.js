const ApplicationModel = require('../models/Application.model');
const FileDetails = require('../models/FileDetails');
const { backOfficeUploadedDocument } = require('./backoffice.service');
const { s3, getSignedUrl, loadFileDetails } = require('./s3');

const uploadDocumentToGeneratePDF = async req => {
  const body = req.body;
  const file = req.files.file;

  // const fileDetails = await FileDetails.findOne({
  //   account_id: body.account_id,
  //   board_id: Number(body.board_id),
  //   type: 'generate',
  // }).sort({ created_at: -1 });

  const s3Res = await s3
    .upload({
      Bucket: process.env.IS_DEV
        ? `${process.env.BUCKET_NAME}/dev-test`
        : process.env.BUCKET_NAME,
      Key: `get-sign-${file.name}-${Date.now().toString()}`,
      Body: file.data,
      ContentType: file.mimetype,
    })
    .promise();

  const result = await FileDetails.create({
    account_id: body.account_id,
    board_id: body.board_id,
    item_id: body.item_id,
    user_id: body.user_id,
    file_name: file.name,
    file: s3Res.Key,
    itemViewInstanceId: body.instanceId,
    type: 'generate',
  });

  await result.save();

  const appInstallDetails = await ApplicationModel.findOne({
    type: 'install',
    account_id: body.account_id,
  }).sort({ created_at: 'desc' });

  if (appInstallDetails?.back_office_item_id) {
    await backOfficeUploadedDocument(appInstallDetails.back_office_item_id);
  }

  return result;
};

const templates = async boardId => {
  return FileDetails.find({
    board_id: boardId,
    is_deleted: false,
    type: 'generate',
  });
};

const removeTemplate = async fileId => {
  return FileDetails.findByIdAndUpdate(fileId, { is_deleted: true });
};

module.exports = {
  uploadDocumentToGeneratePDF,
  templates,
  removeTemplate,
};
