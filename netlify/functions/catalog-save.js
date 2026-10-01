const { getCatalogStore } = require("./utils/blob-store");
const { verifyToken, getBearerToken } = require("./utils/auth");

const MAX_BODY_BYTES = 500 * 1024;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object") return "Catálogo inválido";
  if (!isNonEmptyString(catalog.whatsappNumber)) return "Falta el número de WhatsApp";
  if (!/^[0-9]{8,15}$/.test(catalog.whatsappNumber.trim())) {
    return "El número de WhatsApp debe tener solo dígitos (con código de país, sin + ni espacios)";
  }
  if (!Array.isArray(catalog.categories)) return "Faltan las categorías";

  for (const category of catalog.categories) {
    if (!isNonEmptyString(category.id) || !isNonEmptyString(category.name)) {
      return "Cada categoría necesita id y nombre";
    }
    if (!Array.isArray(category.products)) return `La categoría ${category.name} no tiene productos`;

    for (const product of category.products) {
      if (!isNonEmptyString(product.id) || !isNonEmptyString(product.name)) {
        return "Cada producto necesita id y nombre";
      }
      if (typeof product.price !== "number" || Number.isNaN(product.price) || product.price < 0) {
        return `El producto ${product.name} tiene un precio inválido`;
      }
      if (product.variants && !Array.isArray(product.variants)) {
        return `Las variantes de ${product.name} son inválidas`;
      }
      for (const variant of product.variants || []) {
        if (!isNonEmptyString(variant.id) || !isNonEmptyString(variant.name)) {
          return `Una variante de ${product.name} no tiene id/nombre`;
        }
        if (!Array.isArray(variant.options) || variant.options.length === 0) {
          return `La variante ${variant.name} de ${product.name} necesita opciones`;
        }
      }
    }
  }

  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (event.body && event.body.length > MAX_BODY_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: "Catálogo demasiado grande" }) };
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

  let catalog;
  try {
    catalog = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const validationError = validateCatalog(catalog);
  if (validationError) {
    return { statusCode: 400, body: JSON.stringify({ error: validationError }) };
  }

  try {
    const store = getCatalogStore();
    await store.setJSON("catalog", catalog);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error("Error guardando el catálogo:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo guardar el catálogo" }) };
  }
};
