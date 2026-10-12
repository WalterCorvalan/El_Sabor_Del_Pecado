const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/catalog-get");

module.exports = adapt(handler);
