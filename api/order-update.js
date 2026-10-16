const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/order-update");

module.exports = adapt(handler);
