exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": "auth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Secure",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ok: true }),
  };
};
