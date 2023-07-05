const getFormulaColumns = (columnValues) => {
  return columnValues.filter((column) => column.type === 'formula');
};

const parseFormulaColumnIds = (formulaStr) => {
  const formulaObject = JSON.parse(formulaStr);
  const finalFormula = formulaObject.formula;
  const formulaColumns = finalFormula.match(/\{(.*?)\}/g);

  return {
    formulaColumns: formulaColumns
      ? formulaColumns.map((columnName) =>
          columnName.replace('{', '').replace('}', '')
        )
      : [],
    formula: finalFormula,
  };
};

function hasNestedIF(formula) {
  const regex = /\bIF\b.*\bIF\b/;
  return regex.test(formula);
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

const renameFunctions = (formula) => {
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
};
