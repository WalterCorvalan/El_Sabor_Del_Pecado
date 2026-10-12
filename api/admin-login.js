const adapt = require("./_lib/adapt");
const { handler } = require("../netlify/functions/admin-login");

module.exports = adapt(handler);
