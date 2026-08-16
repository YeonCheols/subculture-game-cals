import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
});

test("maps the event API to the generated JSON asset", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/api/events"), {
    ASSETS: { fetch: async (request) => { calls.push(new URL(request.url).pathname); return Response.json([{ id: "event-1" }]); } },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.deepEqual(calls, ["/api/events.json"]);
});

test("proxies dated remote event queries without losing the date", async (context) => {
  const originalFetch = globalThis.fetch;
  let target;
  globalThis.fetch = async (input) => { target = String(input); return Response.json([{ id: "remote-event" }]); };
  context.after(() => { globalThis.fetch = originalFetch; });
  const response = await worker.fetch(new Request("https://example.test/remote-api/events?date=2026-08-07"), {});
  assert.equal(response.status, 200);
  assert.equal(target, "https://subculture-schdule-api.vercel.app/api/v1/events?date=2026-08-07");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), [{ id: "remote-event" }]);
});

test("proxies redemption code views and game filters", async (context) => {
  const originalFetch = globalThis.fetch;
  const targets = [];
  globalThis.fetch = async (input) => { targets.push(String(input)); return Response.json([]); };
  context.after(() => { globalThis.fetch = originalFetch; });
  const allResponse = await worker.fetch(new Request("https://example.test/remote-api/redemption-codes?gameId=genshin"), {});
  const expiringResponse = await worker.fetch(new Request("https://example.test/remote-api/redemption-codes/expiring-today?gameId=monster"), {});
  assert.deepEqual(targets, [
    "https://subculture-schdule-api.vercel.app/api/v1/redemption-codes?gameId=genshin",
    "https://subculture-schdule-api.vercel.app/api/v1/redemption-codes/expiring-today?gameId=monster",
  ]);
  assert.equal(allResponse.headers.get("cache-control"), "no-store");
  assert.equal(expiringResponse.headers.get("cache-control"), "no-store");
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
