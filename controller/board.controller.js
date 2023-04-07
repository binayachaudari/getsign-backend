const {
  getStoredBoardFile,
  updateBackOfficeInstalledItemView,
} = require('../services/board');

module.exports = {
  installedItemView: async (req, res, next) => {
    const { accountId } = req.params;
    try {
      await updateBackOfficeInstalledItemView(Number(accountId));
    } catch (err) {
      next(err);
    }
  },
  getBoardFile: async (req, res, next) => {
    const { boardId, itemId } = req.params;

    try {
      const boardDetails = await getStoredBoardFile(boardId, itemId);
      return res
        .json({
          data: { ...boardDetails, isAuthenticated: req.isAuthenticated },
        })
        .status(200);
    } catch (error) {
      next(error);
    }
  },
};
