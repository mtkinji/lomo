import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePetFrame,
  type PetAnimationManifest,
} from "../lib/pet-runtime.ts";

const manifest: PetAnimationManifest = {
  atlas: {
    src: "/fixture.png",
    frameWidth: 112,
    frameHeight: 112,
    columns: 3,
    rows: 2,
  },
  fallbackClip: "idle",
  clips: {
    idle: {
      loop: true,
      frames: [
        { cell: { column: 0, row: 0 }, duration: 240 },
        { cell: { column: 1, row: 0 }, duration: 120 },
      ],
    },
    greet: {
      loop: false,
      frames: [
        { cell: { column: 0, row: 1 }, duration: 100 },
        { cell: { column: 1, row: 1 }, duration: 100, transform: { x: 0, y: -4 } },
        { cell: { column: 2, row: 1 }, duration: 100, events: ["chirp"], transform: { x: 2, y: -6 } },
      ],
    },
  },
};

test("resolves a renderer-neutral atlas cell at the start of a clip", () => {
  assert.deepEqual(resolvePetFrame(manifest, "idle", 0, false), {
    clip: "idle",
    frameIndex: 0,
    frameCount: 2,
    cell: { column: 0, row: 0 },
    progress: 0,
    completed: false,
    events: [],
    transform: { x: 0, y: 0 },
  });
});

test("uses authored frame durations and loops without renderer knowledge", () => {
  assert.equal(resolvePetFrame(manifest, "idle", 239, false).frameIndex, 0);
  assert.equal(resolvePetFrame(manifest, "idle", 240, false).frameIndex, 1);
  assert.equal(resolvePetFrame(manifest, "idle", 360, false).frameIndex, 0);
});

test("clamps one-shot clips and reports completion", () => {
  const snapshot = resolvePetFrame(manifest, "greet", 9999, false);
  assert.equal(snapshot.frameIndex, 2);
  assert.equal(snapshot.completed, true);
});

test("emits frame markers and preserves expression under reduced motion", () => {
  const animated = resolvePetFrame(manifest, "greet", 220, false);
  const reduced = resolvePetFrame(manifest, "greet", 220, true);

  assert.deepEqual(animated.events, ["chirp"]);
  assert.deepEqual(animated.transform, { x: 2, y: -6 });
  assert.deepEqual(reduced.cell, animated.cell);
  assert.deepEqual(reduced.events, animated.events);
  assert.deepEqual(reduced.transform, { x: 0, y: 0 });
});

test("falls back to the manifest default for an unknown clip", () => {
  const snapshot = resolvePetFrame(manifest, "missing", 0, false);
  assert.equal(snapshot.clip, "idle");
  assert.deepEqual(snapshot.cell, { column: 0, row: 0 });
});
