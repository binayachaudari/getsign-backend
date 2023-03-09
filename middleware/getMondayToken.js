const FileDetails = require('../models/FileDetails');
const { me } = require('../services/monday.service');
const { monday, setMondayToken } = require('../utils/monday');

const getMondayToken = async (req, res, next) => {
  const { fileId } = req.params;
  try {
    const fileDetail = await FileDetails.findById(fileId);
    if (!fileDetail) {
      return next(new Error("File doesn't exist"));
    }

    await setMondayToken(fileDetail.user_id, fileDetail.account_id);

    const res = await me();

    if (
      res.hasOwnProperty('error_message') ||
      res.hasOwnProperty('error_code') ||
      res.hasOwnProperty('errors')
    ) {
      return next({ message: 'Unauthorized', statusCode: 401 });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { getMondayToken };
