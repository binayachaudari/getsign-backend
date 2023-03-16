const { monday } = require('../utils/monday');

const backOfficeMondayToken = process.env.BACK_OFFICE_TOKEN;
const boardId = process.env.BACK_OFFICE_CUSTOMER_BOARD_ID;

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

  const today = new Date();

  const year = today.getFullYear();
  const month = today.getUTCMonth() + 1;
  const date = today.getUTCDate();

  const hours = today.getUTCHours();
  const minutes = today.getUTCMinutes();
  const seconds = today.getUTCSeconds();

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
      date: `${year}-${('0' + month).slice(-2)}-${('0' + date).slice(-2)}`,
      time: `${('0' + hours).slice(-2)}:${('0' + minutes).slice(-2)}:${(
        '0' + seconds
      ).slice(-2)}`,
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

module.exports = {
  backOfficeAddItem,
};
