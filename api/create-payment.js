const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/create-payment");

module.exports = adapt(handler);
