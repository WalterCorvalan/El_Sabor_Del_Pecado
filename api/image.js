const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/image");

module.exports = adapt(handler);
