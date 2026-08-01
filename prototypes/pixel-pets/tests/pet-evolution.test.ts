import assert from "node:assert/strict";
import test from "node:test";

import {
  previousStageFor,
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
