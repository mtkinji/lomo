import assert from "node:assert/strict";
import test from "node:test";

import {
  WIND_LEAF,
  catchWindLeaf,
  carryWindLeaf,
  createWindLeaf,
  dragWindLeaf,
  grabWindLeaf,
  isWindLeafHit,
  offerWindLeaf,
  releaseWindLeaf,
  resolveWindLeafFlightProfile,
  stepWindLeaf,
  windLeafModeForStage,
} from "../lib/pet-plaything.ts";

function land(leaf: ReturnType<typeof releaseWindLeaf>) {
  let next = leaf;
  for (let elapsed = 0; elapsed < 4000 && next.phase === "flying"; elapsed += 16) {
    next = stepWindLeaf(next, 16);
  }
  return next;
}

test("maturity unlocks ground, leaping, and aerial wind-leaf play", () => {
  assert.equal(windLeafModeForStage("baby"), "ground");
  assert.equal(windLeafModeForStage("young"), "leap");
  assert.equal(windLeafModeForStage("guardian"), "aerial");
});

test("a loose leaf keeps one generous invisible grab target throughout its flight", () => {
  const perched = createWindLeaf();
  const held = grabWindLeaf(perched, { x: 210, y: 94 }, "young");
  const flying = releaseWindLeaf(held, { x: 0.04, y: -0.05 }, false);
  const landed = { ...flying, phase: "landed" as const, y: WIND_LEAF.groundY };
  const caught = catchWindLeaf(landed);

  assert.equal(isWindLeafHit(perched, { x: WIND_LEAF.perchX + 10, y: WIND_LEAF.perchY + 6 }), true);
  assert.equal(isWindLeafHit(flying, { x: flying.x, y: flying.y }), true);
  assert.equal(isWindLeafHit(landed, { x: landed.x, y: landed.y }), true);
  assert.equal(isWindLeafHit(held, { x: held.x, y: held.y }), false);
  assert.equal(isWindLeafHit(caught, { x: caught.x, y: caught.y }), false);
  assert.equal(isWindLeafHit(perched, { x: WIND_LEAF.perchX + 24, y: WIND_LEAF.perchY }), false);
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

test("sun, breeze, and rain resolve to visibly different immutable flight materials", () => {
  const sun = resolveWindLeafFlightProfile("sunny", 0, 1);
  const breeze = resolveWindLeafFlightProfile("breeze", 2, 1);
  const rain = resolveWindLeafFlightProfile("rain", -0.6, 1);

  assert.equal(sun.id, "sun-updraft");
  assert.equal(breeze.id, "wind-drift");
  assert.equal(rain.id, "rain-heavy");
  assert.ok(sun.gravity < breeze.gravity);
  assert.ok(rain.gravity > breeze.gravity);
  assert.ok(breeze.windX > 0);
  assert.ok(rain.drag < sun.drag);
});

test("the same throw lingers in sun, drifts with wind, and falls quickly in rain", () => {
  const held = grabWindLeaf(createWindLeaf(), { x: 230, y: 92 }, "guardian");
  const velocity = { x: 0.01, y: -0.075 };
  const sun = land(releaseWindLeaf(held, velocity, false, resolveWindLeafFlightProfile("sunny", 0, 1)));
  const breeze = land(releaseWindLeaf(held, velocity, false, resolveWindLeafFlightProfile("breeze", 2.2, 1)));
  const rain = land(releaseWindLeaf(held, velocity, false, resolveWindLeafFlightProfile("rain", 0.4, 1)));

  assert.equal(sun.phase, "landed");
  assert.equal(breeze.phase, "landed");
  assert.equal(rain.phase, "landed");
  assert.ok(sun.ageMs > rain.ageMs + 250, "warm air should hold a dry leaf longer than rain");
  assert.ok(breeze.x > sun.x + 8, "a settled positive gust should move the landing visibly downwind");
  assert.equal(sun.flight.id, "sun-updraft");
  assert.equal(breeze.flight.id, "wind-drift");
  assert.equal(rain.flight.id, "rain-heavy");
});

test("prediction and simulation share one weather profile and one catch point", () => {
  const held = grabWindLeaf(createWindLeaf(), { x: 250, y: 76 }, "young");
  const released = releaseWindLeaf(
    held,
    { x: -0.015, y: -0.09 },
    false,
    resolveWindLeafFlightProfile("breeze", -2, 1),
  );
  const predicted = released.catchX;
  const landed = land(released);

  assert.equal(released.flight.id, "wind-drift");
  assert.ok(released.flight.windX < 0);
  assert.equal(landed.catchX, predicted);
  assert.ok(Math.abs(landed.x - predicted) <= 2, "the authored catch should agree with the simulated landing");
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

test("an ambient caught leaf still returns quietly to the old tree", () => {
  const caught = { ...catchWindLeaf(
    releaseWindLeaf(grabWindLeaf(createWindLeaf(), { x: 220, y: 120 }, "baby"), { x: 0, y: 0 }, true),
  ), throwCount: 0 };

  assert.equal(caught.phase, "caught");
  assert.equal(stepWindLeaf(caught, WIND_LEAF.returnDelayMs - 1).phase, "caught");
  assert.deepEqual(stepWindLeaf(caught, WIND_LEAF.returnDelayMs + 1), createWindLeaf());
});

test("a direct throw remembers where the person's hand released it", () => {
  const held = grabWindLeaf(createWindLeaf(), { x: 118, y: 82 }, "young");
  const thrown = releaseWindLeaf(held, { x: 0.09, y: -0.08 }, false);

  assert.equal(thrown.throwCount, 1);
  assert.deepEqual([thrown.returnX, thrown.returnY], [118, 82]);
});

test("a carried leaf stays visibly attached to each form's forward side", () => {
  const caught = catchWindLeaf(
    releaseWindLeaf(grabWindLeaf(createWindLeaf(), { x: 118, y: 82 }, "baby"), { x: 0, y: 0 }, true),
  );
  const baby = carryWindLeaf(caught, 260, "baby", -1);
  const young = carryWindLeaf(caught, 260, "young", 1);
  const guardian = carryWindLeaf(caught, 260, "guardian", 1);

  assert.equal(baby.phase, "carried");
  assert.ok(baby.x < 260);
  assert.ok(young.x > 260);
  assert.ok(guardian.x > 260);
  assert.equal(baby.y, WIND_LEAF.groundY - 10);
  assert.equal(young.y, WIND_LEAF.groundY - 7);
  assert.equal(guardian.y, WIND_LEAF.groundY - 22);
});

test("Moss can offer the returned leaf for exactly one reciprocal throw", () => {
  const firstThrow = releaseWindLeaf(
    grabWindLeaf(createWindLeaf(), { x: 126, y: 76 }, "young"),
    { x: 0.08, y: -0.08 },
    false,
  );
  const offered = offerWindLeaf(carryWindLeaf(catchWindLeaf(firstThrow), 126, "young", 1));

  assert.equal(offered.phase, "offered");
  assert.deepEqual([offered.x, offered.y], [126, WIND_LEAF.groundY - 10]);
  assert.equal(isWindLeafHit(offered, { x: 126, y: WIND_LEAF.groundY - 10 }), true);

  const secondThrow = releaseWindLeaf(
    grabWindLeaf(offered, { x: offered.x, y: offered.y }, "young"),
    { x: -0.08, y: -0.06 },
    false,
  );
  assert.equal(secondThrow.throwCount, 2);
});
