export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && ["/remote-api/events", "/remote-api/collection-status", "/remote-api/redemption-codes", "/remote-api/redemption-codes/expiring-today"].includes(url.pathname)) {
      const endpoint = url.pathname.replace("/remote-api/", "");
      const response = await fetch(`https://subculture-schdule-api.vercel.app/api/v1/${endpoint}${url.search}`, { headers: { accept: "application/json" } });
      return new Response(response.body, { status: response.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": endpoint === "collection-status" ? "public, max-age=60" : "public, max-age=300" } });
    }
    if (request.method === "GET" && url.pathname === "/api/events") {
      url.pathname = "/api/events.json";
      const response = await env.ASSETS.fetch(new Request(url, request));
      return new Response(response.body, { status: response.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600" } });
    }
    if (request.method === "GET" && url.pathname === "/api/collection-status") {
      url.pathname = "/api/collection-status.json";
      const response = await env.ASSETS.fetch(new Request(url, request));
      return new Response(response.body, { status: response.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" } });
    }
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
