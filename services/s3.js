const AWS = require('aws-sdk');
const FileDetailsModal = require('../modals/FileDetails');

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

  const result = await FileDetailsModal.create({
    account_id: body.account_id,
    board_id: body.board_id,
    file: s3Res.Key,
    item_id: body.item_id,
    user_id: body.user_id,
  });

  return result;
};

const getFile = async (id) => {
  try {
    const fileDetails = await FileDetailsModal.findById(id);
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
    console.log(error);
  }
};

module.exports = { uploadFile, getFile };
