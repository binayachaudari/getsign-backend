const { getStoredBoardFile } = require('../services/board');

module.exports = {
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
