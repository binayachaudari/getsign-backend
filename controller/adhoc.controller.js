const adhocService = require('../services/adhoc.service');

const addSenderDetails = async (req, res, next) => {
  try {
    const body = req.body;
    const details = await adhocService.addSenderDetails(body);

    return res
      .json({
        data: details,
      })
      .status(200);
  } catch (error) {
    next(error)
  }
};

module.exports = {
  addSenderDetails,
};
