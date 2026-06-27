exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { password } = body;
  const correct = process.env.APP_PASSWORD;

  if (!correct) {
    return { statusCode: 500, body: JSON.stringify({ error: "APP_PASSWORD not set" }) };
  }

  if (password !== correct) {
    return { statusCode: 401, body: JSON.stringify({ error: "Wrong password" }) };
  }

  const secret = process.env.AUTH_SECRET || "dental-secret";

  // Session cookie - expires when browser closes
  const cookie = `auth=${secret}; HttpOnly; SameSite=Strict; Path=/; Secure`;

  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ok: true }),
  };
};
