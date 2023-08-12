// const { async } = require('regenerator-runtime');
// const { getFieldValue } = require('../services/monday.service');

const getFormulaColumns = columnValues => {
  return columnValues.filter(column => column.type === 'formula');
};

/*

Formatted Table Data Structure

tableData = [

  [ {name,width} ]  //Columns
  [  ]// Row 1
  [  ]// Row 2
  [  ]// Row 3
]

*/

const getSubItems = (subItemSettings = [], items_subItem) => {
  const formattedTableData = [];
  formattedTableData[0] = [];
  let rowCount = 0;
  const { selectedColumn } = subItemSettings;
  formattedTableData[0][0] = { id: 'item-name', value: 'Item Name', size: 150 };

  selectedColumn?.forEach(col => {
    formattedTableData[0].push({ ...col, value: col?.title, size: 150 });
  });

  for (let i = 0; i < items_subItem?.length; i++) {
    if (rowCount > 19) break;
    const subItem = items_subItem[i];
    const rowData = [];
    rowData[0] = { id: 'item-name', value: subItem?.name || '' };

    for (let j = 0; j < selectedColumn.length; j++) {
      if (j > 4) break;
      let column = subItem?.column_values?.find(
        col => col.id === selectedColumn[j].id
      );
      // const formatCol = await getFieldValue(column, null, false);
      const colValue = {
        id: column.id,
        value: column?.value,
      };
      rowData.push(colValue);
    }

    rowCount = +1;
    formattedTableData.push(rowData);
  }
  return formattedTableData;
};

const parseFormulaColumnIds = formulaStr => {
  const formulaObject = JSON.parse(formulaStr);
  const finalFormula = formulaObject.formula;
  const formulaColumns = finalFormula.match(/\{(.*?)\}/g);

  return {
    formulaColumns: formulaColumns
      ? formulaColumns.map(columnName =>
          columnName.replace('{', '').replace('}', '')
        )
      : [],
    formula: finalFormula,
  };
};

function hasNestedIF(formula) {
  const regex = /IF\s*\([^)]*IF\s*\([^)]*\)*/g;

  const matches = formula.match(regex);

  if (matches && matches?.length === 1) {
    return true;
  }

  return false;
}

function convertToNestedIFS(formula) {
  // Check if the formula contains nested IF statements
  if (formula.includes('IF')) {
    // Split the formula into individual IF statements
    const statements = formula.split('IF').filter(Boolean);

    // Start building the nested IFS formula
    let nestedIFS = 'IFS(';

    // Convert each IF statement into nested IFS
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      const condition = statement.slice(1, statement.indexOf(','));
      const result = statement.slice(statement.indexOf(',') + 1, -1);

      // Add the condition and result to the nested IFS formula
      nestedIFS += `${condition}, ${result}`;

      // Add a comma and space for the next condition
      if (i < statements.length - 1) {
        nestedIFS += ', ';
      }
    }

    // Close the nested IFS formula
    nestedIFS += ')';

    return nestedIFS;
  }

  // If the formula is not nested, return it as is
  return formula;
}

const unSupportedFunctions = {
  MINUS: 'HF.MINUS',
  MULTIPLY: 'HF.MULTIPLY',
  DIVIDE: 'HF.DIVIDE',
};

const renameFunctions = formula => {
  let newFormula = formula;
  for (const key in unSupportedFunctions) {
    const value = unSupportedFunctions[key];
    const globalRegex = new RegExp(`${key}`, 'g');
    newFormula = newFormula.replace(globalRegex, value);
  }
  return newFormula;
};

module.exports = {
  parseFormulaColumnIds,
  getFormulaColumns,
  renameFunctions,
  hasNestedIF,
  convertToNestedIFS,
  getSubItems,
};
