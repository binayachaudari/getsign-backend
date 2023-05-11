function toFixed(num, fixed = 3) {
  if (!num.toString().includes('.')) return num.toString();
  var re = new RegExp('^-?\\d+(?:.\\d{0,' + (fixed || -1) + '})?');
  return num.toString().match(re)[0];
}

module.exports = {
  toFixed,
};
