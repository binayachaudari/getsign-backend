const {
  getStoredBoardFile,
  updateBackOfficeInstalledItemView,
} = require('../services/board');

module.exports = {
  installedItemView: async (req, res, next) => {
    try {
      await updateBackOfficeInstalledItemView(Number(req?.user?.account_id));
      res
        .json({
          data: {
            message: 'Status updated for accountId: ' + req?.user?.account_id,
          },
        })
        .status(200);
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
