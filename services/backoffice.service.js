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
        type
        additional_info
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

  const requiresUpdate = columnValues.some((item) => {
    if (item.type === 'color' && typeof item.additional_info === 'string') {
      const value = JSON.parse(item.additional_info);

      return value.label === null;
    }
    return !item?.value;
  });

  const values = JSON.stringify({
    status2: {
      label: 'Yes',
    },
    date: {
      ...getDateAndTime(),
    },
  });

  if (requiresUpdate) {
    await updateColumnValues(itemId, values);
  }

  return;
};

const backOfficeSavedDocument = async (itemId) => {
  monday.setToken(backOfficeMondayToken);

  const prevValues = await getItemDetails({
    itemId: itemId,
    columnIds: ['color', 'date40'],
  });

  const columnValues = prevValues?.data?.items?.[0]?.column_values;

  const requiresUpdate = columnValues.some((item) => {
    if (item.type === 'color' && typeof item.additional_info === 'string') {
      const value = JSON.parse(item.additional_info);

      return value.label === null;
    }
    return !item?.value;
  });

  const values = JSON.stringify({
    color: {
      label: 'Yes',
    },
    date40: {
      ...getDateAndTime(),
    },
  });

  if (requiresUpdate) {
    await updateColumnValues(itemId, values);
  }

  return;
};

const backOfficeSentDocument = async (itemId) => {
  monday.setToken(backOfficeMondayToken);

  const prevValues = await getItemDetails({
    itemId: itemId,
    columnIds: ['color8', 'date9'],
  });

  const columnValues = prevValues?.data?.items?.[0]?.column_values;

  const requiresUpdate = columnValues.some((item) => {
    if (item.type === 'color' && typeof item.additional_info === 'string') {
      const value = JSON.parse(item.additional_info);

      return value.label === null;
    }
    return !item?.value;
  });

  const values = JSON.stringify({
    color8: {
      label: 'Yes',
    },
    date9: {
      ...getDateAndTime(),
    },
  });

  if (requiresUpdate) {
    await updateColumnValues(itemId, values);
  }

  return;
};

const backOfficeDocumentSigned = async (itemId) => {
  monday.setToken(backOfficeMondayToken);

  const prevValues = await getItemDetails({
    itemId: itemId,
    columnIds: ['color9', 'date99'],
  });

  const columnValues = prevValues?.data?.items?.[0]?.column_values;

  const requiresUpdate = columnValues.some((item) => {
    if (item.type === 'color' && typeof item.additional_info === 'string') {
      const value = JSON.parse(item.additional_info);

      return value.label === null;
    }
    return !item?.value;
  });

  const values = JSON.stringify({
    color9: {
      label: 'Yes',
    },
    date99: {
      ...getDateAndTime(),
    },
  });

  if (requiresUpdate) {
    await updateColumnValues(itemId, values);
  }

  await backOfficeUpdateTotalSigned(itemId);

  return;
};

const backOffice5DocumentSent = async (itemId) => {
  monday.setToken(backOfficeMondayToken);

  const prevValues = await getItemDetails({
    itemId: itemId,
    columnIds: ['color0', 'date2'],
  });

  const columnValues = prevValues?.data?.items?.[0]?.column_values;

  const requiresUpdate = columnValues.some((item) => {
    if (item.type === 'color' && typeof item.additional_info === 'string') {
      const value = JSON.parse(item.additional_info);

      return value.label === null;
    }
    return !item?.value;
  });

  const values = JSON.stringify({
    color0: {
      label: 'Yes',
    },
    date2: {
      ...getDateAndTime(),
    },
  });

  if (requiresUpdate) {
    await updateColumnValues(itemId, values);
  }

  return;
};

const backOfficeItemViewInstalled = async (itemId) => {
  monday.setToken(backOfficeMondayToken);

  const prevValues = await getItemDetails({
    itemId: itemId,
    columnIds: ['status7'],
  });

  const columnValues = prevValues?.data?.items?.[0]?.column_values;

  const requiresUpdate = columnValues.some((item) => {
    if (item.type === 'color' && typeof item.additional_info === 'string') {
      const value = JSON.parse(item.additional_info);

      return value.label === null;
    }
    return !item?.value;
  });

  const values = JSON.stringify({
    status7: {
      label: 'Yes',
    },
  });

  if (requiresUpdate) {
    await updateColumnValues(itemId, values);
  }

  return;
};

const backOfficeUpdateTotalSent = async (itemId, totalCount = 0) => {
  monday.setToken(backOfficeMondayToken);

  const values = JSON.stringify({
    numbers5: totalCount,
  });

  await updateColumnValues(itemId, values);
};

const backOfficeUpdateTotalSigned = async (itemId) => {
  monday.setToken(backOfficeMondayToken);

  const prevValues = await getItemDetails({
    itemId: itemId,
    columnIds: ['numbers4'],
  });

  const columnValues = prevValues?.data?.items?.[0]?.column_values;

  const prevTotalSigned =
    columnValues?.[0]?.value === null
      ? 0
      : Number(JSON.parse(columnValues?.[0]?.value));

  const values = JSON.stringify({
    numbers4: prevTotalSigned >= 0 ? prevTotalSigned + 1 : 0,
  });

  await updateColumnValues(itemId, values);
};

module.exports = {
  backOfficeAddItem,
  backOfficeUploadedDocument,
  backOfficeSavedDocument,
  backOfficeSentDocument,
  backOfficeDocumentSigned,
  backOffice5DocumentSent,
  backOfficeItemViewInstalled,
  backOfficeUpdateTotalSent,
  backOfficeUpdateTotalSigned,
};
