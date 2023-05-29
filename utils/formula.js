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
};
