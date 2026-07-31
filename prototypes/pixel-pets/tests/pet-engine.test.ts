import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_SCENE,
  LEAFLING_RIG,
  animationFrameAt,
  type EngineMotion,
} from "../lib/pet-engine.ts";

test("the reference engine uses a portrait iPhone-scale logical scene", () => {
  assert.deepEqual(ENGINE_SCENE, { width: 160, height: 240 });
  assert.ok(LEAFLING_RIG.young.bounds.width >= 48);
  assert.ok(LEAFLING_RIG.young.bounds.height >= 48);
  assert.ok(LEAFLING_RIG.evolved.bounds.width > LEAFLING_RIG.young.bounds.width);
  assert.ok(LEAFLING_RIG.evolved.bounds.height > LEAFLING_RIG.young.bounds.height);
});

test("the reference Pet exposes independently animated anatomy", () => {
  assert.deepEqual(
    LEAFLING_RIG.layers.map((layer) => layer.id),
    ["tail", "body", "feet", "head", "ears", "face", "eyes", "markings"],
  );

  for (const layer of LEAFLING_RIG.layers) {
    assert.ok(layer.pixels.length > 0, `${layer.id} needs visible pixels`);
    assert.ok(layer.anchor.x >= 0 && layer.anchor.y >= 0);
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

