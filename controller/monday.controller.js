const {
  getItemDetails,
  getColumnValues,
} = require('../services/monday.service');

const itemDetails = async (req, res, next) => {
  const { itemId } = req.params;
  try {
    const result = await getItemDetails(itemId);
    return res.json({ ...result }).status(200);
  } catch (error) {
    next(error);
  }
};

const columnValues = async (req, res, next) => {
  const { itemId } = req;
  try {
    const result = await getColumnValues(itemId);
    return res.json({ ...result }).status(200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  itemDetails,
  columnValues,
};
