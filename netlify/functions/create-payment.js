const { getCatalogStore } = require("./utils/blob-store");
const { defaultCatalog } = require("./utils/default-catalog");

const MAX_BODY_BYTES = 50 * 1024;
const MAX_QTY = 50;
const MAX_ITEMS = 50;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Mercado Pago no está configurado en el servidor" })
    };
  }

  if (event.body && event.body.length > MAX_BODY_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: "Pedido demasiado grande" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { items, address, phone } = payload;

  if (!isNonEmptyString(address)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta la dirección de entrega" }) };
  }
  if (!isNonEmptyString(phone)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta el teléfono de contacto" }) };
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return { statusCode: 400, body: JSON.stringify({ error: "El carrito está vacío o es inválido" }) };
  }

  let catalog;
  try {
    const store = getCatalogStore();
    catalog = (await store.get("catalog", { type: "json" })) || defaultCatalog();
  } catch (err) {
    console.error("Error leyendo el catálogo para el pago:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo preparar el pago" }) };
  }

  const productIndex = new Map();
  for (const category of catalog.categories || []) {
    for (const product of category.products || []) {
      productIndex.set(product.id, product);
    }
  }

  // Los precios se recalculan acá con el catálogo real (nunca se confía en el precio
  // que mande el cliente), para que nadie pueda manipular el total desde el navegador.
  const mpItems = [];
  for (const line of items) {
    const product = productIndex.get(line.productId);
    if (!product) {
      return { statusCode: 400, body: JSON.stringify({ error: `Producto no encontrado: ${line.productId}` }) };
    }

    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { statusCode: 400, body: JSON.stringify({ error: `Cantidad inválida para ${product.name}` }) };
    }

    const selectionsText = Array.isArray(line.selections)
      ? line.selections
          .map((s) => `${s.groupName}: ${Array.isArray(s.values) ? s.values.join(", ") : ""}`)
          .join(" · ")
      : "";

    mpItems.push({
      title: selectionsText ? `${product.name} (${selectionsText})` : product.name,
      quantity: qty,
      unit_price: Number(product.price),
      currency_id: "ARS"
    });
  }

  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const origin = `${proto}://${host}`;

  const preference = {
    items: mpItems,
    back_urls: {
      success: `${origin}/?payment=success`,
      failure: `${origin}/?payment=failure`,
      pending: `${origin}/?payment=pending`
    },
    auto_return: "approved",
    statement_descriptor: "EL SABOR DEL PECADO"
  };

  try {
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Error de Mercado Pago:", data);
      return { statusCode: 502, body: JSON.stringify({ error: "Mercado Pago rechazó la preferencia de pago" }) };
    }

    const isTestToken = accessToken.startsWith("TEST-");
    const checkoutUrl = isTestToken ? data.sandbox_init_point : data.init_point;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutUrl })
    };
  } catch (err) {
    console.error("Error creando preferencia de Mercado Pago:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo iniciar el pago" }) };
  }
};
