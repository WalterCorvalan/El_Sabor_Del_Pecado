// Almacenamiento del catálogo. Funciona en dos plataformas:
// - Vercel (process.env.VERCEL): usa Vercel Blob (requiere BLOB_READ_WRITE_TOKEN).
// - Netlify: usa Netlify Blobs.
// Ambas devuelven un objeto con get("catalog", { type: "json" }) y setJSON("catalog", valor).

function getVercelStore() {
  const { put, list } = require("@vercel/blob");
  const pathname = "catalog.json";

  return {
    async get() {
      const { blobs } = await list({ prefix: pathname, limit: 1 });
      const blob = blobs.find((b) => b.pathname === pathname);
      if (!blob) return null;
      const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`No se pudo leer el catálogo (${res.status})`);
      return res.json();
    },
    async setJSON(_key, value) {
      await put(pathname, JSON.stringify(value), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true
      });
    }
  };
}

// En algunos proyectos Netlify no inyecta el contexto automático (siteID/token) a las
// functions, lo que hace fallar getStore(name) con MissingBlobsEnvironmentError.
// Si están seteadas NETLIFY_SITE_ID y NETLIFY_BLOBS_TOKEN, usamos configuración manual
// como respaldo; si no, dejamos que @netlify/blobs intente el modo automático.
function getCatalogStore() {
  if (process.env.VERCEL) return getVercelStore();

  const { getStore } = require("@netlify/blobs");
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;

  if (siteID && token) {
    return getStore({ name: "catalog", siteID, token });
  }

  return getStore("catalog");
}

module.exports = { getCatalogStore };
