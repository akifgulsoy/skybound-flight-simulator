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
  const OriginalAbortController = globalThis.AbortController;
  const flightSimulatorInitializations = [];
  globalThis.AbortController = class extends OriginalAbortController {
    constructor() {
      super();
      const stack = new Error().stack ?? "";
      if (stack.includes("FlightSimulator")) {
        flightSimulatorInitializations.push(stack);
      }
    }
  };

  try {
    const response = await render();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

    const html = await response.text();
    assert.match(html, /<title>Skybound Flight Simulator<\/title>/i);
    assert.match(html, /Uçuş sistemi hazırlanıyor/);
    assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
    assert.equal(
      flightSimulatorInitializations.length,
      0,
      "Three.js sunucu tarafında başlatılmamalı",
    );
  } finally {
    globalThis.AbortController = OriginalAbortController;
  }
});

test("uçuş simülatörü temel sistemleri kaynakta bulunur", async () => {
  const [source, styles, threeModuleAsset, threeCoreAsset] = await Promise.all([
    readFile(
      new URL("../app/components/FlightSimulator.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../dist/client/vendor/three.module.min.js", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/client/vendor/three.core.min.js", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(source, /makeAircraft/);
  assert.match(source, /makeWorld/);
  assert.match(source, /STALL/);
  assert.match(source, /navigator\.getGamepads/);
  assert.match(source, /AudioContext/);
  assert.match(source, /CHECKPOINT_COORDS/);
  assert.match(source, /THREE_MODULE_URL = "\/vendor\/three\.module\.min\.js"/);
  assert.match(source, /pendingStartRef/);
  assert.match(source, /hazır olduğunda otomatik başlayacak/);
  assert.doesNotMatch(source, /URL\.createObjectURL/);
  assert.match(threeModuleAsset, /from["']\.\/three\.core\.min\.js["']/);
  assert.match(threeModuleAsset, /export\{/);
  assert.match(threeCoreAsset, /export\{/);

  const toastZIndex = Number(
    styles.match(/\.toast\s*\{[^}]*z-index:\s*(\d+)/)?.[1],
  );
  const overlayZIndex = Number(
    styles.match(/\.overlay\s*\{[^}]*z-index:\s*(\d+)/)?.[1],
  );
  assert.ok(
    toastZIndex > overlayZIndex,
    "Bildirim katmanı ekran kaplamalarının üzerinde olmalı",
  );

  const workerSource = await readFile(
    new URL("../dist/server/index.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    workerSource.split("\n", 1)[0],
    /three\.module\.min/,
    "Three.js Worker başlangıç parçaları arasında olmamalı",
  );
});
