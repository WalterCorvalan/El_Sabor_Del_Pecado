const crypto = require("crypto");
const { getCatalogStore, getOrderStore } = require("./utils/blob-store");
const { defaultCatalog } = require("./utils/default-catalog");
const Rules = require("../../js/rules.js");

const MAX_BODY_BYTES = 50 * 1024;
const PAYMENTS = ["Efectivo", "Transferencia", "Mercado Pago"];
const SHIPPINGS = ["Retiro en local", Rules.DELIVERY];

function text(value, max) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function fail(statusCode, error) {
  return { statusCode, body: JSON.stringify({ error }) };
}

// Siguiente número de pedido (1, 2, 3...). Con poco volumen alcanza con leer y escribir.
async function nextNumber(store) {
  const counter = (await store.get("counter")) || { last: 0 };
  const number = Number(counter.last || 0) + 1;
  await store.setJSON("counter", { last: number });
  return number;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (event.body && event.body.length > MAX_BODY_BYTES) return fail(413, "Pedido demasiado grande");

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return fail(400, "JSON inválido");
  }

  const name = text(payload.customer && payload.customer.name, 80);
  const phone = text(payload.customer && payload.customer.phone, 30);
  const email = text(payload.customer && payload.customer.email, 120);
  const shipping = payload.shipping;
  const payment = payload.payment;
  const address = text(payload.address, 250);

  if (!name) return fail(400, "Falta el nombre");
  if (!phone) return fail(400, "Falta el teléfono de contacto");
  if (!SHIPPINGS.includes(shipping)) return fail(400, "Método de entrega inválido");
  if (!PAYMENTS.includes(payment)) return fail(400, "Medio de pago inválido");
  if (shipping === Rules.DELIVERY && !address) return fail(400, "Falta la dirección de entrega");

  let catalog;
  try {
    catalog = (await getCatalogStore().get("catalog", { type: "json" })) || defaultCatalog();
  } catch (err) {
    console.error("Error leyendo el catálogo para el pedido:", err);
    return fail(500, "No se pudo preparar el pedido");
  }

  const status = Rules.storeStatus(catalog);
  if (!status.open) {
    const message =
      status.reason === "schedule"
        ? `El local está cerrado${status.nextOpen ? `. Abrimos ${status.nextOpen}` : ""}`
        : "El local está cerrado por ahora";
    return fail(400, message);
  }

  const priced = Rules.priceOrder(catalog, payload.items, { shipping, zoneId: payload.zoneId });
  if (!priced.ok) return fail(400, priced.error);

  try {
    const store = getOrderStore();
    const number = await nextNumber(store);
    const id = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

    const order = {
      id,
      number,
      createdAt: new Date().toISOString(),
      status: "nuevo",
      customer: { name, phone, email },
      shipping,
      zone: priced.zone,
      address: shipping === Rules.DELIVERY ? address : "",
      payment,
      items: priced.items,
      subtotal: priced.subtotal,
      deliveryFee: priced.deliveryFee,
      total: priced.total
    };

    await store.setJSON(id, order);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: id,
        number,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total
      })
    };
  } catch (err) {
    console.error("Error guardando el pedido:", err);
    return fail(500, "No se pudo guardar el pedido");
  }
};
