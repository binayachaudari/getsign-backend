const ApplicationModel = require('../models/Application.model');
const {
  updateColumnValues,
  backOfficeItemViewInstalled,
} = require('../services/backoffice.service');
const {
  getStoredBoardFile,
  updateBackOfficeInstalledItemView,
  getAvailableFilesForBoard,
  updateInstanceId,
} = require('../services/board');

module.exports = {
  installedItemView: async (req, res, next) => {
    try {
      const { version } = req.query;
      if (version) {
        const applicationHistory = await ApplicationModel.findOne({
          account_id: req?.accountId,
          back_office_item_id: { $ne: null },
        });

        if (applicationHistory?.back_office_item_id) {
          await updateColumnValues(
            applicationHistory.back_office_item_id,
            JSON.stringify({ text2: version })
          );
          await backOfficeItemViewInstalled(
            Number(applicationHistory?.back_office_item_id)
          );
        }
      }

      res
        .json({
          data: {
            message: 'Status updated for accountId: ' + req?.accountId,
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
      const { fileId } = req.params;
      const { instanceId } = req.body;
      const result = await updateInstanceId(fileId, instanceId);
      return res
        .json({
          data: {
            _id: result._id,
            file_name: result.file_name,
            instanceId: result.itemViewInstanceId,
          },
        })
        .status(200);
    } catch (err) {
      next(err);
    }
  },
  getBoardFile: async (req, res, next) => {
    const { boardId, itemId } = req.params;
    const { instanceId, type } = req.query;

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
