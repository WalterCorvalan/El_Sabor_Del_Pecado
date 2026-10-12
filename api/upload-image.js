const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/upload-image");

module.exports = adapt(handler);
