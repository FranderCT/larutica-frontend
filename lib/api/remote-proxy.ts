function isSharedServiceRequest(request: Request, url: URL): boolean {
  if (/^\/api\/(?:maps|payments)(?:\/|$)/.test(url.pathname)
    || /^\/api\/reservations\/[^/]+\/payment(?:\/|$)/.test(url.pathname)
    || /^\/api\/publications\/[^/]+\/promotion\/payment(?:\/|$)/.test(url.pathname)
    || /^\/api\/admin\/(?:payments|settlements|promotions)(?:\/|$)/.test(url.pathname)
    || url.pathname === "/api/publications/journey-status") return true;
  // The server that calculates a route also verifies its signature on save.
  if ((request.method === "POST" && url.pathname === "/api/publications")
    || (["PATCH", "PUT"].includes(request.method) && /^\/api\/publications\/[^/]+$/.test(url.pathname))) return true;
  // These existing mutations can issue Onvo refunds. Keep the cancellation
  // and its refund together on the shared backend, without changing its rules.
  return ["PATCH", "DELETE"].includes(request.method)
    && (/^\/api\/reservations\/[^/]+$/.test(url.pathname)
      || /^\/api\/publications\/[^/]+\/departures\/[^/]+$/.test(url.pathname));
}

function remoteApiOrigin(sharedService: boolean): string | null {
  if (!sharedService && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return null;
  }
  const configured = process.env.LARUTICA_REMOTE_API_ORIGIN?.trim();
  if (!configured) return null;
  return new URL(configured).origin;
}

function localizeSessionCookie(cookie: string): string {
  return cookie
    .replace(/^__Host-larutica_session=/i, "larutica_session=")
    .replace(/;\s*Secure\b/gi, "")
    .replace(/;\s*Domain=[^;]*/gi, "");
}

function upstreamCookies(headers: Headers): string[] {
  const enhanced = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof enhanced.getSetCookie === "function") return enhanced.getSetCookie();
  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

export async function proxyRemoteApiRequest(request: Request): Promise<Response | null> {
  const localUrl = new URL(request.url);
  const sharedService = isSharedServiceRequest(request, localUrl);
  const remoteOrigin = remoteApiOrigin(sharedService);
  if (!remoteOrigin) return null;

  if (localUrl.origin === remoteOrigin) {
    // Already running on the shared backend: execute here without proxying
    // back to ourselves (including the Onvo webhook).
    if (sharedService) return null;
    return Response.json(
      { error: "La configuración del backend remoto produce un ciclo." },
      { status: 500 },
    );
  }

  try {
    const target = new URL(`${localUrl.pathname}${localUrl.search}`, remoteOrigin);
    const headers = new Headers(request.headers);
    for (const name of [
      "host",
      "content-length",
      "cf-connecting-ip",
      "cf-ray",
      "x-forwarded-for",
      "x-forwarded-host",
      "x-forwarded-proto",
    ]) {
      headers.delete(name);
    }
    headers.set("origin", remoteOrigin);
    headers.set("sec-fetch-site", "same-origin");
    headers.set("x-larutica-client-origin", localUrl.origin);

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    const cookies = upstreamCookies(upstream.headers);
    responseHeaders.delete("set-cookie");
    for (const cookie of cookies) {
      responseHeaders.append("set-cookie", localizeSessionCookie(cookie));
    }

    const location = responseHeaders.get("location");
    if (location) {
      const destination = new URL(location, remoteOrigin);
      if (destination.origin === remoteOrigin) {
        destination.protocol = localUrl.protocol;
        destination.host = localUrl.host;
        responseHeaders.set("location", destination.toString());
      }
    }
    responseHeaders.set("cache-control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("No se pudo contactar el backend compartido.", error);
    return Response.json(
      { error: "El backend compartido no está disponible temporalmente." },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
