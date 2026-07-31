import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_SCENE,
  LEAFLING_ATLAS,
  animationFrameAt,
  spriteFrameForSnapshot,
  type EngineMotion,
} from "../lib/pet-engine.ts";

test("the reference engine uses a portrait iPhone-scale logical scene", () => {
  assert.deepEqual(ENGINE_SCENE, { width: 160, height: 240 });
  assert.equal(LEAFLING_ATLAS.frameWidth, 112);
  assert.equal(LEAFLING_ATLAS.frameCount, 4);
  assert.ok(LEAFLING_ATLAS.stages.young.width >= 100);
  assert.ok(LEAFLING_ATLAS.stages.evolved.width > LEAFLING_ATLAS.stages.young.width);
  assert.ok(LEAFLING_ATLAS.stages.evolved.height > LEAFLING_ATLAS.stages.young.height);
});

test("the reference Pet exposes independently animated anatomy", () => {
  assert.deepEqual(
    LEAFLING_ATLAS.channels.map((channel) => channel.id),
    ["tail", "body", "feet", "head", "ears", "face", "eyes", "markings"],
  );

  for (const channel of LEAFLING_ATLAS.channels) {
    assert.ok(channel.bounds.width > 0, `${channel.id} needs width`);
    assert.ok(channel.bounds.height > 0, `${channel.id} needs height`);
    assert.ok(channel.bounds.x >= 0 && channel.bounds.y >= 0);
  }
});

test("every motion resolves to a valid authored sprite frame", () => {
  const motions: EngineMotion[] = ["idle", "blink", "greet", "care", "discover", "sleep", "evolve"];

  for (const motion of motions) {
    const snapshot = animationFrameAt(motion, 360, false);
    const spriteFrame = spriteFrameForSnapshot(snapshot);
    assert.ok(spriteFrame >= 0);
    assert.ok(spriteFrame < LEAFLING_ATLAS.frameCount);
  }
});

test("shared motions resolve to deterministic integer-pixel poses", () => {
  const motions: EngineMotion[] = [
    "idle",
    "blink",
    "greet",
    "care",
    "discover",
    "sleep",
    "evolve",
  ];

  for (const motion of motions) {
    const first = animationFrameAt(motion, 240, false);
    const again = animationFrameAt(motion, 240, false);
    assert.deepEqual(first, again);
    assert.equal(first.motion, motion);
    assert.ok(first.frameCount >= 2);

    for (const pose of Object.values(first.layers)) {
      assert.equal(Number.isInteger(pose.x), true);
      assert.equal(Number.isInteger(pose.y), true);
      assert.equal(Number.isInteger(pose.frame), true);
    }
  }
});

test("reduced motion preserves expression while removing travel", () => {
  const animated = animationFrameAt("greet", 360, false);
  const reduced = animationFrameAt("greet", 360, true);

  assert.notDeepEqual(animated.layers.body, reduced.layers.body);
  assert.equal(reduced.layers.body.x, 0);
  assert.equal(reduced.layers.body.y, 0);
  assert.equal(reduced.layers.eyes.frame, animated.layers.eyes.frame);
});
