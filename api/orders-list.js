const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/orders-list");

module.exports = adapt(handler);
