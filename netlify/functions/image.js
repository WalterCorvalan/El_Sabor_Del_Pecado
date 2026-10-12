const { getImageStore } = require("./utils/blob-store");

// Solo hace falta en Netlify: @netlify/blobs no da una URL pública propia, así que
// esta function sirve el binario guardado por upload-image.js. En Vercel las imágenes
// se suben a Vercel Blob, que ya devuelve una URL pública directa, así que esta ruta
// no se usa ahí (pero queda disponible igual, por si acaso).
exports.handler = async (event) => {
  const key = event.queryStringParameters?.key;
  if (!key) {
    return { statusCode: 400, body: "Falta el parámetro key" };
  }

  try {
    const store = getImageStore();
    if (store.directUrl) {
      return { statusCode: 404, body: "Not found" };
    }

    const result = await store.get(key);
    if (!result || !result.data) {
      return { statusCode: 404, body: "Not found" };
    }

    const buffer = Buffer.isBuffer(result.data) ? result.data : Buffer.from(result.data);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": result.metadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      isBase64Encoded: true,
      body: buffer.toString("base64")
    };
  } catch (err) {
    console.error("Error sirviendo imagen:", err);
    return { statusCode: 500, body: "Error interno" };
  }
};
