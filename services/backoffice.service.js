const { monday } = require('../utils/monday');

const backOfficeMondayToken = process.env.BACK_OFFICE_TOKEN;
const boardId = process.env.BACK_OFFICE_CUSTOMER_BOARD_ID;

const getItemDetails = async ({ itemId, columnIds }) => {
  return await monday.api(
    `
  query getItemDetails($ids: [Int], $columnIds: [String]) {
    items(ids: $ids) {
      id
      column_values(ids: $columnIds) {
        value
      }
    }
  }
  `,
    {
      variables: {
        ids: [Number(itemId)],
        columnIds,
      },
    }
  );
};

const updateColumnValues = async (itemId, values) => {
  return await monday.api(
    `
  mutation updateColumnValues($itemId: Int, $boardId: Int!, $values: JSON!) {
    change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $values) {
      id
    }
  }
  `,
    {
      variables: {
        itemId: Number(itemId),
        boardId: Number(boardId),
        values,
      },
    }
  );
};

const getDateAndTime = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getUTCMonth() + 1;
  const date = today.getUTCDate();

  const hours = today.getUTCHours();
  const minutes = today.getUTCMinutes();
  const seconds = today.getUTCSeconds();

  return {
    date: `${year}-${('0' + month).slice(-2)}-${('0' + date).slice(-2)}`,
    time: `${('0' + hours).slice(-2)}:${('0' + minutes).slice(-2)}:${(
      '0' + seconds
    ).slice(-2)}`,
  };
};

const backOfficeAddItem = async ({
  customerName,
  accountId,
  accountEmail,
  slug,
  username,
  subscription,
  tier,
}) => {
  if (!backOfficeMondayToken) {
    throw 'Cannot find back office token';
  }

  if (!boardId) {
    throw 'Back office boardId not provided';
  }

  monday.setToken(backOfficeMondayToken);
  const itemsByAccountId = await monday.api(
    `
  query getItemByColumnValue($boardId: Int!, $columnId: String!, $columnValue: String!) {
    items_by_column_values (board_id: $boardId, column_id: $columnId, column_value: $columnValue) {
        id
        name
    }
}
  `,
    {
      variables: {
        boardId: Number(boardId),
        columnId: 'numbers',
        columnValue: accountId.toString(),
      },
    }
  );

  if (itemsByAccountId?.data?.items_by_column_values?.length) {
    return;
  }

  const payload = {
    numbers: accountId,
    email: {
      email: accountEmail,
      text: accountEmail,
    },
    text_1: slug,
    text: username,
    status: {
      label: subscription,
    },
    status5: {
      label: tier,
    },
    date4: {
      ...getDateAndTime(),
    },
  };

  const values = JSON.stringify(payload);

  return await monday.api(
    `
    mutation createItem($itemName: String!, $boardId: Int!, $values: JSON) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $values) {
        id
      }
    }     
  `,
    {
      variables: {
        boardId: Number(boardId),
        itemName: customerName,
        values,
      },
    }
  );
};

const backOfficeUploadedDocument = async (itemId) => {
  monday.setToken(backOfficeMondayToken);

  const prevValues = await getItemDetails({
    itemId: itemId,
    columnIds: ['status2', 'date'],
  });

  const columnValues = prevValues?.data?.items?.[0]?.column_values;

  const requiresUpdate = columnValues.some((item) => !item?.values);

  const values = JSON.stringify({
    status2: {
      label: 'Yes',
    },
    date: {
      ...getDateAndTime(),
    },
  });

  if (requiresUpdate) {
    const test = await updateColumnValues(itemId, values);
  }

  return;
};

module.exports = {
  backOfficeAddItem,
  backOfficeUploadedDocument,
};
