const { monday } = require('../utils/monday');

const me = async () => {
  return await monday.api(`{
  me {
    id
  }
}
`);
};

module.exports = { me };
