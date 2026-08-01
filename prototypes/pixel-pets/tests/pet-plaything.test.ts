import assert from "node:assert/strict";
import test from "node:test";

import {
  WIND_LEAF,
  catchWindLeaf,
  createWindLeaf,
  dragWindLeaf,
  grabWindLeaf,
  isWindLeafHit,
  releaseWindLeaf,
  stepWindLeaf,
  windLeafModeForStage,
} from "../lib/pet-plaything.ts";

test("maturity unlocks ground, leaping, and aerial wind-leaf play", () => {
  assert.equal(windLeafModeForStage("baby"), "ground");
  assert.equal(windLeafModeForStage("young"), "leap");
  assert.equal(windLeafModeForStage("guardian"), "aerial");
});

test("the perched leaf has one generous invisible grab target", () => {
  const leaf = createWindLeaf();

  assert.equal(leaf.phase, "perched");
  assert.equal(isWindLeafHit(leaf, { x: WIND_LEAF.perchX + 10, y: WIND_LEAF.perchY + 6 }), true);
  assert.equal(isWindLeafHit(leaf, { x: WIND_LEAF.perchX + 24, y: WIND_LEAF.perchY }), false);
});

test("a held leaf follows the finger but remains inside the authored world", () => {
  const held = grabWindLeaf(createWindLeaf(), { x: 140, y: 82 }, "young");
  const dragged = dragWindLeaf(held, { x: 900, y: -40 });

  assert.equal(dragged.phase, "held");
  assert.equal(dragged.mode, "leap");
  assert.equal(dragged.x, WIND_LEAF.maxX);
  assert.equal(dragged.y, WIND_LEAF.minY);
});

test("release preserves throw direction and commits one stable catch target", () => {
  const held = grabWindLeaf(createWindLeaf(), { x: 210, y: 104 }, "guardian");
  const released = releaseWindLeaf(held, { x: -0.08, y: -0.09 }, false);

  assert.equal(released.phase, "flying");
  assert.ok(released.velocityX < 0);
  assert.ok(released.catchX < held.x);

  const later = stepWindLeaf(released, 180);
  assert.equal(later.catchX, released.catchX, "the Pet never chases a moving or reversing intercept");
});

test("ballistic play lands once without escaping the habitat", () => {
  let leaf = releaseWindLeaf(
    grabWindLeaf(createWindLeaf(), { x: WIND_LEAF.maxX - 2, y: 76 }, "young"),
    { x: 0.2, y: -0.12 },
    false,
  );

  for (let elapsed = 0; elapsed < 4000 && leaf.phase === "flying"; elapsed += 32) {
    leaf = stepWindLeaf(leaf, 32);
  }

  assert.equal(leaf.phase, "landed");
  assert.equal(leaf.y, WIND_LEAF.groundY);
  assert.ok(leaf.x <= WIND_LEAF.maxX);
  assert.ok(leaf.x >= WIND_LEAF.minX);
});

test("Reduce Motion keeps the throw meaning with an immediate grounded landing", () => {
  const held = grabWindLeaf(createWindLeaf(), { x: 310, y: 90 }, "guardian");
  const released = releaseWindLeaf(held, { x: 0.09, y: -0.12 }, true);

  assert.equal(released.phase, "landed");
  assert.equal(released.y, WIND_LEAF.groundY);
  assert.equal(released.velocityX, 0);
  assert.equal(released.velocityY, 0);
});

test("a caught leaf holds briefly, then returns quietly to the old tree", () => {
  const caught = catchWindLeaf(
    releaseWindLeaf(grabWindLeaf(createWindLeaf(), { x: 220, y: 120 }, "baby"), { x: 0, y: 0 }, true),
  );

  assert.equal(caught.phase, "caught");
  assert.equal(stepWindLeaf(caught, WIND_LEAF.returnDelayMs - 1).phase, "caught");
  assert.deepEqual(stepWindLeaf(caught, WIND_LEAF.returnDelayMs + 1), createWindLeaf());
});
