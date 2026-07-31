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
  assert.match(html, /<title>Pet Engine Study 05 — Kwilt Lab<\/title>/i);
  assert.match(html, /Starting the Pet engine/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes starter infrastructure and exposes the portable engine study", async () => {
  const [page, layout, prototype, engine, world, runtime, leafling, canvas] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PetPrototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-world.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/leafling.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/PetEngineCanvas.tsx", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  assert.match(page, /<PetPrototype \/>/);
  assert.match(layout, /Pet Engine Study 05 — Kwilt Lab/);
  assert.match(prototype, /Pet Engine Study 05/);
  assert.match(prototype, /Engine inspector/);
  assert.match(prototype, /Complete a To-do/);
  assert.match(prototype, /Finish Focus/);
  assert.match(prototype, /Advance one day/);
  assert.match(prototype, /Portable Pet runtime output/);
  assert.match(prototype, /Ground contact/);
  assert.match(prototype, /Ground anchor/);
  assert.match(prototype, /Ground cue/);
  assert.match(prototype, /Drawing role/);
  assert.match(prototype, /Anatomy layers/);
  assert.match(prototype, /Canvas 2D/);
  assert.match(engine, /width: 160, height: 240/);
  assert.match(engine, /MOTION_CLIPS/);
  assert.match(world, /stepPetWorld/);
  assert.match(world, /spawnInsect/);
  assert.match(runtime, /resolvePetFrame/);
  assert.match(runtime, /nextFrameElapsed/);
  assert.match(runtime, /PetFrameLayer/);
  assert.match(leafling, /leafling-motion-atlas-v3\.png/);
  assert.match(leafling, /"tail"/);
  assert.match(leafling, /idle/);
  assert.match(leafling, /greet/);
  assert.match(canvas, /imageSmoothingEnabled = false/);
  assert.match(canvas, /resolvePetFrame/);
  assert.match(canvas, /-snapshot\.anchor\.y \* scaleY/);
  assert.match(canvas, /onPointerDown/);
  assert.match(canvas, /setWorldZoom/);
  assert.match(canvas, /layer\.masks/);
});
