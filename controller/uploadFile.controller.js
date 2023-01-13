const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

module.exports = {
  uploadFile: async (req, res, next) => {
    const file = req.files.file;
    const s3Res = await s3
      .upload({
        Bucket: process.env.BUCKET_NAME,
        Key: `jet-sign-${file.name}-${Date.now().toString()}`,
        Body: file.data,
        ContentType: file.mimetype,
      })
      .promise();
    res.send(s3Res);
  },
  getFile: async (req, res, next) => {
    try {
      const url = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: req.body?.key,
        // Expires: 60 * 5,
      });

      const body = await fetch(url);
      const contentType = body.headers.get('content-type');
      const arrBuffer = await body.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);

      var base64String = buffer.toString('base64');

      res.json({ data: `data:${contentType};base64,${base64String}` });
    } catch (error) {
      console.log(error);
    }
  },
};
