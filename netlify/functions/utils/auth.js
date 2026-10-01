const crypto = require("crypto");

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

function getSecret() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("ADMIN_PASSWORD no está configurada en las variables de entorno");
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// Token = "<expiraEnMs>.<firmaHMAC>" en base64, firmado con ADMIN_PASSWORD como secreto.
// Evita reenviar la contraseña en texto plano en cada pedido de guardado.
function createToken() {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = String(expiresAt);
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64");
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  let decoded;
  try {
    decoded = Buffer.from(token, "base64").toString("utf8");
  } catch {
    return false;
  }
  const [payload, signature] = decoded.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;
  if (!crypto.timingSafeEqual(expectedBuf, signatureBuf)) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}

function verifyPassword(password) {
  if (!password || typeof password !== "string") return false;
  const secret = getSecret();
  const a = Buffer.from(password);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

module.exports = { createToken, verifyToken, verifyPassword, getBearerToken };
