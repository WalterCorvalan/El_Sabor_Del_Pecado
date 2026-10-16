const { getOrderStore } = require("./utils/blob-store");
const { requireAdmin } = require("./utils/auth");

const STATUSES = ["nuevo", "preparando", "listo", "entregado", "cancelado"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const denied = requireAdmin(event);
  if (denied) return denied;

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { id, status, action } = payload;
  if (typeof id !== "string" || !/^\d+-[a-f0-9]{16}$/.test(id)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Pedido inválido" }) };
  }
  if (action !== "delete" && !STATUSES.includes(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Estado inválido" }) };
  }

  try {
    const store = getOrderStore();
    const order = await store.get(id);
    if (!order) return { statusCode: 404, body: JSON.stringify({ error: "No se encontró el pedido" }) };

    // Borrar es definitivo: solo se pueden borrar pedidos ya cancelados.
    if (action === "delete") {
      if (order.status !== "cancelado") {
        return { statusCode: 400, body: JSON.stringify({ error: "Solo se pueden eliminar pedidos cancelados" }) };
      }
      await store.delete(id);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, deleted: id })
      };
    }

    order.status = status;
    await store.setJSON(id, order);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, order })
    };
  } catch (err) {
    console.error("Error actualizando el pedido:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "No se pudo actualizar el pedido" }) };
  }
};
