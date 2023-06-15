const pricingV1 = new Map([
  [
    '30seats',
    {
      max_seats: 30,
      min_seats: 1,
      monthly: 60,
      yearly: 660,
    },
  ],
  [
    '60seats',
    {
      max_seats: 60,
      min_seats: 31,
      monthly: 95,
      yearly: 1020,
    },
  ],
  [
    '120seats',
    {
      max_seats: 120,
      min_seats: 61,
      monthly: 195,
      yearly: 2160,
    },
  ],
  [
    '240seats',
    {
      max_seats: 240,
      min_seats: 121,
      monthly: 295,
      yearly: 3120,
    },
  ],
  [
    '400seats',
    {
      max_seats: 400,
      min_seats: 241,
      monthly: 395,
      yearly: 4345,
    },
  ],
  [
    '600seats',
    {
      max_seats: 600,
      min_seats: 401,
      monthly: 495,
      yearly: 5340,
    },
  ],
  [
    '1000seats',
    {
      max_seats: 1000,
      min_seats: 601,
      monthly: 695,
      yearly: 7644,
    },
  ],
  [
    '1000plus',
    {
      max_seats: Infinity,
      min_seats: 1001,
      monthly: 895,
      yearly: 9840,
    },
  ],
]);

module.exports = { pricingV1 };
