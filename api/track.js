const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/track");

module.exports = adapt(handler);
