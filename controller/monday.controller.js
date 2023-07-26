const {
  getItemDetails,
  getColumnValues,
  runMondayQuery,
} = require('../services/monday.service');

const itemDetails = async (req, res, next) => {
  const { itemId } = req.params;
  try {
    const result = await getItemDetails(Number(itemId));
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

const createNewColumn = async (req, res, next) => {
  const { columnType, boardId, columnName } = req.params;

  const query = `mutation createColumn($boardId: Int!, $columnType: ColumnType, $title: String!) {
    create_column(board_id: $boardId, title: $title, column_type: $columnType) {
      id
      title
      description
    }
  }`;

  const options = {
    variables: {
      boardId: Number(boardId),
      columnType: String(columnType),
      title: String(columnName),
    },
  };

  try {
    await runMondayQuery({
      query,
      queryOptions: { ...options },
      userId: req.userId,
      accountId: req.accountId,
    });

    return res.status(200).json({ message: 'Created new column in board.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  itemDetails,
  columnValues,
  createNewColumn,
};
