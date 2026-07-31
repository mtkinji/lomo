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
        {
          cell: { column: 0, row: 0 },
          duration: 240,
          anchor: { x: 56, y: 108 },
          contact: "planted",
          shadow: { width: 58, opacity: 0.2 },
        },
        { cell: { column: 1, row: 0 }, duration: 120 },
      ],
    },
    greet: {
      loop: false,
      frames: [
        { cell: { column: 0, row: 1 }, duration: 100 },
        {
          cell: { column: 1, row: 1 },
          duration: 100,
          transform: { x: 0, y: -4 },
          contact: "airborne",
          shadow: { width: 26, opacity: 0.1 },
        },
        { cell: { column: 2, row: 1 }, duration: 100, events: ["chirp"], transform: { x: 2, y: -6 } },
      ],
    },
    sleep: {
      loop: true,
      loopFrom: 2,
      frames: [
        { cell: { column: 0, row: 0 }, duration: 100 },
        { cell: { column: 1, row: 0 }, duration: 100 },
        { cell: { column: 0, row: 1 }, duration: 100, contact: "resting" },
        { cell: { column: 1, row: 1 }, duration: 100, contact: "resting" },
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
    anchor: { x: 56, y: 108 },
    contact: "planted",
    shadow: { width: 58, opacity: 0.2 },
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

test("plays an intro once and then loops only the authored resting phase", () => {
  assert.equal(resolvePetFrame(manifest, "sleep", 50, false).frameIndex, 0);
  assert.equal(resolvePetFrame(manifest, "sleep", 250, false).frameIndex, 2);
  assert.equal(resolvePetFrame(manifest, "sleep", 450, false).frameIndex, 2);
  assert.equal(resolvePetFrame(manifest, "sleep", 550, false).frameIndex, 3);
  assert.equal(resolvePetFrame(manifest, "sleep", 650, false).frameIndex, 2);
});

test("carries authored ground contact through the renderer-neutral snapshot", () => {
  const grounded = resolvePetFrame(manifest, "idle", 0, false);
  const airborne = resolvePetFrame(manifest, "greet", 150, false);

  assert.deepEqual(grounded.anchor, { x: 56, y: 108 });
  assert.equal(grounded.contact, "planted");
  assert.deepEqual(grounded.shadow, { width: 58, opacity: 0.2 });
  assert.equal(airborne.contact, "airborne");
  assert.deepEqual(airborne.shadow, { width: 26, opacity: 0.1 });
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
