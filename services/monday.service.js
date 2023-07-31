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

const getItemDetails = async id => {
  try {
    return await monday.api(
      `
  query getItemDetails($ids: [Int]) {
    items(ids: $ids) {
      id
      board {
        id
        name
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
    const result = await monday.api(
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
    return result;
  } catch (error) {
    throw error;
  }
};

const uploadContract = async ({
  itemId,
  columnId,
  file,
  userId,
  accountId,
}) => {
  const accessToken = await setMondayToken(userId, accountId);
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
        Authorization: accessToken,
      },
      data: payload,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  } catch (error) {
    throw error;
  }
};

const getColumnValues = async itemId => {
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

const getColumnDetails = async (itemId, columnIds) => {
  return await monday.api(
    `
    query getColumnDetails($ids: [Int], $columnIds: [String]) {
      items(ids: $ids) {
        id
        name
        board {
          columns (ids:$columnIds) {
            id
            title
            type
            settings_str
          }
        }
      }
    }
    `,
    { variables: { ids: [Number(itemId)], columnIds } }
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

const getUsers = async usersIds => {
  try {
    const users = await monday.api(`query { users (ids: ${usersIds}) {
                id, name
            }}`);

    if (
      users.hasOwnProperty('error_message') ||
      users.hasOwnProperty('error_code') ||
      users.hasOwnProperty('errors')
    ) {
      throw {
        status: 403,
        message: users?.errors?.[0]?.message,
      };
    }
    if (users && users.data && users.data.users) {
      return users.data.users;
    }
    return null;
  } catch (error) {
    console.log('Error while get user', error.message);
    throw error;
  }
};

// Get team data by id
const getTeams = async teamsIds => {
  try {
    const teams = await monday.api(`query { teams (ids: ${teamsIds}) {
                id, name
            }}`);
    if (
      teams.hasOwnProperty('error_message') ||
      teams.hasOwnProperty('error_code') ||
      teams.hasOwnProperty('errors')
    ) {
      throw {
        status: 403,
        message: teams?.errors?.[0]?.message,
      };
    }
    if (teams && teams.data && teams.data.teams) {
      return teams.data.teams;
    }
    return null;
  } catch (error) {
    console.log('Error while get teams', error.message);
    throw error;
  }
};

// Get field value and handle many column types
async function getFieldValue(column, itemId, searchMode = true) {
  let value = '';
  let jsonObj = '';
  const { type } = column;

  try {
    jsonObj = isNaN(column.value) ? JSON.parse(column.value) : column.value;
  } catch (error) {
    jsonObj = value =
      column.value != null ? column.value.replace('"', '') : column.value;
  }

  const additional_info = column.additional_info
    ? JSON.parse(column.additional_info)
    : null;

  // Handle status
  if (type === 'color') {
    const additional_info = column.additional_info
      ? JSON.parse(column.additional_info)
      : column.label;
    if (searchMode) {
      value =
        !column.value && column.text
          ? column.text
          : additional_info
          ? additional_info.label
          : '';
    } else {
      value = JSON.stringify({
        label:
          !column.value && column.text
            ? column.text
            : additional_info
            ? additional_info.label
            : '',
      });
    }
    // Handle datetime
  } else if (type === 'date') {
    if (searchMode) {
      value = jsonObj ? jsonObj.date : '';
      if (jsonObj && jsonObj.time) {
        value = value + ' ' + jsonObj.time;
      }
    } else {
      if (!jsonObj) {
        value = JSON.stringify({
          date: '',
          time: '',
        });
      } else if (jsonObj && jsonObj.time && jsonObj.date) {
        value = JSON.stringify({
          date: jsonObj.date,
          time: jsonObj.time,
        });
      } else if (jsonObj && jsonObj.date) {
        value = JSON.stringify({
          date: jsonObj.date,
        });
      } else if (jsonObj && jsonObj.time) {
        value = JSON.stringify({
          time: jsonObj.time,
        });
      }
    }
    // Handle PersonAndTeams
  } else if (type === 'multiple-person') {
    const persons = jsonObj ? jsonObj.personsAndTeams : [];
    let personsIds = [];
    let teamsIds = [];
    let personsAndTeamsIds = [];
    let personsAndTeamsNames = [];
    let personsAndTeamsObj = [];
    for (let index = 0; index < persons.length; index++) {
      const person = persons[index];
      if (person.kind === 'person') {
        personsIds.push(person.id);
      } else if (person.kind === 'team') {
        teamsIds.push(person.id);
      }
      personsAndTeamsIds.push(person.id);
      personsAndTeamsObj.push({
        id: person.id,
        kind: person.kind,
      });
    }

    if (searchMode) {
      if (personsIds.length > 0) {
        const mondayUsers = await getUsers(JSON.stringify(personsIds));
        if (mondayUsers) {
          for (let index = 0; index < mondayUsers.length; index++) {
            const user = mondayUsers[index];
            personsAndTeamsNames.push(user.name);
          }
        }
      }
      if (teamsIds.length > 0) {
        const mondayTeams = await getTeams(JSON.stringify(teamsIds));
        if (mondayTeams) {
          for (let index = 0; index < mondayTeams.length; index++) {
            const team = mondayTeams[index];
            personsAndTeamsNames.push(team.name);
          }
        }
      }
      value = personsAndTeamsNames.toString();
    } else {
      if (personsAndTeamsObj.length > 0) {
        value = JSON.stringify({ personsAndTeams: personsAndTeamsObj });
      }
    }
    // Handle Phone
  } else if (type === 'phone') {
    if (searchMode) {
      value = `${jsonObj ? jsonObj.phone : ''}`;
    } else {
      value = JSON.stringify({
        phone: `${jsonObj ? jsonObj.phone : ''}`,
        countryShortName: `${jsonObj ? jsonObj.countryShortName : ''}`,
      });
    }
  } else if (type === 'email') {
    if (searchMode) {
      value = `${
        jsonObj ? jsonObj.email.replace(/[^a-zA-Z0-9-_@.]/g, '') : ''
      }`;
    } else {
      value = JSON.stringify({
        email: `${
          jsonObj ? jsonObj.email.replace(/[^a-zA-Z0-9-_@.]/g, '') : ''
        }`,
        text: `${
          jsonObj
            ? (jsonObj.text || jsonObj.email).replace(/[^a-zA-Z0-9-_@.]/g, '')
            : ''
        }`,
      });
    }
  } else if (type === 'text' || type == 'name') {
    if (searchMode) {
      value = `${jsonObj || ''}`;
    } else {
      value = JSON.stringify(jsonObj || '');
    }
    if (value) {
      value = value.replace(/\\/g, '\\\\');
    }
  } else if (type === 'numeric') {
    value = column.value ? jsonObj : '0';
    if (searchMode) {
      value = `${
        jsonObj != null
          ? jsonObj +
            (additional_info?.symbol === '%' ? additional_info?.symbol : '')
          : ''
      }`;
    } else {
      value = JSON.stringify(
        jsonObj != null
          ? jsonObj +
              (additional_info?.symbol === '%' ? additional_info?.symbol : '')
          : ''
      );
    }
  } else if (type === 'pulse-id') {
    jsonObj = itemId || jsonObj.text;
    value = itemId || jsonObj.text;
  } else if (type === 'timerange') {
    if (searchMode) {
      value = `${jsonObj ? jsonObj.from + ' - ' + jsonObj.to : ''}`;
    } else {
      value = JSON.stringify({
        from: `${jsonObj ? jsonObj.from : ''}`,
        to: `${jsonObj ? jsonObj.to : ''}`,
      });
    }
  } else if (type === 'long-text') {
    if (searchMode) {
      value = `${jsonObj ? jsonObj.text.replace('"', '') : ''}`;
    } else {
      value = JSON.stringify({
        text: `${jsonObj ? jsonObj.text : '""'}`,
      });
    }
    if (value) {
      value = value.replace(/\\/g, '\\\\');
    }
  } else if (type === 'boolean') {
    if (searchMode) {
      value = `${jsonObj ? jsonObj.checked : ''}`;
    } else {
      value =
        jsonObj && jsonObj.checked
          ? JSON.stringify({
              checked: `${jsonObj.checked}`,
            })
          : '{}';
    }
  } else if (type === 'rating') {
    if (searchMode) {
      value = `${jsonObj ? jsonObj.rating : ''}`;
    } else {
      value = JSON.stringify({
        rating: jsonObj ? jsonObj.rating : '',
      });
    }
  } else if (type === 'link') {
    if (searchMode) {
      value = `${jsonObj ? jsonObj.url : ''}`;
    } else {
      value = JSON.stringify({
        url: `${jsonObj ? jsonObj.url : ''}`,
        text: `${jsonObj ? jsonObj.text : ''}`,
      });
    }
  } else if (type === 'color-picker') {
    value = jsonObj ? JSON.stringify(jsonObj.color) : '{}';
  } else if (type == 'country') {
    if (searchMode) {
      value = `${jsonObj ? jsonObj.countryName : ''}`;
    } else {
      value = JSON.stringify({
        countryCode: `${jsonObj ? jsonObj.countryCode : ''}`,
        countryName: `${jsonObj ? jsonObj.countryName : ''}`,
      });
    }
  } else if (type === 'tag') {
    if (searchMode) {
      value = `${jsonObj && jsonObj.tag_ids ? jsonObj.tag_ids.toString() : ''}`;
    } else {
      value = JSON.stringify(jsonObj);
    }
  } else if (type === 'votes') {
    value = jsonObj
      ? JSON.stringify({
          votersIds: jsonObj.votersIds,
        })
      : '[]';
  } else if (type === 'dropdown') {
    if (jsonObj && jsonObj.ids && jsonObj.ids.length && column.text) {
      const labels = column.text.split(',');
      value = JSON.stringify({ labels });
      if (searchMode) {
        value = `${column.text}`;
      }
    } else {
      value = '[]';
    }
  } else if (type === 'timezone') {
    if (searchMode) {
      value = `${jsonObj && jsonObj.timezone ? jsonObj.timezone : ''}`;
    } else {
      value = jsonObj ? JSON.stringify(jsonObj) : '{"timezone": ""}';
    }
  } else if (type === 'week') {
    value = jsonObj ? JSON.stringify(jsonObj) : '{"week": ""}';
  } else if (type === 'hour') {
    if (searchMode) {
      if (jsonObj && jsonObj.hour >= 0) {
        let { hour, minute } = jsonObj;
        const AmOrPm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        value = hour + ':' + ('0' + minute).slice(-2) + ' ' + AmOrPm;
      } else {
        value = '';
      }
    } else {
      value = jsonObj ? JSON.stringify(jsonObj) : '{}';
    }
    // Handle file
  } else if (type === 'file') {
    let allFilesList = [];
    const files = jsonObj ? jsonObj.files : [];
    if (files && files.length > 0) {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        if (file.fileType === 'ASSET') {
          // // const assetsIds = files.map(file => file.assetId);
          // if (file.assetId) {
          //   const monday_files = await Monday.getFile([file.assetId]);
          //   if (monday_files.length > 0) {
          //     allFilesList = [...allFilesList, ...monday_files];
          //     //    files_urls = monday_files.map(file => file.public_url)
          //   }
          // }
        } else {
          allFilesList.push(file);
        }
      }
    }
    value = JSON.stringify(allFilesList);
  } else if (type === 'board-relation') {
    const linkedItems = jsonObj ? jsonObj.linkedPulseIds : null;
    let itemIds = [];
    if (linkedItems) {
      itemIds = linkedItems.map(i => i.linkedPulseId);
      value = JSON.stringify({ item_ids: itemIds });
    } else {
      value = '{}';
    }
  } else if (type === 'lookup') {
    if (!isNaN(column.text)) value = Number(column.text);
    else if (typeof column.text === 'string') {
      value = column.text;
    }
  } else if (type === 'location') {
    value =
      jsonObj && jsonObj.lat && jsonObj.lng
        ? JSON.stringify({
            lat: jsonObj.lat,
            lng: jsonObj.lng,
            address: jsonObj.address.replace(/[\n\r\t]/g),
          })
        : '{}';
  } else {
    value = jsonObj;
  }
  return value;
}

const getSpecificColumnValue = async (itemId, columnIds) => {
  const res = await monday.api(
    `
    query getSpecificColumnValue($ids: [Int], $columnIds: [String]) {
      items(ids: $ids) {
        id
        column_values (ids: $columnIds) {
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
    { variables: { ids: [Number(itemId)], columnIds } }
  );

  const column = res?.data?.items?.[0]?.column_values?.[0];
  return getFieldValue(column);
};

const runMondayQuery = async ({
  userId,
  accountId,
  query,
  queryOptions,
  callback = data => data,
}) => {
  await setMondayToken(userId, accountId);

  return monday
    .api(query, queryOptions)
    .then(res => {
      console.log('Create new column response===>', res);
      return res;
    })
    .catch(err => {
      console.log('Error while changing new column values ==>', err);
      throw err;
    });
};

/*
rawColumnDatas type = [
  {
    columnId:"",
    columnValue:"",
   
  }
]
*/
const updateMultipleTextColumnValues = async ({
  itemId,
  boardId,
  userId,
  accountId,
  textBoxFields,
}) => {
  await setMondayToken(userId, accountId);

  const fetch_board_columns = `
    query($ids:[Int]){
      boards(ids:$ids){
        columns{
          id
        }
      }
    }
  `;

  const fetch_board_columns_option = {
    variables: {
      ids: Number(boardId),
    },
  };

  const fetch_Board_response = await monday.api(
    fetch_board_columns,
    fetch_board_columns_option
  );

  let board_columns =
    fetch_Board_response?.data?.boards?.[0]?.columns?.map(col => col.id) ||
    null;

  if (board_columns?.length > 0) {
    let query = `
    mutation($item_id:Int,$board_id:Int!,$column_values:JSON!){
      change_multiple_column_values(item_id:$item_id,board_id:$board_id,column_values:$column_values){
        id
      }
    }
  `;

    const change_multiple_column_values_options = {
      variables: {
        item_id: Number(itemId),
        board_id: Number(boardId),
      },
    };
    let column_values = {};

    for (const textBoxField of textBoxFields) {
      if (
        textBoxField?.content &&
        board_columns.includes(textBoxField.column.value)
      ) {
        column_values[textBoxField.column.value] = textBoxField.content;
      }
    }

    change_multiple_column_values_options.variables.column_values =
      JSON.stringify(column_values);

    return monday
      .api(query, change_multiple_column_values_options)
      .then(res => {
        console.log('Change multiple column values response===>', res);
        return res;
      })
      .catch(err => {
        console.log(
          'Error while changing multiple text column values ==>',
          err
        );
        throw err;
      });
  }

  return false;
};

module.exports = {
  me,
  getItemDetails,
  updateStatusColumn,
  getEmailColumnValue,
  getColumnValues,
  uploadContract,
  getColumnDetails,
  getSpecificColumnValue,
  runMondayQuery,
  updateMultipleTextColumnValues,
};
