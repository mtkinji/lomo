import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ENGINE_SCENE,
  MOTION_CLIPS,
  clipForMotion,
  resolveGroundCue,
  resolveRequestedClip,
  type EngineMotion,
} from "../lib/pet-engine.ts";
import {
  LEAFLING_MANIFEST,
  LEAFLING_PRESENTATION,
  LEAFLING_STAGE_MANIFESTS,
  leaflingManifestForStage,
} from "../lib/leafling.ts";
import { resolvePetFrame } from "../lib/pet-runtime.ts";

test("the reference engine keeps a low ground plane for a roaming-scale Pet", () => {
  assert.deepEqual(ENGINE_SCENE, { width: 160, height: 240, groundY: 208 });
  assert.equal(LEAFLING_MANIFEST.atlas.frameWidth, 160);
  assert.equal(LEAFLING_MANIFEST.atlas.frameHeight, 128);
  assert.deepEqual(LEAFLING_MANIFEST.atlas, {
    src: "/leafling-motion-atlas-v5.png",
    frameWidth: 160,
    frameHeight: 128,
    columns: 8,
    rows: 12,
  });
  assert.deepEqual(LEAFLING_PRESENTATION.stages.baby, { width: 38, height: 38 });
  assert.deepEqual(LEAFLING_PRESENTATION.stages.young, { width: 46, height: 46 });
  assert.deepEqual(LEAFLING_PRESENTATION.stages.guardian, { width: 62, height: 62 });
});

test("each evolution stage resolves to its own authored animation vocabulary", () => {
  assert.equal(leaflingManifestForStage("young"), LEAFLING_MANIFEST);
  assert.equal(leaflingManifestForStage("baby").atlas.src, "/leafling-stage-atlas-v3.png");
  assert.equal(leaflingManifestForStage("guardian").atlas.src, "/leafling-stage-atlas-v4.png");

  for (const [stage, manifest] of Object.entries(LEAFLING_STAGE_MANIFESTS)) {
    const expectedClips = stage === "guardian"
      ? ["idle", "blink", "greet", "care", "discover", "sleep", "evolve", "walk", "run", "jump", "pounce", "rollover", "aerial"]
      : ["idle", "blink", "greet", "care", "discover", "sleep", "evolve", "walk", "run", "jump", "pounce", "rollover"];
    assert.deepEqual(Object.keys(manifest.clips), expectedClips);
    assert.equal(manifest.clips.walk.loop, true);
    assert.equal(manifest.clips.run.loop, true);
    assert.equal(manifest.clips.walk.frames.length, 8);
    assert.equal(manifest.clips.run.frames.length, 8);
    for (const clip of Object.values(manifest.clips)) {
      for (const authoredFrame of clip.frames) {
        assert.ok(authoredFrame.cell.column < manifest.atlas.columns, `${stage} frame column must exist`);
        assert.ok(authoredFrame.cell.row < manifest.atlas.rows, `${stage} frame row must exist`);
        assert.deepEqual(authoredFrame.anchor, { x: 80, y: 120 });
      }
    }
  }
});

test("Guardian owns a distinct acrobatic sky vocabulary", () => {
  const aerial = leaflingManifestForStage("guardian").clips.aerial;

  assert.equal(aerial.loop, false);
  assert.equal(aerial.frames.length, 8);
  assert.deepEqual(new Set(aerial.frames.map((frame) => frame.cell.row)), new Set([12]));
  assert.deepEqual(
    aerial.frames.map((frame) => frame.events?.[0]),
    ["sightline", "coil", "launch", "rise", "bank", "reach", "land", "settle"],
  );
  assert.ok(aerial.frames[5].transform?.y && aerial.frames[5].transform.y <= -40);
  assert.equal(aerial.frames[5].role, "accent", "the directional reach owns the held apex");
  assert.equal(aerial.frames[6].contact, "planted");
  assert.ok(!("aerial" in leaflingManifestForStage("baby").clips));
  assert.ok(!("aerial" in leaflingManifestForStage("young").clips));
});

test("locomotion sources are normalized to the renderer's screen-right contract", async () => {
  const report = JSON.parse(await readFile(new URL("../art/leafling-locomotion-v1/qa/assembly.json", import.meta.url), "utf8"));
  const guardianWalk = report.rows.find((row: { stage: string; motion: string }) => row.stage === "guardian" && row.motion === "walk");

  assert.equal(guardianWalk.canonical_facing, "screen-right");
  assert.equal(guardianWalk.mirrored_from_source, true);
  assert.ok(report.rows.every((row: { canonical_facing: string }) => row.canonical_facing === "screen-right"));
});

test("the Guardian aerial row assembles without clipping or neighboring-pose debris", async () => {
  const report = JSON.parse(await readFile(new URL("../art/leafling-aerial-v1/qa/assembly.json", import.meta.url), "utf8"));

  assert.equal(report.atlas, "public/leafling-stage-atlas-v4.png");
  assert.equal(report.atlas_row, 12);
  assert.equal(report.canonical_facing, "screen-right");
  assert.equal(report.frames.length, 8);
  for (const frame of report.frames) {
    const [x, y, width, height] = frame.destination;
    assert.ok(x >= 0 && y >= 0, `frame ${frame.frame} must stay inside the top-left cell edges`);
    assert.ok(x + width <= 160, `frame ${frame.frame} must stay inside the right cell edge`);
    assert.ok(y + height <= 128, `frame ${frame.frame} must stay inside the bottom cell edge`);
  }
  assert.ok(
    report.frames.some((frame: { removed_intruding_pixels: number }) => frame.removed_intruding_pixels > 0),
    "assembly should record deterministic removal of overlapping neighboring poses",
  );
});

test("ground cues stay inside the terrain instead of becoming a floating disk", () => {
  const scale = LEAFLING_PRESENTATION.stages.young.height / LEAFLING_MANIFEST.atlas.frameHeight;

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
  assert.deepEqual(clips.map(([id]) => id), ["idle", "blink", "greet", "care", "discover", "sleep", "evolve", "walk", "run", "jump", "pounce", "rollover"]);
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
      assert.deepEqual(frame.anchor, { x: 80, y: 120 });
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
  assert.ok(LEAFLING_MANIFEST.clips.walk.frames.every((frame) => frame.contact === "planted"));
  assert.ok(LEAFLING_MANIFEST.clips.run.frames.some((frame) => frame.contact === "airborne"));
  assert.ok(LEAFLING_MANIFEST.clips.jump.frames.some((frame) => frame.contact === "airborne"));
  assert.equal(LEAFLING_MANIFEST.clips.jump.frames[6].contact, "planted");
  assert.ok(LEAFLING_MANIFEST.clips.pounce.frames.some((frame) => frame.contact === "airborne"));
  assert.equal(LEAFLING_MANIFEST.clips.pounce.frames[5].contact, "planted");
  assert.ok(LEAFLING_MANIFEST.clips.rollover.frames.slice(1, 7).every((frame) => frame.contact === "resting"));
  assert.ok(leaflingManifestForStage("guardian").clips.aerial.frames.slice(2, 6).every((frame) => frame.contact === "airborne"));
});

test("blink uses anime cadence and changes only the eye channel", () => {
  const blink = LEAFLING_MANIFEST.clips.blink;
  const blinkActionDuration = blink.frames.slice(1, 6).reduce((sum, frame) => sum + frame.duration, 0);

  assert.ok(blink.frames[0].duration >= 900, "open eyes need a held key pose");
  assert.ok(blink.frames[7].duration >= 1200, "the loop needs breathing room before another blink");
  assert.ok(blinkActionDuration <= 200, "the eyelid action itself should be involuntary and quick");
  assert.deepEqual(new Set(blink.frames.map((frame) => `${frame.cell.column},${frame.cell.row}`)), new Set(["0,1"]));
  assert.ok(blink.frames.slice(1, 6).every((frame) => frame.layers?.length === 1));
  assert.ok(blink.frames.slice(1, 6).every((frame) => frame.layers?.[0].masks.every((mask) => mask.shape === "ellipse")));
});

test("expressive actions distinguish holds, in-betweens, accents, and recovery", () => {
  for (const clipId of ["greet", "care", "discover", "evolve"] as const) {
    const frames = LEAFLING_MANIFEST.clips[clipId].frames;
    const roles = new Set(frames.map((frame) => frame.role));
    const durations = frames.map((frame) => frame.duration);

    assert.ok(roles.has("hold"), `${clipId} needs a readable held key pose`);
    assert.ok(roles.has("inbetween"), `${clipId} needs fast connective drawings`);
    assert.ok(roles.has("accent"), `${clipId} needs a clear action accent`);
    assert.ok(roles.has("recovery"), `${clipId} needs authored follow-through`);
    assert.ok(Math.max(...durations) / Math.min(...durations) >= 3, `${clipId} timing should not be linear`);
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

test("prototype reactions resolve to their own authored clips", () => {
  const motions = Object.keys(MOTION_CLIPS) as EngineMotion[];
  assert.deepEqual(motions, ["idle", "blink", "greet", "care", "discover", "sleep", "evolve", "jump", "pounce", "rollover"]);
  motions.forEach((motion) => assert.equal(clipForMotion(motion), motion));
});

test("an explicit inspector preview wins over spontaneous world attention", () => {
  assert.equal(resolveRequestedClip("blink", "discover", false, true), "blink");
  assert.equal(resolveRequestedClip("blink", "discover", false, false), "discover");
  assert.equal(resolveRequestedClip("blink", "discover", true, false), "blink");
});

test("reduced motion preserves authored expressions while removing travel", () => {
  const animated = resolvePetFrame(LEAFLING_MANIFEST, "greet", 500, false);
  const reduced = resolvePetFrame(LEAFLING_MANIFEST, "greet", 500, true);

  assert.deepEqual(reduced.cell, animated.cell);
  assert.deepEqual(reduced.events, animated.events);
  assert.notDeepEqual(animated.transform, reduced.transform);
  assert.deepEqual(reduced.transform, { x: 0, y: 0 });
});
