const {
  getItemDetails,
  getColumnValues,
  runMondayQuery,
} = require('../services/monday.service');
const { getFormulaValueOfItem } = require('../utils/formula');

const itemDetails = async (req, res, next) => {
  const { itemId } = req.params;
  try {
    const result = await getItemDetails(Number(itemId));

    const items_subItem = result?.data?.items?.[0]?.subitems || [];

    for (const [subItemIndex, subItem] of items_subItem?.entries()) {
      const formulaColumnValues = await getFormulaValueOfItem({
        itemId: subItem.id,
        boardColumns: subItem?.board?.columns || [],
        boardColumnValues: subItem?.column_values || [],
      });

      for (const columnValue of formulaColumnValues) {
        const alreadyExistsIdx = subItem.column_values.findIndex(
          formValue => formValue.id === columnValue?.id
        );

        if (alreadyExistsIdx > -1) {
          items_subItem[subItemIndex]?.column_values?.forEach((col, index) => {
            if (col.id == columnValue.id) {
              col = columnValue;
            }

            items_subItem[subItemIndex].column_values[index] = col;
          });
        } else {
          items_subItem[subItemIndex]?.column_values?.push({
            ...columnValue,
          });
        }
      }
    }

    if (result?.data?.items?.[0]?.subitems?.length) {
      result.data.items[0].subitems = [...items_subItem];
    }

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
