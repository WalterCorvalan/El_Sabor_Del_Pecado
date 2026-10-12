const crypto = require("crypto");
const { verifyToken, getBearerToken } = require("./utils/auth");
const { getImageStore } = require("./utils/blob-store");

// Base64 infla el tamaño ~33%. Con 2.5MB de imagen quedamos bien debajo del límite
// de body que aceptan las functions de Netlify y de Vercel.
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = getBearerToken(event);
  let tokenOk;
  try {
    tokenOk = verifyToken(token);
  } catch (err) {
    console.error("ADMIN_PASSWORD no configurada:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "El servidor no tiene configurada la contraseña de administrador" })
    };
  }
  if (!tokenOk) {
    return { statusCode: 401, body: JSON.stringify({ error: "No autorizado, iniciá sesión de nuevo" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { contentType, dataBase64 } = payload;
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return { statusCode: 400, body: JSON.stringify({ error: "Formato no soportado (usá JPG, PNG o WEBP)" }) };
  }
  if (!dataBase64 || typeof dataBase64 !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta la imagen" }) };
  }

  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "La imagen está vacía" }) };
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: "La imagen no puede pesar más de 2.5MB" }) };
  }

  const key = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

  try {
    const store = getImageStore();
    const directUrl = await store.upload(key, buffer, contentType);
    const url = directUrl || `/api/image?key=${encodeURIComponent(key)}`;
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    };
  } catch (err) {
    console.error("Error subiendo imagen:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo subir la imagen" }) };
  }
};
