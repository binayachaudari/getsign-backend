function toFixed(num, fixed = 3) {
  if (!num.toString().includes('.')) return num.toString();

  return Number(num).toFixed(fixed);
}

module.exports = {
  toFixed,
};
