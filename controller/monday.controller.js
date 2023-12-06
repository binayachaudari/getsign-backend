const {
  getItemDetails,
  getColumnValues,
  runMondayQuery,
  getColumnValuesByIds,
  handleFormatEmailAndPersons,
  getSubItems,
} = require('../services/monday.service');
const { getFormulaValueOfItem } = require('../utils/formula');
const { handleFormatNumericColumn } = require('../utils/monday');
const MondayDataFormatter = require('../utils/mondayDataParser');

const getEmailAndPersons = async (req, res, next) => {
  const columns = req.body.columns || ['email', 'person'];

  const itemId = req.params.itemId || '';

  try {
    const result = await getColumnValuesByIds(itemId, columns);

    let column_values = result?.data?.items?.[0]?.column_values || [];

    const formatColumnValues = await handleFormatEmailAndPersons(column_values);
    return res.json({ emailsAndPersons: formatColumnValues }).status(200);
  } catch (err) {
    next(err);
  }
};

const itemDetails = async (req, res, next) => {
  const { itemId } = req.params;
  try {
    const result = await getItemDetails(Number(itemId));

    let item = result?.data?.items?.[0];

    const formattedBoard = MondayDataFormatter.formatBoardColumns(item.board);

    item.board = formattedBoard;

    item = handleFormatNumericColumn(item);

    if (item) {
      result.data.items[0] = item;
    }

    const items_subItem = result?.data?.items?.[0]?.subitems || [];

    if (items_subItem?.length > 0) {
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
            items_subItem[subItemIndex]?.column_values?.forEach(
              (col, index) => {
                if (col.id == columnValue.id) {
                  col = columnValue;
                }

                items_subItem[subItemIndex].column_values[index] = col;
              }
            );
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
    }

    return res.json({ ...result }).status(200);
  } catch (error) {
    next(error);
  }
};

const itemSubItems = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const mondayResponse = await getSubItems(itemId);
    const items_subItem = mondayResponse?.data?.items?.[0]?.subitems || [];

    if (items_subItem?.length > 0) {
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
            items_subItem[subItemIndex]?.column_values?.forEach(
              (col, index) => {
                if (col.id == columnValue.id) {
                  col = columnValue;
                }

                items_subItem[subItemIndex].column_values[index] = col;
              }
            );
          } else {
            items_subItem[subItemIndex]?.column_values?.push({
              ...columnValue,
            });
          }
        }
      }

      if (mondayResponse?.data?.items?.[0]?.subitems?.length) {
        mondayResponse.data.items[0].subitems = [...items_subItem];
      }
    }
    return res.status(200).json(mondayResponse);
  } catch (err) {
    next(err);
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
  getEmailAndPersons,
  itemSubItems,
};
