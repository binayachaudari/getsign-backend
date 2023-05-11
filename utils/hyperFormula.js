const { HyperFormula } = require('hyperformula');
const DATES_CUSTOM_PLUGINS = require('./hyperFormulaDatePlugin');

HyperFormula.registerFunctionPlugin(
  DATES_CUSTOM_PLUGINS,
  DATES_CUSTOM_PLUGINS.translations
);

module.exports = HyperFormula;
