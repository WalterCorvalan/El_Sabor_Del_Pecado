const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/order-create");

module.exports = adapt(handler);
