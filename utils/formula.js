const { HyperFormula } = require('hyperformula');
const {
  getFieldValue,
  getSpecificColumnValue,
} = require('../services/monday.service');
const { formulaeParser } = require('./mondayFormulaConverter');
const { toFixed } = require('./number');

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

const getSubItems = async (subItemSettings = {}, items_subItem) => {
  const formattedTableData = [];
  const columnWidths = subItemSettings?.columnWidth;
  formattedTableData[0] = [];
  let rowCount = 0;
  const { columns: selectedColumn } = subItemSettings;
  formattedTableData[0][0] = {
    id: 'item-name',
    value: 'Item',
    size: columnWidths['item-name'],
  };

  selectedColumn?.forEach(col => {
    formattedTableData[0].push({
      ...col,
      value: col?.title,
      size: columnWidths?.[col.id],
    });
  });

  for (let i = 0; i < items_subItem?.length; i++) {
    if (rowCount > 19) break;
    const subItem = items_subItem[i];

    const rowData = [];
    rowData[0] = { id: 'item-name', value: subItem?.name || '' };

    for (let j = 0; j < selectedColumn?.length; j++) {
      if (j > 4) break;
      let column = subItem?.column_values?.find(
        col => col.id === selectedColumn[j].id
      );

      const boardColumn = subItem?.board?.columns?.find(
        col => col.id === selectedColumn[j].id
      );

      let formatCol = '';

      if (column) {
        if (column.type == 'formula') {
          formatCol = column?.text || '';
        } else {
          formatCol = await getFieldValue(column, null);
        }
      }

      const colValue = {
        ...column,
        id: column.id,
        value: formatCol,
        settings_str: boardColumn?.settings_str || JSON.stringify({}),
        type: column.type,
      };

      rowData.push(colValue);
    }
    rowCount += 1;
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

// This utility function will calculate the value of all the column with type formula

/*
itemId => id of item or subitem
boardColumns => board.columns of item or subitem
boardColumnValues => item/subitem.column_values

*/
const getFormulaValueOfItem = async ({
  boardColumns,
  boardColumnValues,
  itemId,
}) => {
  const boardFormulaColumnValues = new Map();

  const formulas = [];

  const formulaColumns = getFormulaColumns(boardColumnValues || []);

  if (formulaColumns.length > 0) {
    const boardformulaColumns = boardColumns?.filter(
      col => col?.type === 'formula'
    );

    for (const columnValue of boardformulaColumns) {
      boardFormulaColumnValues.set(
        columnValue.id,
        parseFormulaColumnIds(columnValue.settings_str)
      );
    }

    for (const columnValue of boardformulaColumns) {
      const parsedFormulaColumn = parseFormulaColumnIds(
        columnValue.settings_str
      );

      let parsedRecursiveFormula = parsedFormulaColumn.formula;

      parsedFormulaColumn?.formulaColumns?.map(item => {
        let currentItemValue = boardFormulaColumnValues.get(item);
        if (currentItemValue?.formula || currentItemValue) {
          const globalRegex = new RegExp(`{${item}}`, 'g');
          parsedRecursiveFormula = parsedRecursiveFormula.replace(
            globalRegex,
            currentItemValue || currentItemValue?.formula
          );
        }
      });

      boardFormulaColumnValues.set(columnValue.id, parsedRecursiveFormula);
    }

    let finalFormula;
    for (const column of boardformulaColumns) {
      const formulaColumnValues = new Map();
      const parsedColumn = parseFormulaColumnIds(column?.settings_str);
      finalFormula = parsedColumn.formula;

      for (const item of boardColumnValues) {
        if (
          parsedColumn.formulaColumns?.length &&
          parsedColumn.formulaColumns.includes(item.id)
        ) {
          let columnValue;

          if (item.type === 'formula') {
            columnValue = boardFormulaColumnValues.get(item.id);
            columnValue = '=' + columnValue.replace(/'/g, '"');
            columnValue = renameFunctions(columnValue);
            const parsedFormula = formulaeParser(columnValue);
            columnValue = parsedFormula.formula;
          } else {
            columnValue = await getSpecificColumnValue(itemId, item.id);
          }
          formulaColumnValues.set(
            {
              id: item.id,
            },
            columnValue
          );
        }
      }
      const formulaColumnsKeys = Array.from(formulaColumnValues.keys());
      for (let index = 0; index < formulaColumnsKeys.length; index++) {
        const key = formulaColumnsKeys[index];
        const chr = String.fromCharCode(97 + index).toUpperCase();
        const globalRegex = new RegExp(`{${key?.id}}`, 'g');
        finalFormula = finalFormula.replace(globalRegex, `${chr}1`);
      }

      // check if this is nested IF Conditions
      const isNestedFormulae = hasNestedIF(finalFormula);

      if (isNestedFormulae) {
        // Remove 'IF' and remove the nested parentheses
        const ifsFormula = finalFormula
          .replace(/IF/g, '')
          .replace(/\(/g, '')
          .replace(/\)/g, '');

        // Split the formula into individual conditions and values
        const conditionsAndValues = ifsFormula.split(', ');

        // Construct the IFS syntax
        finalFormula = 'IFS(' + conditionsAndValues.join(', ') + ')';
      }

      finalFormula = '=' + finalFormula.replace(/'/g, '"');
      finalFormula = renameFunctions(finalFormula);
      const parsedFormula = formulaeParser(finalFormula);

      // Hyper Formula Plugin
      const formulaRow = [
        ...Array.from(formulaColumnValues.values()),
        parsedFormula.formula,
      ];

      const hfInstance = HyperFormula.buildFromArray([formulaRow], {
        licenseKey: 'gpl-v3',
        useColumnIndex: true,
        smartRounding: false,
      });

      let finalFormulaValue = hfInstance.getCellValue({
        sheet: 0,
        col: formulaRow.length - 1,
        row: 0,
      });

      finalFormulaValue = isNaN(finalFormulaValue)
        ? finalFormulaValue
        : toFixed(finalFormulaValue, 2);
      if (typeof finalFormulaValue !== 'object') {
        boardFormulaColumnValues.set(column.id, finalFormulaValue);
        const alreadyExistsIdx = formulas.findIndex(
          formValue => formValue.id === column?.id
        );

        if (alreadyExistsIdx > -1) {
          formulas[alreadyExistsIdx].text = parsedFormula.symbol
            ? `${parsedFormula?.symbol}${finalFormulaValue}`
            : finalFormulaValue;
        } else {
          formulas.push({
            ...column,
            text: parsedFormula.symbol
              ? `${parsedFormula?.symbol}${finalFormulaValue}`
              : finalFormulaValue,
          });
        }
      } else {
        boardFormulaColumnValues.set(column.id, '0');
        const alreadyExistsIdx = formulas.findIndex(
          formValue => formValue.id === column?.id
        );
        if (alreadyExistsIdx > -1) {
          formulas[alreadyExistsIdx].text = parsedFormula.symbol
            ? `${parsedFormula?.symbol}${0}`
            : '0';
        } else {
          formulas.push({
            ...column,
            text: parsedFormula.symbol ? `${parsedFormula?.symbol}${0}` : '0',
          });
        }
      }
    }
  }

  return formulas;
};

module.exports = {
  parseFormulaColumnIds,
  getFormulaColumns,
  renameFunctions,
  hasNestedIF,
  convertToNestedIFS,
  getSubItems,
  getFormulaValueOfItem,
};
