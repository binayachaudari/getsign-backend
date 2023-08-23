const AWS = require('aws-sdk');
const FileDetailsModel = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const { setMondayToken } = require('../utils/monday');
const {
  updateStatusColumn,
  getColumnDetails,
  getSpecificColumnValue,
} = require('./monday.service');
const { Types } = require('mongoose');
const ApplicationModel = require('../models/Application.model');
const { backOfficeUploadedDocument } = require('./backoffice.service');

const s3 = new AWS.S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

const uploadFile = async req => {
  const body = req.body;
  const file = req.files.file;

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

  // get values from previous file that has been deleted
  const prev = await FileDetailsModel.findOne({
    account_id: body.account_id,
    board_id: body.board_id,
    is_deleted: true,
  });

  const result = await FileDetailsModel.create({
    account_id: body.account_id,
    board_id: body.board_id,
    file: s3Res.Key,
    item_id: body.item_id,
    user_id: body.user_id,
    file_name: file.name,
    itemViewInstanceId: body.instanceId,
  });

  result.email_address = prev?.email_address;
  result.email_column_id = prev?.email_column_id;
  result.status_column_id = prev?.status_column_id;
  result.file_column_id = prev?.file_column_id;
  result.sender_name = prev?.sender_name;
  result.email_title = prev?.email_title;
  result.message = prev?.message;
  result.is_email_verified = prev?.is_email_verified;

  await result.save();

  const appInstallDetails = await ApplicationModel.findOne({
    type: 'install',
    account_id: result.account_id,
  }).sort({ created_at: 'desc' });

  if (appInstallDetails?.back_office_item_id) {
    await backOfficeUploadedDocument(appInstallDetails.back_office_item_id);
  }

  if (prev?._id) {
    // get itemId that are already signed by receiver or sender
    const signedItemIds = await FileHistory.distinct('itemId', {
      fileId: prev._id,
      status: { $in: ['signed_by_receiver', 'signed_by_sender'] },
    });

    if (!signedItemIds.length) {
      s3.deleteObject(
        {
          Bucket: process.env.BUCKET_NAME,
          Key: prev.file,
        },
        async (err, data) => {
          if (err) {
            throw err;
          }
        }
      );

      deleted = await FileDetailsModel.findByIdAndDelete(prev.id);
    }
  }

  return result;
};

const getFile = async (id, accountId) => {
  try {
    let url;
    const fileDetails = await FileDetailsModel.findOne({
      _id: id,
      account_id: accountId,
    }).lean();
    if (fileDetails?.type === 'adhoc') {
      const urls = await getSpecificColumnValue(
        fileDetails?.item_id,
        fileDetails?.presigned_file_column_id
      );
      if (urls.length) {
        url = urls?.[0];
      }
    } else {
      url = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: fileDetails.file,
      });
    }
    const body = await fetch(url);
    const contentType = body.headers.get('content-type');
    const arrBuffer = await body.arrayBuffer();
    const buffer = Buffer.from(arrBuffer);
    const base64String = buffer.toString('base64');

    fileDetails.file = `data:${contentType};base64,${base64String}`;

    delete fileDetails.email_verification_token;
    delete fileDetails.email_verification_token_expires;
    delete fileDetails._ac;
    delete fileDetails._ct;

    return fileDetails;
  } catch (error) {
    if (error.status) {
      error.statusCode = error.status;
    }
    throw error;
  }
};

const loadFileDetails = async id => {
  try {
    let url;
    const fileDetails = await FileDetailsModel.findById(id).lean();
    if (fileDetails?.type === 'adhoc') {
      const urls = await getSpecificColumnValue(
        fileDetails?.item_id,
        fileDetails.presigned_file_column_id
      );
      if (urls.length) {
        url = urls?.[0];
      }
      if (urls !== '[]') {
        throw {
          statusCode: 404,
          message: 'No file in the presigned column',
        };
      }
    } else {
      url = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: fileDetails.file,
      });
    }
    const body = await fetch(url);
    const contentType = body.headers.get('content-type');
    const arrBuffer = await body.arrayBuffer();
    const buffer = Buffer.from(arrBuffer);
    const base64String = buffer.toString('base64');

    fileDetails.file = `data:${contentType};base64,${base64String}`;

    delete fileDetails.email_verification_token;
    delete fileDetails.email_verification_token_expires;
    delete fileDetails._ac;
    delete fileDetails._ct;

    return fileDetails;
  } catch (error) {
    throw error;
  }
};

const deleteFile = async id => {
  const session = await FileHistory.startSession();
  session.startTransaction();
  let deleted;
  try {
    const template = await FileDetailsModel.findById(id);
    await setMondayToken(template.user_id, template.account_id);

    // get all the items not signed by both (sender and receiver)
    // and not signed by receiver
    const notSignedByBothAndSender = await FileHistory.aggregate([
      {
        $group: {
          _id: '$itemId',
          status: {
            $push: '$status',
          },
          fileId: {
            $first: '$fileId',
          },
        },
      },
      {
        $match: {
          fileId: Types.ObjectId(id),
          $and: [
            {
              status: {
                $not: {
                  $all: ['signed_by_sender', 'signed_by_receiver'],
                },
              },
            },
            {
              status: {
                $not: {
                  $all: ['signed_by_receiver'],
                },
              },
            },
          ],
        },
      },
    ]);

    if (notSignedByBothAndSender?.length > 0) {
      notSignedByBothAndSender?.forEach(async item => {
        await updateStatusColumn({
          itemId: item?._id,
          boardId: template.board_id,
          columnId: template?.status_column_id,
          columnValue: undefined,
          userId: template?.user_id,
          accountId: template?.account_id,
        });
      });

      const toDeleteHistory = notSignedByBothAndSender.map(item => item?._id);

      // delete file histories
      await FileHistory.deleteMany({
        itemId: { $in: toDeleteHistory },
      }).session(session);
    }

    // if no items are signed—delete the file else update the is_deleted column
    deleted = await FileDetailsModel.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    }).session(session);

    await session.commitTransaction();
    return deleted;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getSignedUrl = async key => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
  });
};

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
  s3,
  getSignedUrl,
  loadFileDetails,
};
