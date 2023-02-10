const { monday } = require('../utils/monday');

const me = async () => {
  try {
    return await monday.api(`{
  me {
    id
  }
}
`);
  } catch (error) {
    throw error;
  }
};

const getItemDetails = async (id) => {
  try {
    return await monday.api(
      `
  query getItemDetails($ids: [Int]) {
    items(ids: $ids) {
      id
      board {
        id
      }
      column_values {
        id
        text
        title
        type
        value
      }
      name
      parent_item {
        id
      }
      state
    }
  }
  `,
      {
        variables: { ids: [id] },
      }
    );
  } catch (error) {
    throw error;
  }
};

const updateStatusColumn = async ({
  itemId,
  boardId,
  columnValue,
  columnId,
}) => {
  const value = JSON.stringify({
    [columnId]: {
      label: columnValue,
    },
  });
  try {
    return await monday.api(
      `mutation updateStatusColumn($boardId: Int!, $itemId: Int!, $value: JSON!) {
    change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $value, create_labels_if_missing: true) {
      id
    }
  }`,
      {
        boardId,
        itemId,
        value,
      }
    );
  } catch (error) {
    throw error;
  }
};

module.exports = { me, getItemDetails, updateStatusColumn };
