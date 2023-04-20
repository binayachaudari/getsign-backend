const {
  getStoredBoardFile,
  updateBackOfficeInstalledItemView,
  getAvailableFilesForBoard,
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
  getFiles: async (req, res, next) => {
    try {
      const { boardId } = req.params;
      const result = await getAvailableFilesForBoard(boardId);
      return res
        .json({
          data: result,
        })
        .status(200);
    } catch (err) {
      next(err);
    }
  },
  setInstanceId: async (req, res, next) => {
    try {
    } catch (err) {
      next(err);
    }
  },
  getBoardFile: async (req, res, next) => {
    const { boardId, itemId } = req.params;
    const { instanceId } = req.query;

    try {
      const boardDetails = await getStoredBoardFile(
        boardId,
        itemId,
        Number(instanceId)
      );
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
