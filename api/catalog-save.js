const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/catalog-save");

module.exports = adapt(handler);
