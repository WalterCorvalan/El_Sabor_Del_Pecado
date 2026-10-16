const { getOrderStore } = require("./utils/blob-store");
const { requireAdmin } = require("./utils/auth");

// Tres usos en una sola función (Vercel gratis permite 12 funciones en total):
//   GET  ?id=<pedido>   estado público de un pedido (para la página de seguimiento)
//   POST {type:"visit"} cuenta una visita al sitio
//   GET  ?stats=<días>  visitas por día (solo admin)
// Las visitas se guardan en Redis (Upstash) porque son muchas escrituras chicas: en Blob
// agotarían la cuota. Sin Redis configurado, las visitas simplemente no se cuentan.

const ORDER_ID = /^\d+-[a-f0-9]{16}$/;
const VISITOR_ID = /^[a-z0-9]{8,32}$/;
const KEEP_SECONDS = 60 * 60 * 24 * 400;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(config, commands) {
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Redis respondió ${res.status}`);
  return res.json();
}

// Fecha de Argentina (UTC-3) como AAAA-MM-DD.
function dayKey(date) {
  const d = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function json(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
    body: JSON.stringify(body)
  };
}

async function orderStatus(id) {
  if (!ORDER_ID.test(id)) return json(400, { error: "Pedido inválido" });
  const order = await getOrderStore().get(id);
  if (!order) return json(404, { error: "No encontramos ese pedido" });
  // Solo datos que no son personales: el link lo puede ver quien tenga el pedido a mano.
  return json(200, {
    number: order.number,
    status: order.status,
    shipping: order.shipping,
    eta: order.eta || "",
    total: order.total,
    createdAt: order.createdAt
  });
}

async function countVisit(body) {
  const config = redisConfig();
  if (!config) return { statusCode: 204, body: "" };

  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    return json(400, { error: "JSON inválido" });
  }
  const vid = String(payload.vid || "");
  if (!VISITOR_ID.test(vid)) return json(400, { error: "Visitante inválido" });

  const day = dayKey(new Date());
  await redis(config, [
    ["INCR", `visits:${day}`],
    ["EXPIRE", `visits:${day}`, KEEP_SECONDS],
    ["PFADD", `uniq:${day}`, vid],
    ["EXPIRE", `uniq:${day}`, KEEP_SECONDS]
  ]);
  return { statusCode: 204, body: "" };
}

async function visitStats(daysParam) {
  const config = redisConfig();
  if (!config) return json(200, { configured: false, days: [] });

  const count = Math.min(90, Math.max(1, Number(daysParam) || 30));
  const days = [];
  for (let i = 0; i < count; i++) days.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));

  const commands = days.flatMap((d) => [["GET", `visits:${d}`], ["PFCOUNT", `uniq:${d}`]]);
  const results = await redis(config, commands);
  const out = days.map((date, i) => ({
    date,
    visits: Number(results[i * 2]?.result || 0),
    uniques: Number(results[i * 2 + 1]?.result || 0)
  }));
  return json(200, { configured: true, days: out });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "POST") return await countVisit(event.body);

    if (event.httpMethod === "GET") {
      const query = event.queryStringParameters || {};
      if (query.id) return await orderStatus(String(query.id));
      if (query.stats) {
        const denied = requireAdmin(event);
        if (denied) return denied;
        return await visitStats(query.stats);
      }
      return json(400, { error: "Pedido inválido" });
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("Error en track:", err);
    return json(500, { error: "No se pudo completar la consulta" });
  }
};
