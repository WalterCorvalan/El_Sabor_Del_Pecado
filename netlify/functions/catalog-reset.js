const { getCatalogStore } = require("./utils/blob-store");
const { defaultCatalog } = require("./utils/default-catalog");
const { verifyToken, getBearerToken } = require("./utils/auth");

// Vuelve el menú al catálogo base del código. Conserva el WhatsApp y el estado del local.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let tokenOk;
  try {
    tokenOk = verifyToken(getBearerToken(event));
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

  try {
    const store = getCatalogStore();
    const current = await store.get("catalog", { type: "json" });
    const fresh = defaultCatalog();

    if (current) {
      if (current.whatsappNumber) fresh.whatsappNumber = current.whatsappNumber;
      if (typeof current.storeOpen === "boolean") fresh.storeOpen = current.storeOpen;
      if (typeof current.closedMessage === "string") fresh.closedMessage = current.closedMessage;
    }

    await store.setJSON("catalog", fresh);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, catalog: fresh })
    };
  } catch (err) {
    console.error("Error restaurando el catálogo:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo restaurar el menú" }) };
  }
};
