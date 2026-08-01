import assert from "node:assert/strict";
import test from "node:test";

import {
  HABITAT_PERFORMANCE_CLIPS,
  resolveHabitatPerformanceIntensity,
  resolveHabitatPerformance,
} from "../lib/pet-habitat-performance.ts";

test("every habitat material owns nonlinear limited-animation timing", () => {
  for (const [material, clip] of Object.entries(HABITAT_PERFORMANCE_CLIPS)) {
    assert.ok(clip.frames.length >= 4, `${material} needs held and transitional drawings`);
    assert.ok(new Set(clip.frames.map((frame) => frame.duration)).size >= 3);
    assert.ok(clip.frames.some((frame) => frame.role === "hold"));
    assert.ok(clip.frames.some((frame) => frame.role === "accent"));
  }
});

test("roots and trunk stay exactly planted in every material and drawing", () => {
  for (const weather of ["sunny", "breeze", "rain"] as const) {
    for (const elapsedMs of [0, 180, 430, 920, 1740]) {
      const pose = resolveHabitatPerformance(weather, 1, elapsedMs, false);
      assert.equal(pose.trunkRotation, 0);
      assert.equal(pose.rootShift, 0);
    }
  }
});

test("a breeze travels from grass through canopy and into trailing vines", () => {
  const gather = resolveHabitatPerformance("breeze", 1, 235, false);
  const accent = resolveHabitatPerformance("breeze", 1, 330, false);
  const recovery = resolveHabitatPerformance("breeze", 1, 480, false);

  assert.ok(Math.abs(gather.grassLean) > Math.abs(gather.canopyLead));
  assert.ok(Math.abs(accent.canopyLead) > Math.abs(gather.canopyLead));
  assert.ok(Math.abs(recovery.vineLag) > Math.abs(recovery.canopyLead));
  assert.notEqual(accent.canopyLead, accent.canopyFollow);
  assert.equal(accent.material, "wind");
});

test("rain is laterally heavier than breeze and owns downward material cues", () => {
  const wind = resolveHabitatPerformance("breeze", 1, 330, false);
  const rain = resolveHabitatPerformance("rain", 1, 330, false);

  assert.ok(Math.abs(rain.canopyLead) < Math.abs(wind.canopyLead));
  assert.ok(rain.canopyDrop > wind.canopyDrop);
  assert.ok(rain.drip > wind.drip);
  assert.equal(rain.material, "wet");
});

test("sun favors a gentle dapple breath over lateral motion", () => {
  const sun = resolveHabitatPerformance("sunny", 1, 620, false);
  const rain = resolveHabitatPerformance("rain", 1, 620, false);

  assert.ok(sun.dapple > rain.dapple);
  assert.ok(Math.abs(sun.canopyLead) <= 0.7);
  assert.equal(sun.material, "warm");
});

test("Reduce Motion resolves one stable pose regardless of time", () => {
  const early = resolveHabitatPerformance("breeze", 0.72, 20, true);
  const late = resolveHabitatPerformance("breeze", 0.72, 12000, true);

  assert.deepEqual(early, late);
  assert.equal(early.trunkRotation, 0);
  assert.equal(early.rootShift, 0);
  assert.equal(early.looseLeaf, 0);
});

test("Focus stillness remains authoritative over habitat weather acting", () => {
  const ordinaryIntensity = resolveHabitatPerformanceIntensity(1, 0);
  const focusedIntensity = resolveHabitatPerformanceIntensity(1, 1);
  const ordinary = resolveHabitatPerformance("breeze", ordinaryIntensity, 330, false);
  const focused = resolveHabitatPerformance("breeze", focusedIntensity, 330, false);

  assert.equal(ordinaryIntensity, 1);
  assert.ok(focusedIntensity <= 0.181);
  assert.equal(focused.frame, ordinary.frame);
  assert.equal(focused.material, ordinary.material);
  assert.ok(Math.abs(focused.grassLean) < Math.abs(ordinary.grassLean) * 0.2);
  assert.ok(Math.abs(focused.canopyLead) < Math.abs(ordinary.canopyLead) * 0.2);
  assert.ok(focused.looseLeaf < ordinary.looseLeaf * 0.2);
});
