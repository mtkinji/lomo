import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_SCENE,
  MOTION_CLIPS,
  clipForMotion,
  resolveGroundCue,
  type EngineMotion,
} from "../lib/pet-engine.ts";
import {
  LEAFLING_MANIFEST,
  LEAFLING_PRESENTATION,
} from "../lib/leafling.ts";
import { resolvePetFrame } from "../lib/pet-runtime.ts";

test("the reference engine keeps a low ground plane for a roaming-scale Pet", () => {
  assert.deepEqual(ENGINE_SCENE, { width: 160, height: 240, groundY: 208 });
  assert.equal(LEAFLING_MANIFEST.atlas.frameWidth, 128);
  assert.equal(LEAFLING_MANIFEST.atlas.frameHeight, 128);
  assert.deepEqual(LEAFLING_MANIFEST.atlas, {
    src: "/leafling-motion-atlas-v3.png",
    frameWidth: 128,
    frameHeight: 128,
    columns: 8,
    rows: 7,
  });
  assert.deepEqual(LEAFLING_PRESENTATION.stages.young, { width: 44, height: 44 });
  assert.deepEqual(LEAFLING_PRESENTATION.stages.evolved, { width: 52, height: 52 });
});

test("ground cues stay inside the terrain instead of becoming a floating disk", () => {
  const scale = LEAFLING_PRESENTATION.stages.young.width / LEAFLING_MANIFEST.atlas.frameWidth;

  assert.deepEqual(resolveGroundCue("planted", 64, 0.2, scale), {
    width: 4,
    height: 1,
    yOffset: 1,
    opacity: 0.14,
  });
  assert.deepEqual(resolveGroundCue("resting", 94, 0.25, scale), {
    width: 11,
    height: 1,
    yOffset: 1,
    opacity: 0.16,
  });
  assert.deepEqual(resolveGroundCue("airborne", 40, 0.14, scale), {
    width: 6,
    height: 1,
    yOffset: 1,
    opacity: 0.14,
  });
});

test("every behavior owns a complete authored animation row", () => {
  const clips = Object.entries(LEAFLING_MANIFEST.clips);
  assert.deepEqual(clips.map(([id]) => id), ["idle", "blink", "greet", "care", "discover", "sleep", "evolve"]);
  clips.forEach(([id, clip], row) => {
    assert.equal(clip.frames.length, 8, `${id} needs eight authored poses`);
    assert.deepEqual(new Set(clip.frames.map((frame) => frame.cell.row)), new Set([row]));
  });
  assert.equal(LEAFLING_MANIFEST.clips.sleep.loop, true);
  assert.equal(LEAFLING_MANIFEST.clips.sleep.loopFrom, 4);
  assert.ok(LEAFLING_MANIFEST.clips.greet.frames.some((frame) => frame.events?.includes("airborne")));
});

test("every Leafling frame occupies a valid atlas cell", () => {
  for (const clip of Object.values(LEAFLING_MANIFEST.clips)) {
    for (const frame of clip.frames) {
      assert.ok(frame.duration > 0);
      assert.ok(frame.cell.column >= 0 && frame.cell.column < LEAFLING_MANIFEST.atlas.columns);
      assert.ok(frame.cell.row >= 0 && frame.cell.row < LEAFLING_MANIFEST.atlas.rows);
      assert.deepEqual(frame.anchor, { x: 64, y: 120 });
    }
  }
});

test("physical clips declare believable contact changes", () => {
  assert.ok(LEAFLING_MANIFEST.clips.idle.frames.every((frame) => frame.contact === "planted"));
  assert.ok(LEAFLING_MANIFEST.clips.blink.frames.every((frame) => frame.contact === "planted"));
  assert.ok(LEAFLING_MANIFEST.clips.sleep.frames.slice(4).every((frame) => frame.contact === "resting"));
  assert.ok(LEAFLING_MANIFEST.clips.greet.frames.some((frame) => frame.contact === "airborne"));
  assert.equal(LEAFLING_MANIFEST.clips.greet.frames[6].contact, "planted");
  assert.equal(LEAFLING_MANIFEST.clips.evolve.frames[7].contact, "planted");
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

test("prototype reactions resolve to their own authored clips", () => {
  const motions = Object.keys(MOTION_CLIPS) as EngineMotion[];
  assert.deepEqual(motions, ["idle", "blink", "greet", "care", "discover", "sleep", "evolve"]);
  motions.forEach((motion) => assert.equal(clipForMotion(motion), motion));
});

test("reduced motion preserves authored expressions while removing travel", () => {
  const animated = resolvePetFrame(LEAFLING_MANIFEST, "greet", 500, false);
  const reduced = resolvePetFrame(LEAFLING_MANIFEST, "greet", 500, true);

  assert.deepEqual(reduced.cell, animated.cell);
  assert.deepEqual(reduced.events, animated.events);
  assert.notDeepEqual(animated.transform, reduced.transform);
  assert.deepEqual(reduced.transform, { x: 0, y: 0 });
});
