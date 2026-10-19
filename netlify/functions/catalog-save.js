const { getCatalogStore } = require("./utils/blob-store");
const { verifyToken, getBearerToken } = require("./utils/auth");

const Rules = require("../../js/rules.js");
const { MENU_VERSION } = require("./utils/default-catalog");

const MAX_BODY_BYTES = 500 * 1024;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isMoney(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function validateSchedule(schedule) {
  if (schedule === undefined) return null;
  if (!schedule || typeof schedule !== "object") return "Los horarios son inválidos";
  if (typeof schedule.enabled !== "boolean") return "Los horarios son inválidos";
  if (!Array.isArray(schedule.days) || schedule.days.length !== 7) return "Los horarios deben tener los 7 días";
  for (let i = 0; i < 7; i++) {
    const day = schedule.days[i];
    if (!day || typeof day.open !== "boolean") return "Los horarios son inválidos";
    if (day.open && (Rules.toMinutes(day.from) === null || Rules.toMinutes(day.to) === null)) {
      return `El horario del ${Rules.DAY_NAMES[i]} es inválido (usá el formato 19:00)`;
    }
  }
  return null;
}

function validateDelivery(delivery) {
  if (delivery === undefined) return null;
  if (!delivery || typeof delivery !== "object") return "La configuración de envío es inválida";
  if (typeof delivery.enabled !== "boolean") return "La configuración de envío es inválida";
  if (!isMoney(delivery.fee)) return "El costo de envío es inválido";
  if (!isMoney(delivery.freeFrom)) return "El monto de envío gratis es inválido";
  if (!Array.isArray(delivery.zones)) return "Las zonas de envío son inválidas";
  const ids = new Set();
  for (const zone of delivery.zones) {
    if (!zone || !isNonEmptyString(zone.id) || !isNonEmptyString(zone.name)) return "Cada zona necesita nombre";
    if (!isMoney(zone.fee)) return `El costo de la zona ${zone.name} es inválido`;
    if (ids.has(zone.id)) return "Hay zonas repetidas";
    ids.add(zone.id);
  }
  return null;
}

function validateCheckoutSettings(catalog) {
  if (catalog.pickup !== undefined && (!catalog.pickup || typeof catalog.pickup.enabled !== "boolean")) {
    return "El ajuste de retiro en local es inválido";
  }
  if (catalog.trackingEnabled !== undefined && typeof catalog.trackingEnabled !== "boolean") {
    return "El ajuste de seguimiento es inválido";
  }
  if (catalog.payment !== undefined) {
    const p = catalog.payment;
    if (!p || typeof p !== "object") return "Los datos de pago son inválidos";
    if (typeof p.transferAlias !== "string" || p.transferAlias.length > 60) return "El alias es inválido";
    if (typeof p.transferHolder !== "string" || p.transferHolder.length > 80) return "El titular de la cuenta es inválido";
    if (typeof p.mercadopagoEnabled !== "boolean") return "El ajuste de Mercado Pago es inválido";
  }
  return null;
}

function validatePrepTime(prepTime) {
  if (prepTime === undefined) return null;
  if (!prepTime || typeof prepTime !== "object") return "El tiempo estimado es inválido";
  for (const key of ["pickup", "delivery"]) {
    const v = prepTime[key];
    if (typeof v !== "string" || v.length > 20) return "El tiempo estimado es inválido (usá algo como 20-30)";
  }
  return null;
}

function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object") return "Catálogo inválido";
  if (!isNonEmptyString(catalog.whatsappNumber)) return "Falta el número de WhatsApp";
  if (!/^[0-9]{8,15}$/.test(catalog.whatsappNumber.trim())) {
    return "El número de WhatsApp debe tener solo dígitos (con código de país, sin + ni espacios)";
  }
  if (!Array.isArray(catalog.categories)) return "Faltan las categorías";
  if (catalog.menuVersion !== MENU_VERSION) return "El menú se actualizó mientras editabas. Recargá el admin y volvé a hacer los cambios";
  if (catalog.storeOpen !== undefined && typeof catalog.storeOpen !== "boolean") return "El estado del local es inválido";
  if (catalog.closedMessage !== undefined && typeof catalog.closedMessage !== "string") return "El mensaje de local cerrado es inválido";

  const settingsError =
    validateSchedule(catalog.schedule) ||
    validateDelivery(catalog.delivery) ||
    validatePrepTime(catalog.prepTime) ||
    validateCheckoutSettings(catalog);
  if (settingsError) return settingsError;

  for (const category of catalog.categories) {
    if (!isNonEmptyString(category.id) || !isNonEmptyString(category.name)) {
      return "Cada categoría necesita id y nombre";
    }
    if (!Array.isArray(category.products)) return `La categoría ${category.name} no tiene productos`;
    if (category.hidden !== undefined && typeof category.hidden !== "boolean") return `La categoría ${category.name} es inválida`;
    if (category.bundle !== undefined) {
      const b = category.bundle;
      if (!b || typeof b !== "object" || typeof b.enabled !== "boolean") return `La promo por cantidad de ${category.name} es inválida`;
      if (b.enabled && (!Number.isInteger(b.size) || b.size < 2 || b.size > 100)) {
        return `La cantidad de la promo de ${category.name} tiene que ser un número entre 2 y 100`;
      }
      if (b.enabled && !isMoney(b.price)) return `El precio de la promo de ${category.name} es inválido`;
    }

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
      if (product.extras && !Array.isArray(product.extras)) {
        return `Los extras de ${product.name} son inválidos`;
      }
      for (const extra of product.extras || []) {
        if (!isNonEmptyString(extra.id) || !isNonEmptyString(extra.name)) {
          return `Un extra de ${product.name} no tiene id/nombre`;
        }
        if (typeof extra.price !== "number" || Number.isNaN(extra.price) || extra.price < 0) {
          return `El extra ${extra.name} de ${product.name} tiene un precio inválido`;
        }
      }
      for (const variant of product.variants || []) {
        if (!isNonEmptyString(variant.id) || !isNonEmptyString(variant.name)) {
          return `Una variante de ${product.name} no tiene id/nombre`;
        }
        if (variant.optionImages !== undefined) {
          const images = variant.optionImages;
          if (!images || typeof images !== "object" || Array.isArray(images)) {
            return `Las fotos de las opciones de ${variant.name} son inválidas`;
          }
          for (const value of Object.values(images)) {
            if (typeof value !== "string" || value.length > 300) return `Las fotos de las opciones de ${variant.name} son inválidas`;
          }
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

  // Un celular de Argentina escrito con 10 dígitos (ej. 11 3903 3797) se guarda con 549 adelante.
  if (catalog && typeof catalog.whatsappNumber === "string") {
    const digits = catalog.whatsappNumber.replace(/[^0-9]/g, "");
    catalog.whatsappNumber = digits.length === 10 ? `549${digits}` : digits;
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
