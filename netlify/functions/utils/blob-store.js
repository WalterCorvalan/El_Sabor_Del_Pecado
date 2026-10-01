const { getStore } = require("@netlify/blobs");

// En algunos proyectos Netlify no inyecta el contexto automático (siteID/token) a las
// functions, lo que hace fallar getStore(name) con MissingBlobsEnvironmentError.
// Si están seteadas NETLIFY_SITE_ID y NETLIFY_BLOBS_TOKEN, usamos configuración manual
// como respaldo; si no, dejamos que @netlify/blobs intente el modo automático.
function getCatalogStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;

  if (siteID && token) {
    return getStore({ name: "catalog", siteID, token });
  }

  return getStore("catalog");
}

module.exports = { getCatalogStore };
