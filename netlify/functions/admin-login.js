const { createToken, verifyPassword } = require("./utils/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  let passwordOk;
  try {
    passwordOk = verifyPassword(body.password);
  } catch (err) {
    console.error("ADMIN_PASSWORD no configurada:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "El servidor no tiene configurada la contraseña de administrador" })
    };
  }

  if (!passwordOk) {
    return { statusCode: 401, body: JSON.stringify({ error: "Contraseña incorrecta" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: createToken() })
  };
};
