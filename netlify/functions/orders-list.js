const { getOrderStore } = require("./utils/blob-store");
const { requireAdmin } = require("./utils/auth");

const MAX_ORDERS = 200;
// La pestaña Clientes necesita todos los pedidos, no solo los últimos.
const MAX_ORDERS_ALL = 5000;

// Pedidos más nuevos primero (las claves empiezan con el timestamp).
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const denied = requireAdmin(event);
  if (denied) return denied;

  try {
    const orders = await getOrderStore().listRecent(event.queryStringParameters && event.queryStringParameters.all ? MAX_ORDERS_ALL : MAX_ORDERS);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ orders })
    };
  } catch (err) {
    console.error("Error listando pedidos:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudieron cargar los pedidos" }) };
  }
};
