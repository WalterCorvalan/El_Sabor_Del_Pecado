// Vista previa al compartir el link (WhatsApp, Instagram, Facebook, etc.).
// vercel.json manda acá solo a los "robots" de esas apps: necesitan una URL absoluta
// para la imagen, y esa URL se arma con el dominio desde el que les respondemos,
// así sigue andando si más adelante se cambia a un dominio propio.
const TITLE = "El Sabor del Pecado | Sandwichería Gourmet";
const DESCRIPTION =
  "Sándwiches gourmet de vacío, bondiola y osobuco, platos y empanadas. Mirá el menú y pedí online con envío a domicilio.";

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;
  const image = `${origin}/images/og-share.jpg`;

  const html = `<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="UTF-8" />
<title>${escapeAttr(TITLE)}</title>
<meta name="description" content="${escapeAttr(DESCRIPTION)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="El Sabor del Pecado" />
<meta property="og:title" content="${escapeAttr(TITLE)}" />
<meta property="og:description" content="${escapeAttr(DESCRIPTION)}" />
<meta property="og:url" content="${escapeAttr(origin)}/" />
<meta property="og:image" content="${escapeAttr(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(TITLE)}" />
<meta name="twitter:description" content="${escapeAttr(DESCRIPTION)}" />
<meta name="twitter:image" content="${escapeAttr(image)}" />
</head>
<body><a href="${escapeAttr(origin)}/">${escapeAttr(TITLE)}</a></body>
</html>`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(html);
};
