import assert from "node:assert/strict";
import test from "node:test";

import {
  advancePrototypeDay,
  completeMeaningfulAction,
  consumeStageDebut,
  createPetState,
  giveCare,
  isStageDebutReady,
  resolvePrototypeDayPhase,
  resolveCareWorldTiming,
  withReaction,
} from "../lib/pet-state.ts";

test("the capability exposes one honest phase for each part of the daily rhythm", () => {
  const initial = createPetState("leafling", "Moss", "moss");
  const ready = completeMeaningfulAction(initial, "todo");
  const settling = giveCare(ready);
  const complete = withReaction(settling, "idle");
  const tomorrow = advancePrototypeDay(complete);

  assert.equal(resolvePrototypeDayPhase(initial), "choose-action");
  assert.equal(resolvePrototypeDayPhase(ready), "care-ready");
  assert.equal(resolvePrototypeDayPhase(settling), "care-settling");
  assert.equal(resolvePrototypeDayPhase(complete), "day-complete");
  assert.equal(resolvePrototypeDayPhase(tomorrow), "choose-action");
  assert.equal(tomorrow.reaction, "greet", "a new morning should welcome rather than strand Moss asleep");
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
  assert.equal(afterTodo.habitatGrowth, 1);
  assert.equal(afterFocus.habitatGrowth, 1, "extra activity cannot be farmed into habitat growth");
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

test("evolution finishes its ceremony before evening takes control of the world", () => {
  assert.equal(resolveCareWorldTiming("eat"), "now");
  assert.equal(resolveCareWorldTiming("evolve"), "after-reaction");
});

test("three distinct care days grow a baby into a young Leafling", () => {
  let state = createPetState("glowmoth", "Luma", "ember");

  for (let day = 1; day <= 3; day += 1) {
    state = giveCare(completeMeaningfulAction(state, "todo"));
    if (day < 3) state = advancePrototypeDay(state);
  }

  assert.equal(state.careDays, 3);
  assert.equal(state.stage, "young");
  assert.equal(state.stageDebutPending, true);
  assert.equal(state.reaction, "evolve");
  assert.match(state.lastReceipt, /young Leafling/i);
});

test("eight distinct care days grow a young Leafling into a guardian", () => {
  let state = createPetState("leafling", "Moss", "moss");

  for (let day = 1; day <= 8; day += 1) {
    state = giveCare(completeMeaningfulAction(state, "focus"));
    if (day < 8) state = advancePrototypeDay(state);
  }

  assert.equal(state.careDays, 8);
  assert.equal(state.stage, "guardian");
  assert.equal(state.stageDebutPending, true);
  assert.equal(state.reaction, "evolve");
  assert.match(state.lastReceipt, /Guardian Leafling/i);
});

test("a new form keeps one debut encounter for its first morning", () => {
  let state = createPetState("leafling", "Moss", "moss");

  for (let day = 1; day <= 3; day += 1) {
    state = giveCare(completeMeaningfulAction(state, "focus"));
    if (day < 3) state = advancePrototypeDay(state);
  }

  const firstYoungMorning = advancePrototypeDay(state);
  const afterDebut = consumeStageDebut(firstYoungMorning);

  assert.equal(firstYoungMorning.stage, "young");
  assert.equal(firstYoungMorning.stageDebutPending, true);
  assert.equal(afterDebut.stageDebutPending, false);
  assert.deepEqual(consumeStageDebut(afterDebut), afterDebut, "the debut cannot be harvested twice");
});

test("a form debut waits for calm daylight on the morning after evolution", () => {
  let evolved = createPetState("leafling", "Moss", "moss");
  for (let day = 1; day <= 3; day += 1) {
    evolved = giveCare(completeMeaningfulAction(evolved, "focus"));
    if (day < 3) evolved = advancePrototypeDay(evolved);
  }
  const morning = advancePrototypeDay(evolved);
  const calmDay = { daylightPhase: "day", action: "idle", visitorActive: false, focusActive: false } as const;

  assert.equal(isStageDebutReady(evolved, calmDay), false, "the evolution evening is not the debut morning");
  assert.equal(isStageDebutReady(morning, { ...calmDay, daylightPhase: "dawn" }), false);
  assert.equal(isStageDebutReady(morning, { ...calmDay, action: "greet" }), false);
  assert.equal(isStageDebutReady(morning, { ...calmDay, visitorActive: true }), false);
  assert.equal(isStageDebutReady(morning, calmDay), true);
  assert.equal(isStageDebutReady(consumeStageDebut(morning), calmDay), false);
});

test("advancing through quiet days never removes care or evolution", () => {
  let state = createPetState("pebbleback", "Pip", "clay");
  state = giveCare(completeMeaningfulAction(state, "focus"));
  state = advancePrototypeDay(advancePrototypeDay(advancePrototypeDay(state)));

  assert.equal(state.careDays, 1);
  assert.equal(state.habitatGrowth, 1);
  assert.equal(state.stage, "baby");
  assert.equal(state.careAvailable, false);
  assert.match(state.lastReceipt, /new morning.*nothing was lost/i);
});

test("playing together can prepare the same bounded daily care moment", () => {
  const initial = createPetState("leafling", "Moss", "moss");
  const afterPlay = completeMeaningfulAction(initial, "play");

  assert.equal(afterPlay.careAvailable, true);
  assert.equal(afterPlay.pendingSource, "play");
  assert.match(afterPlay.lastReceipt, /playing together/i);
});
