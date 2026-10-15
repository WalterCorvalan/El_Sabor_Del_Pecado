const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/catalog-reset");

module.exports = adapt(handler);
