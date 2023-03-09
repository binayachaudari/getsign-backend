const AuthenticatedBoardModel = require('../models/AuthenticatedBoard.model');
const { monday, setMondayToken } = require('../utils/monday');
const axios = require('axios');

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
  userId,
  accountId,
}) => {
  await setMondayToken(userId, accountId);
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
        variables: {
          boardId: Number(boardId),
          itemId: Number(itemId),
          value,
        },
      }
    );
  } catch (error) {
    throw error;
  }
};

const uploadContract = async ({ itemId, columnId, boardId, file }) => {
  const mondayToken = await AuthenticatedBoardModel.findOne({
    boardId,
  }).exec();
  const url = 'https://api.monday.com/v2/file';
  var query = `mutation add_file($file: File!) { add_file_to_column (file: $file, item_id: ${itemId}, column_id: "${columnId}") { id } }`;
  var data = '';
  const boundary = 'xxxxxxxxxxxxxxx';

  try {
    // construct query part
    data += '--' + boundary + '\r\n';
    data += 'Content-Disposition: form-data; name="query"; \r\n';
    data += 'Content-Type:application/json\r\n\r\n';
    data += '\r\n' + query + '\r\n';

    // construct file part
    data += '--' + boundary + '\r\n';
    data +=
      'Content-Disposition: form-data; name="variables[file]"; filename="' +
      file.name +
      '"\r\n';
    data += `Content-Type:${file.type}\r\n\r\n`;

    var payload = Buffer.concat([
      Buffer.from(data, 'utf8'),
      new Uint8Array(file.bytes),
      Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8'),
    ]);

    return await axios({
      url,
      method: 'post',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        Authorization: mondayToken.accessToken,
      },
      data: payload,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  } catch (error) {
    throw error;
  }
};

const getColumnValues = async (itemId) => {
  return await monday.api(
    `
    query getColumnValues($ids: [Int]) {
      items(ids: $ids) {
        id
        name
        column_values {
          id
          text
          title
          type
        }
      }
    }
    `,
    { variables: { ids: [Number(itemId)] } }
  );
};

const getEmailColumnValue = async (itemId, emailColId) => {
  return await monday.api(
    `
    query getEmailColumnValue($ids: [Int], $emailColId: [String]) {
      items(ids: $ids) {
        id
        column_values (ids: $emailColId) {
          id
          text
          title
          type
          value
          additional_info
        }
      }
    }
    `,
    { variables: { ids: [Number(itemId)], emailColId: [emailColId] } }
  );
};

module.exports = {
  me,
  getItemDetails,
  updateStatusColumn,
  getEmailColumnValue,
  getColumnValues,
  uploadContract,
};
