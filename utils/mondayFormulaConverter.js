const symbolMapper = new Map([['dollar', '$']]);

const formulaeParser = formula => {
  const regex = /^=(\w+)\((.+)\)$/;

  const matches = formula.match(regex);

  if (matches && matches.length === 3) {
    const symbol = matches[1]?.toLowerCase();
    const calculation = matches[2];

    if (symbolMapper.get(symbol)) {
      return {
        symbol: symbolMapper.get(symbol),
        formula: `=(${calculation})`,
      };
    }
    return {
      symbol: null,
      formula,
    };
  } else {
    return {
      symbol: null,
      formula,
    };
  }
};

module.exports = {
  formulaeParser,
};
