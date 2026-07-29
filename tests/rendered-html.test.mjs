import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("Skybound ana sayfasını sunucu tarafında oluşturur", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Skybound Flight Simulator<\/title>/i);
  assert.match(html, /Tarayıcıda çalışan/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("uçuş simülatörü temel sistemleri kaynakta bulunur", async () => {
  const source = await readFile(
    new URL("../app/components/FlightSimulator.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /makeAircraft/);
  assert.match(source, /makeWorld/);
  assert.match(source, /STALL/);
  assert.match(source, /navigator\.getGamepads/);
  assert.match(source, /AudioContext/);
  assert.match(source, /CHECKPOINTS/);
});
