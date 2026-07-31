import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

test("server-renders the Pixel Pet prototype shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Little Lives — Pixel Pet Lab<\/title>/i);
  assert.match(html, /Waking up a little world/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes starter preview infrastructure and exposes all five pets", async () => {
  const [page, layout, prototype] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PetPrototype.tsx", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  assert.match(page, /<PetPrototype \/>/);
  assert.match(layout, /Little Lives — Pixel Pet Lab/);
  for (const pet of ["leafling", "ripplefin", "glowmoth", "pebbleback", "cloudwing"]) {
    assert.match(prototype, new RegExp(`kind: "${pet}"`));
  }
  assert.match(prototype, /Complete a To-do/);
  assert.match(prototype, /Finish Focus/);
  assert.match(prototype, /Advance one day/);
});
