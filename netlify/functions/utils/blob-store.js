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
function getNetlifyStore(name) {
  const { getStore } = require("@netlify/blobs");
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;

  if (siteID && token) {
    return getStore({ name, siteID, token });
  }

  return getStore(name);
}

function getCatalogStore() {
  if (process.env.VERCEL) return getVercelStore();
  return getNetlifyStore("catalog");
}

// Almacenamiento de las fotos subidas desde el admin. Igual que el catálogo, funciona
// en las dos plataformas:
// - Vercel: @vercel/blob ya da una URL pública directa al subir.
// - Netlify: @netlify/blobs no da una URL pública propia, así que las imágenes se sirven
//   a través de la function image-get.js (/api/image?key=...).
function getImageStore() {
  if (process.env.VERCEL) {
    const { put } = require("@vercel/blob");
    return {
      directUrl: true,
      async upload(key, buffer, contentType) {
        const { url } = await put(key, buffer, {
          access: "public",
          contentType,
          addRandomSuffix: false,
          allowOverwrite: true
        });
        return url;
      }
    };
  }

  const store = getNetlifyStore("images");
  return {
    directUrl: false,
    async upload(key, buffer, contentType) {
      await store.set(key, buffer, { metadata: { contentType } });
      return null;
    },
    async get(key) {
      return store.getWithMetadata(key, { type: "arrayBuffer" });
    }
  };
}

module.exports = { getCatalogStore, getImageStore };
