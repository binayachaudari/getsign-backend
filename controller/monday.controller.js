const { getItemDetails } = require('../services/monday.service');

const itemDetails = async (req, res, next) => {
  const { itemId, token } = req;
  try {
    const result = await getItemDetails(itemId, token);
    return res.json({ ...result }).status(200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  itemDetails,
};
