import assert from "node:assert/strict";
import test from "node:test";

import {
  previousStageFor,
  resolveEvolutionCameraFrame,
  resolveEvolutionAtmosphere,
  resolveEvolutionComposition,
} from "../lib/pet-evolution.ts";

test("each mature form remembers the body it grew from", () => {
  assert.equal(previousStageFor("baby"), null);
  assert.equal(previousStageFor("young"), "baby");
  assert.equal(previousStageFor("guardian"), "young");
});

test("an evolution ceremony recognizes, gathers, hands off, then arrives", () => {
  const recognize = resolveEvolutionComposition(0.08, false);
  const gather = resolveEvolutionComposition(0.3, false);
  const handoff = resolveEvolutionComposition(0.54, false);
  const arrive = resolveEvolutionComposition(0.9, false);

  assert.equal(recognize.phase, "recognize");
  assert.equal(recognize.previousOpacity, 1);
  assert.equal(recognize.currentOpacity, 0);

  assert.equal(gather.phase, "gather");
  assert.ok(gather.motesOpacity > 0.5);
  assert.equal(gather.previousOpacity, 1);

  assert.equal(handoff.phase, "handoff");
  assert.ok(handoff.previousOpacity > 0);
  assert.ok(handoff.currentOpacity > 0);
  assert.ok(handoff.currentScale < 1);

  assert.equal(arrive.phase, "arrive");
  assert.equal(arrive.previousOpacity, 0);
  assert.equal(arrive.currentOpacity, 1);
  assert.equal(arrive.currentScale, 1);
  assert.equal(arrive.currentYOffset, 0);
});

test("composition values remain bounded even when playback reports an overshoot", () => {
  for (const progress of [-2, 0, 0.25, 0.5, 0.75, 1, 4]) {
    const composition = resolveEvolutionComposition(progress, false);
    assert.ok(composition.previousOpacity >= 0 && composition.previousOpacity <= 1);
    assert.ok(composition.currentOpacity >= 0 && composition.currentOpacity <= 1);
    assert.ok(composition.motesOpacity >= 0 && composition.motesOpacity <= 1);
    assert.ok(composition.previousScale > 0 && composition.previousScale <= 1.1);
    assert.ok(composition.currentScale > 0 && composition.currentScale <= 1.1);
  }
});

test("Reduce Motion keeps the form handoff stable and removes orbiting flourishes", () => {
  const before = resolveEvolutionComposition(0.35, true);
  const handoff = resolveEvolutionComposition(0.52, true);
  const after = resolveEvolutionComposition(0.7, true);

  for (const composition of [before, handoff, after]) {
    assert.equal(composition.previousScale, 1);
    assert.equal(composition.currentScale, 1);
    assert.equal(composition.currentYOffset, 0);
    assert.equal(composition.motesOpacity, 0);
  }
  assert.equal(before.previousOpacity, 1);
  assert.equal(before.currentOpacity, 0);
  assert.ok(handoff.previousOpacity > 0 && handoff.currentOpacity > 0);
  assert.equal(after.previousOpacity, 0);
  assert.equal(after.currentOpacity, 1);
});

test("the whole world responds more strongly when a Guardian arrives", () => {
  const youngGather = resolveEvolutionAtmosphere(0.42, "young", false);
  const guardianGather = resolveEvolutionAtmosphere(0.42, "guardian", false);
  const youngArrival = resolveEvolutionAtmosphere(0.82, "young", false);
  const guardianArrival = resolveEvolutionAtmosphere(0.82, "guardian", false);

  assert.ok(youngGather.cameraPush > 0);
  assert.ok(guardianGather.cameraPush > youngGather.cameraPush);
  assert.ok(guardianGather.canopyImpulse > youngGather.canopyImpulse);
  assert.ok(guardianArrival.groundWake > youngArrival.groundWake * 2);
  assert.ok(guardianArrival.wakeRadius > youngArrival.wakeRadius);
  assert.ok(guardianArrival.lightOpacity > 0);
});

test("the evolution atmosphere begins and ends at rest", () => {
  for (const stage of ["young", "guardian"] as const) {
    for (const progress of [0, 1]) {
      const atmosphere = resolveEvolutionAtmosphere(progress, stage, false);
      assert.equal(atmosphere.cameraPush, 0);
      assert.equal(atmosphere.cameraCentering, 0);
      assert.equal(atmosphere.canopyImpulse, 0);
      assert.equal(atmosphere.groundWake, 0);
      assert.equal(atmosphere.wakeRadius, 0);
      assert.equal(atmosphere.lightOpacity, 0);
    }
  }
});

test("Reduce Motion preserves a quiet arrival light without moving the camera or habitat", () => {
  const atmosphere = resolveEvolutionAtmosphere(0.58, "guardian", true);

  assert.equal(atmosphere.cameraPush, 0);
  assert.equal(atmosphere.cameraCentering, 0);
  assert.equal(atmosphere.canopyImpulse, 0);
  assert.equal(atmosphere.groundWake, 0);
  assert.equal(atmosphere.wakeRadius, 0);
  assert.ok(atmosphere.lightOpacity > 0);
});

test("an evolution camera gather never exposes space beyond the habitat", () => {
  const atmosphere = resolveEvolutionAtmosphere(0.42, "guardian", false);
  const camera = resolveEvolutionCameraFrame(145, 24, 1, atmosphere);
  const halfView = 160 / (2 * camera.zoom);

  assert.ok(camera.cameraX >= halfView);
  assert.ok(camera.cameraX <= 480 - halfView);
  assert.ok(camera.cameraX - halfView >= 0);
  assert.ok(camera.cameraX + halfView <= 480);
});
