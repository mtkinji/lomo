import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_SCENE,
  MOTION_CLIPS,
  clipForMotion,
  type EngineMotion,
} from "../lib/pet-engine.ts";
import {
  LEAFLING_MANIFEST,
  LEAFLING_PRESENTATION,
} from "../lib/leafling.ts";
import { resolvePetFrame } from "../lib/pet-runtime.ts";

test("the reference engine uses a portrait iPhone-scale logical scene", () => {
  assert.deepEqual(ENGINE_SCENE, { width: 160, height: 240 });
  assert.equal(LEAFLING_MANIFEST.atlas.frameWidth, 112);
  assert.equal(LEAFLING_MANIFEST.atlas.frameHeight, 112);
  assert.deepEqual(LEAFLING_MANIFEST.atlas, {
    src: "/leafling-atlas.png",
    frameWidth: 112,
    frameHeight: 112,
    columns: 8,
    rows: 2,
  });
  assert.ok(LEAFLING_PRESENTATION.stages.young.width >= 100);
  assert.ok(LEAFLING_PRESENTATION.stages.evolved.width > LEAFLING_PRESENTATION.stages.young.width);
});

test("Idle and Greet are independent authored animation clips", () => {
  const idle = LEAFLING_MANIFEST.clips.idle;
  const greet = LEAFLING_MANIFEST.clips.greet;

  assert.equal(idle.loop, true);
  assert.equal(idle.frames.length, 6);
  assert.deepEqual(new Set(idle.frames.map((frame) => frame.cell.row)), new Set([0]));
  assert.equal(greet.loop, false);
  assert.equal(greet.frames.length, 8);
  assert.deepEqual(new Set(greet.frames.map((frame) => frame.cell.row)), new Set([1]));
  assert.ok(greet.frames.some((frame) => frame.events?.includes("chirp")));
});

test("every Leafling frame occupies a valid atlas cell", () => {
  for (const clip of Object.values(LEAFLING_MANIFEST.clips)) {
    for (const frame of clip.frames) {
      assert.ok(frame.duration > 0);
      assert.ok(frame.cell.column >= 0 && frame.cell.column < LEAFLING_MANIFEST.atlas.columns);
      assert.ok(frame.cell.row >= 0 && frame.cell.row < LEAFLING_MANIFEST.atlas.rows);
    }
  }
});

test("the reference Pet declares stable animation authoring channels", () => {
  assert.deepEqual(
    LEAFLING_PRESENTATION.channels.map((channel) => channel.id),
    ["tail", "body", "feet", "head", "ears", "face", "eyes", "markings"],
  );

  for (const channel of LEAFLING_PRESENTATION.channels) {
    assert.ok(channel.bounds.width > 0, `${channel.id} needs width`);
    assert.ok(channel.bounds.height > 0, `${channel.id} needs height`);
  }
});

test("prototype reactions map explicitly onto the two authored clips", () => {
  const motions = Object.keys(MOTION_CLIPS) as EngineMotion[];
  assert.deepEqual(motions, ["idle", "blink", "greet", "care", "discover", "sleep", "evolve"]);
  assert.equal(clipForMotion("idle"), "idle");
  assert.equal(clipForMotion("greet"), "greet");
  assert.equal(clipForMotion("care"), "greet");
});

test("reduced motion preserves authored expressions while removing travel", () => {
  const animated = resolvePetFrame(LEAFLING_MANIFEST, "greet", 500, false);
  const reduced = resolvePetFrame(LEAFLING_MANIFEST, "greet", 500, true);

  assert.deepEqual(reduced.cell, animated.cell);
  assert.deepEqual(reduced.events, animated.events);
  assert.notDeepEqual(animated.transform, reduced.transform);
  assert.deepEqual(reduced.transform, { x: 0, y: 0 });
});
