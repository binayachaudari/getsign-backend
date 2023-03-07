const AWS = require('aws-sdk');
const FileDetailsModel = require('../models/FileDetails');
const FileHistory = require('../models/FileHistory');
const { setMondayToken } = require('../utils/monday');
const { updateStatusColumn } = require('./monday.service');

const s3 = new AWS.S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

const uploadFile = async (req) => {
  const body = req.body;
  const file = req.files.file;

  const s3Res = await s3
    .upload({
      Bucket: process.env.BUCKET_NAME,
      Key: `jet-sign-${file.name}-${Date.now().toString()}`,
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
  });

  result.email_address = prev?.email_address;
  result.email_column_id = prev?.email_column_id;
  result.status_column_id = prev?.status_column_id;
  result.file_column_id = prev?.file_column_id;
  result.sender_name = prev?.sender_name;
  result.email_title = prev?.email_title;
  result.message = prev?.message;

  await result.save();

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

const getFile = async (id) => {
  try {
    const fileDetails = await FileDetailsModel.findById(id);
    const url = s3.getSignedUrl('getObject', {
      Bucket: process.env.BUCKET_NAME,
      Key: fileDetails.file,
    });
    const body = await fetch(url);
    const contentType = body.headers.get('content-type');
    const arrBuffer = await body.arrayBuffer();
    const buffer = Buffer.from(arrBuffer);
    var base64String = buffer.toString('base64');

    fileDetails.file = `data:${contentType};base64,${base64String}`;

    return fileDetails;
  } catch (error) {
    throw error;
  }
};

const deleteFile = async (id) => {
  const session = await FileHistory.startSession();
  session.startTransaction();
  let deleted;
  try {
    const template = await FileDetailsModel.findById(id);
    await setMondayToken(template.board_id);

    // get itemId that are already signed by receiver or sender
    const signedItemIds = await FileHistory.distinct('itemId', {
      fileId: id,
      status: { $in: ['signed_by_receiver', 'signed_by_sender'] },
    });

    // find all itemIds not signed by sender or receiver
    const inProcessItemIds = await FileHistory.distinct('itemId', {
      fileId: id,
      itemId: { $nin: signedItemIds },
    });

    if (inProcessItemIds?.length > 0) {
      inProcessItemIds?.forEach(async (item) => {
        await updateStatusColumn({
          itemId: item,
          boardId: template.board_id,
          columnId: template?.status_column_id,
          columnValue: undefined,
        });
      });

      // delete file histories not having ids signed by sender or receiver
      deleted = await FileHistory.deleteMany({
        itemId: { $in: inProcessItemIds },
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

const getSignedUrl = async (key) => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
  });
};

module.exports = { uploadFile, getFile, deleteFile, s3, getSignedUrl };
