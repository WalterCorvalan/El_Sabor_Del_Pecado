// Adapta los handlers estilo Netlify (event => {statusCode, headers, body}) al formato
// de Vercel Functions (req, res), para mantener una sola copia de la lógica.
module.exports = function adapt(handler) {
  return async function vercelHandler(req, res) {
    let body = req.body;
    if (Buffer.isBuffer(body)) body = body.toString("utf8");
    else if (body && typeof body === "object") body = JSON.stringify(body);

    const event = {
      httpMethod: req.method,
      headers: req.headers,
      body: body || null
    };

    const result = await handler(event);

    res.statusCode = result.statusCode || 200;
    for (const [key, value] of Object.entries(result.headers || {})) {
      res.setHeader(key, value);
    }
    res.end(result.body ?? "");
  };
};
