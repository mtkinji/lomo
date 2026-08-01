import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveWorldInteractionMessage,
  shouldClearSceneNarration,
  shouldShowSceneNarration,
} from "../lib/pet-world-message.ts";

test("travel to Focus shelter never announces incoming weather", () => {
  assert.deepEqual(
    resolveWorldInteractionMessage("seek-shelter", { focusActive: true, name: "Moss" }),
    {
      title: "Finding quiet together",
      detail: "Moss is padding to a familiar place beneath the leaves.",
    },
  );
});

test("rain shelter travel keeps its weather meaning outside Focus", () => {
  assert.deepEqual(
    resolveWorldInteractionMessage("seek-shelter", { focusActive: false, name: "Moss" }),
    {
      title: "Weather coming",
      detail: "Moss knows where the old tree keeps the ground dry.",
    },
  );
});

test("only causal world events receive visible scene narration", () => {
  const narrated = [
    "weather-notice",
    "wind-brace",
    "rain-flinch",
    "rain-invite",
    "shelter",
    "bask",
    "shade",
    "leaf-invite",
    "leaf-catch",
    "puddle-notice",
    "puddle-invite",
  ] as const;
  const selfExplanatory = [
    "idle",
    "greet",
    "reunion-notice",
    "reunion-approach",
    "reunion-greet",
    "walk",
    "run",
    "jump",
    "rollover",
    "hand-track",
    "hand-walk",
    "hand-run",
    "hand-pounce",
    "hand-aerial",
    "track",
    "visitor-turn",
    "pounce",
    "aerial-pounce",
    "guardian-land",
    "focus",
    "bloom-notice",
    "seek-bloom",
    "admire-bloom",
    "memory-notice",
    "seek-memory",
    "remember",
    "puddle-splash",
  ] as const;

  for (const action of narrated) {
    assert.equal(shouldShowSceneNarration(action, { focusActive: false }), true, action);
  }
  for (const action of selfExplanatory) {
    assert.equal(shouldShowSceneNarration(action, { focusActive: false }), false, action);
  }
});

test("rain shelter travel may be narrated but Focus travel stays in the capability dock", () => {
  assert.equal(shouldShowSceneNarration("seek-shelter", { focusActive: false }), true);
  assert.equal(shouldShowSceneNarration("seek-shelter", { focusActive: true }), false);
});

test("committed puddle play immediately clears earlier scene narration", () => {
  assert.equal(
    shouldClearSceneNarration("puddle-splash", {
      rainGuestOwnsScene: false,
      wildlifeOwnsScene: false,
    }),
    true,
  );
});
