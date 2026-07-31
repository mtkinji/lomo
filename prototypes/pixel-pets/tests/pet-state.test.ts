import assert from "node:assert/strict";
import test from "node:test";

import {
  advancePrototypeDay,
  completeMeaningfulAction,
  createPetState,
  giveCare,
} from "../lib/pet-state.ts";
import { PET_SPRITES, SPRITE_SIZE } from "../lib/pet-sprites.ts";

test("every Pet uses a true fixed-resolution sprite grid for both stages", () => {
  for (const stages of Object.values(PET_SPRITES)) {
    assert.notDeepEqual(stages.young, stages.evolved);
    for (const rows of Object.values(stages)) {
      assert.equal(rows.length, SPRITE_SIZE);
      for (const row of rows) {
        assert.equal(row.length, SPRITE_SIZE);
        assert.match(row, /^[.12345]+$/);
      }
    }
  }
});

test("only the first meaningful action of a prototype day prepares care", () => {
  const initial = createPetState("leafling", "Moss", "moss");
  const afterTodo = completeMeaningfulAction(initial, "todo");
  const afterFocus = completeMeaningfulAction(afterTodo, "focus");

  assert.equal(afterTodo.careAvailable, true);
  assert.equal(afterTodo.pendingSource, "todo");
  assert.equal(afterFocus.careAvailable, true);
  assert.equal(afterFocus.pendingSource, "todo");
  assert.match(afterFocus.lastReceipt, /noticed that .* too/i);
});

test("care is recorded once per day and cannot be ground repeatedly", () => {
  const ready = completeMeaningfulAction(
    createPetState("ripplefin", "Bloop", "lagoon"),
    "focus",
  );
  const cared = giveCare(ready);
  const duplicate = giveCare(cared);

  assert.equal(cared.careDays, 1);
  assert.equal(cared.caredPrototypeDay, 1);
  assert.equal(cared.careAvailable, false);
  assert.deepEqual(duplicate, cared);
});

test("five distinct care days create the first evolution", () => {
  let state = createPetState("glowmoth", "Luma", "ember");

  for (let day = 1; day <= 5; day += 1) {
    state = giveCare(completeMeaningfulAction(state, "todo"));
    if (day < 5) state = advancePrototypeDay(state);
  }

  assert.equal(state.careDays, 5);
  assert.equal(state.stage, "evolved");
  assert.equal(state.reaction, "evolve");
});

test("advancing through quiet days never removes care or evolution", () => {
  let state = createPetState("pebbleback", "Pip", "clay");
  state = giveCare(completeMeaningfulAction(state, "focus"));
  state = advancePrototypeDay(advancePrototypeDay(advancePrototypeDay(state)));

  assert.equal(state.careDays, 1);
  assert.equal(state.stage, "young");
  assert.equal(state.careAvailable, false);
  assert.match(state.lastReceipt, /quiet new day/i);
});
