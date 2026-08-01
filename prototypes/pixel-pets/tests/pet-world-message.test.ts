import assert from "node:assert/strict";
import test from "node:test";

import { resolveWorldInteractionMessage } from "../lib/pet-world-message.ts";

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
