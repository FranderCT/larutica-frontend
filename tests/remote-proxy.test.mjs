import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

const originalEnvironment = {
  remote: process.env.LARUTICA_REMOTE_API_ORIGIN,
  secret: process.env.SUPABASE_SECRET_KEY,
  legacySecret: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

test.after(() => {
  for (const [name, value] of Object.entries({
    LARUTICA_REMOTE_API_ORIGIN: originalEnvironment.remote,
    SUPABASE_SECRET_KEY: originalEnvironment.secret,
    SUPABASE_SERVICE_ROLE_KEY: originalEnvironment.legacySecret,
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("el proxy conserva same-origin y adapta la cookie para localhost", async (t) => {
  let received;
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      received = {
        body: Buffer.concat(chunks).toString("utf8"),
        headers: request.headers,
        method: request.method,
        url: request.url,
      };
      response.statusCode = 201;
      response.setHeader("content-type", "application/json");
      response.setHeader("location", "/dashboard");
      response.setHeader(
        "set-cookie",
        "__Host-larutica_session=opaque-token; Path=/; HttpOnly; Secure; SameSite=Strict",
      );
      response.end('{"data":{"ok":true}}');
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert.equal(typeof address, "object");

  process.env.LARUTICA_REMOTE_API_ORIGIN = `http://127.0.0.1:${address.port}`;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { proxyRemoteApiRequest } = await import("../lib/api/remote-proxy.ts");
  const response = await proxyRemoteApiRequest(new Request(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      },
      body: '{"email":"viajero@example.com"}',
    },
  ));

  assert.ok(response);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), "http://localhost:3000/dashboard");
  const cookie = response.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^larutica_session=opaque-token/i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.doesNotMatch(cookie, /;\s*Secure\b/i);
  assert.equal(received.method, "POST");
  assert.equal(received.url, "/api/auth/login");
  assert.equal(received.body, '{"email":"viajero@example.com"}');
  assert.equal(received.headers.origin, `http://127.0.0.1:${address.port}`);
  assert.equal(received.headers["x-larutica-client-origin"], "http://localhost:3000");
});

test("Sites ejecuta sus propias solicitudes sin generar un ciclo", async () => {
  process.env.LARUTICA_REMOTE_API_ORIGIN = "https://backend.example.com";
  const { proxyRemoteApiRequest } = await import("../lib/api/remote-proxy.ts");
  const response = await proxyRemoteApiRequest(new Request(
    "https://backend.example.com/api/maps/places?q=Heredia",
  ));
  assert.equal(response, null);
});

test("mapas y pagos usan el backend compartido aunque existan claves locales", async (t) => {
  const received = [];
  const server = createServer((request, response) => {
    received.push({ method: request.method, path: request.url });
    response.writeHead(503, { "content-type": "application/json" });
    response.end('{"error":"respuesta del backend compartido"}');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  process.env.LARUTICA_REMOTE_API_ORIGIN = `http://127.0.0.1:${server.address().port}`;
  process.env.SUPABASE_SECRET_KEY = "local-test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-local-test-key";
  const { proxyRemoteApiRequest } = await import("../lib/api/remote-proxy.ts");
  const paths = [
    ["GET", "/api/maps/places?q=Heredia"],
    ["GET", "/api/maps/reverse?lat=10&lon=-84"],
    ["POST", "/api/maps/route"],
    ["GET", "/api/maps/tiles/7/35/60"],
    ["GET", "/api/publications/journey-status"],
    ["POST", "/api/publications"],
    ["PATCH", "/api/publications/test"],
    ["POST", "/api/reservations/test/payment"],
    ["POST", "/api/reservations/test/payment/confirm"],
    ["POST", "/api/publications/11111111-1111-4111-8111-111111111111/promotion/payment"],
    ["POST", "/api/publications/11111111-1111-4111-8111-111111111111/promotion/payment/confirm"],
    ["POST", "/api/payments/onvopay/webhook"],
    ["GET", "/api/admin/payments"],
    ["GET", "/api/admin/payments/balances"],
    ["GET", "/api/admin/promotions"],
    ["POST", "/api/admin/promotions/11111111-1111-4111-8111-111111111111/refund"],
    ["POST", "/api/admin/settlements"],
    ["PATCH", "/api/reservations/test"],
    ["DELETE", "/api/publications/test/departures/test"],
  ];
  for (const [method, path] of paths) {
    const response = await proxyRemoteApiRequest(new Request(`http://localhost:3000${path}`, { method }));
    assert.equal(response?.status, 503); // Never fall back to local credentials on upstream errors.
    assert.equal((await response.json()).error, "respuesta del backend compartido");
  }
  assert.deepEqual(received, paths.map(([method, path]) => ({ method, path })));
});

test("los módulos ajenos a mapas y pagos conservan su backend local", async () => {
  process.env.LARUTICA_REMOTE_API_ORIGIN = "https://backend.example.com";
  process.env.SUPABASE_SECRET_KEY = "local-test-key";
  const { proxyRemoteApiRequest } = await import("../lib/api/remote-proxy.ts");
  for (const path of ["/api/auth/session", "/api/catalog", "/api/profile", "/api/publications", "/api/admin/users", "/api/reservations/test"]) {
    assert.equal(await proxyRemoteApiRequest(new Request(`http://localhost:3000${path}`)), null);
  }
});

test("un backend propio exige desactivar explícitamente el destino remoto", async () => {
  process.env.LARUTICA_REMOTE_API_ORIGIN = "";
  process.env.SUPABASE_SECRET_KEY = "local-test-key";
  const { proxyRemoteApiRequest } = await import("../lib/api/remote-proxy.ts");
  assert.equal(await proxyRemoteApiRequest(new Request("http://localhost:3000/api/maps/route")), null);
});
