const { getStoredBoardFile } = require('../services/board');

module.exports = {
  getBoardFile: async (req, res, next) => {
    const boardId = req.params.boardId;

    try {
      const boardDetails = await getStoredBoardFile(boardId);
      return res.json({ data: boardDetails }).status(200);
    } catch (error) {
      next(error);
    }
  },
};
