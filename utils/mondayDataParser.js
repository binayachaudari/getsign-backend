const COLUMN_TYPES = {
  lookup: 'lookup', // type of a mirror column,
  mirror: 'mirror', //type inside a mirror columns setting_str->displayed_linked_columns[propertyPath]->["mirror"],
  email: 'email',
};

const MIRROR_EMAIL_COLUMN = 'mirror-email-column';

const isMirrorOfEmail = columnSettings => {
  const displayed_linked_columns = columnSettings.displayed_linked_columns;
  if (
    typeof displayed_linked_columns === 'object' &&
    Object.values(displayed_linked_columns)?.[0]?.[0] === COLUMN_TYPES.email
  )
    return true;
  return false;
};

const formatBoardColumns = board => {
  for (let i = 0; i < board.columns.length; i++) {
    const column = board.columns[i];
    if (column.type !== COLUMN_TYPES.lookup) continue;
    const columnSettings = JSON.parse(column.settings_str);
    const isMirroredEmail = isMirrorOfEmail(columnSettings);
    if (isMirroredEmail) {
      column.type = MIRROR_EMAIL_COLUMN;
    }
    board.columns[i] = column;
  }
  return board;
};

const MondayDataFormatter = {
  formatBoardColumns,
};

module.exports = MondayDataFormatter;
