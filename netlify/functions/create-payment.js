const { getOrderStore } = require("./utils/blob-store");

const MAX_BODY_BYTES = 5 * 1024;

// Crea la preferencia de Mercado Pago a partir de un pedido ya guardado (order-create),
// así los montos son siempre los que calculó el servidor y nunca los del navegador.
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

  const { orderId } = payload;
  if (typeof orderId !== "string" || !/^\d+-[a-f0-9]{16}$/.test(orderId)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Pedido inválido" }) };
  }

  let order;
  try {
    order = await getOrderStore().get(orderId);
  } catch (err) {
    console.error("Error leyendo el pedido para el pago:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo preparar el pago" }) };
  }
  if (!order) {
    return { statusCode: 404, body: JSON.stringify({ error: "No se encontró el pedido" }) };
  }
  if (order.payment !== "Mercado Pago") {
    return { statusCode: 400, body: JSON.stringify({ error: "Este pedido no es para pagar con Mercado Pago" }) };
  }

  const mpItems = order.items.map((item) => ({
    title: item.details && item.details.length ? `${item.name} (${item.details.join(" · ")})` : item.name,
    quantity: item.qty,
    unit_price: Number(item.price),
    currency_id: "ARS"
  }));

  if (order.deliveryFee > 0) {
    mpItems.push({
      title: order.zone ? `Envío (${order.zone.name})` : "Envío a domicilio",
      quantity: 1,
      unit_price: Number(order.deliveryFee),
      currency_id: "ARS"
    });
  }

  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const origin = `${proto}://${host}`;

  const preference = {
    items: mpItems,
    external_reference: order.id,
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
