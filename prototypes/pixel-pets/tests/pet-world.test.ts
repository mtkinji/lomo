import assert from "node:assert/strict";
import test from "node:test";

import {
  PET_WORLD,
  applyWorldIntent,
  createPetWorldState,
  beginCompanionFocus,
  clipForWorldAction,
  setWorldWeather,
  resolveTapIntent,
  resolveRolloverPose,
  setWorldZoom,
  spawnInsect,
  stepPetWorld,
} from "../lib/pet-world.ts";

test("world travel requests authored locomotion instead of an idle fallback", () => {
  assert.equal(clipForWorldAction("walk"), "walk");
  assert.equal(clipForWorldAction("run"), "run");
  assert.equal(clipForWorldAction("seek-shelter"), "walk");
  assert.equal(clipForWorldAction("bask"), "walk");
  assert.equal(clipForWorldAction("jump"), "greet");
});

test("rain changes the world into a shelter-seeking behavior", () => {
  const raining = setWorldWeather(createPetWorldState(), "rain");

  assert.equal(raining.weather, "rain");
  assert.equal(raining.action, "seek-shelter");
  assert.equal(raining.targetX, PET_WORLD.treeShelterX);

  let sheltered = raining;
  for (let step = 0; step < 20; step += 1) sheltered = stepPetWorld(sheltered, 250, false);

  assert.equal(sheltered.action, "shelter");
  assert.ok(Math.abs(sheltered.petX - PET_WORLD.treeShelterX) <= 2);
});

test("a passing insect cannot pull the Pet out of rain shelter", () => {
  const sheltered = {
    ...spawnInsect(createPetWorldState(), { x: PET_WORLD.treeShelterX + 8, y: 170 }),
    petX: PET_WORLD.treeShelterX,
    cameraX: PET_WORLD.treeShelterX,
    weather: "rain" as const,
    action: "shelter" as const,
  };
  const after = stepPetWorld(sheltered, 120, false);

  assert.equal(after.action, "shelter");
  assert.equal(after.petX, PET_WORLD.treeShelterX);
});

test("wind has a bounded grounded sway instead of lifting the Pet", () => {
  const breezy = setWorldWeather(createPetWorldState(), "breeze");
  const after = stepPetWorld(breezy, 420, false);

  assert.equal(after.weather, "breeze");
  assert.ok(Math.abs(after.weatherSway) > 0.2);
  assert.ok(Math.abs(after.weatherSway) <= PET_WORLD.maxWeatherSway);
  assert.equal(after.poseY, 0);
});

test("reduced motion preserves weather meaning by settling directly into shelter", () => {
  const raining = setWorldWeather(createPetWorldState(), "rain");
  const after = stepPetWorld(raining, 400, true);

  assert.equal(after.action, "shelter");
  assert.equal(after.petX, PET_WORLD.treeShelterX);
  assert.equal(after.weatherSway, 0);
});

test("focus together settles under the tree and completes without inventing a streak", () => {
  let focusing = beginCompanionFocus(createPetWorldState(), 1200);
  assert.equal(focusing.focus.remainingMs, 1200);
  assert.equal(focusing.targetX, PET_WORLD.treeShelterX);

  for (let step = 0; step < 8; step += 1) focusing = stepPetWorld(focusing, 250, false);

  assert.equal(focusing.focus.active, false);
  assert.equal(focusing.focus.completed, true);
  assert.equal(focusing.action, "greet");
});

test("screen taps resolve into world-space attention and travel intents", () => {
  const world = createPetWorldState();

  assert.deepEqual(resolveTapIntent(world, { x: 80, y: 190 }), { kind: "greet", worldX: 240 });
  assert.deepEqual(resolveTapIntent(world, { x: 142, y: 188 }), { kind: "move", worldX: 302 });
  assert.deepEqual(resolveTapIntent(world, { x: 24, y: 72 }), { kind: "jump", worldX: 184 });
});

test("zoom is temporary camera state clamped to a humane close-up", () => {
  const world = createPetWorldState();

  assert.equal(setWorldZoom(world, 1.8).zoom, 1.8);
  assert.equal(setWorldZoom(world, 99).zoom, PET_WORLD.maxZoom);
  assert.equal(setWorldZoom(world, 0.2).zoom, PET_WORLD.minZoom);
});

test("a distant ground tap produces real locomotion and camera follow", () => {
  const start = createPetWorldState();
  const moving = applyWorldIntent(start, { kind: "move", worldX: 390 });
  const after = stepPetWorld(moving, 500, false);

  assert.equal(after.action, "run");
  assert.ok(after.petX > start.petX);
  assert.equal(after.facing, 1);
  assert.ok(after.cameraX > start.cameraX);
  assert.equal(after.poseY, 0, "the authored gait owns vertical weight transfer");
});

test("high taps jump toward the finger and return safely to idle", () => {
  const start = applyWorldIntent(createPetWorldState(), { kind: "jump", worldX: 300 });
  const airborne = stepPetWorld(start, 300, false);
  const landed = stepPetWorld(airborne, 700, false);

  assert.equal(airborne.action, "jump");
  assert.ok(airborne.poseY < 0);
  assert.equal(landed.action, "idle");
  assert.equal(landed.poseY, 0);
});

test("fireflies recruit attention and can provoke a pounce", () => {
  const start = spawnInsect(createPetWorldState(), { x: 258, y: 170, direction: -1 });
  const after = stepPetWorld(start, 80, false);

  assert.equal(after.insect.active, true);
  assert.equal(after.action, "pounce");
  assert.equal(after.facing, 1);
});

test("an ordinary firefly flight eventually enters pounce range", () => {
  const start = spawnInsect(createPetWorldState(), { direction: 1 });
  const after = stepPetWorld(start, 3000, false);

  assert.equal(after.action, "pounce");
  assert.ok(after.insect.y > 158);
});

test("rollover is a finite grounded performance", () => {
  const rolling = applyWorldIntent(createPetWorldState(), { kind: "rollover", worldX: 240 });
  const middle = stepPetWorld(rolling, 550, false);
  const finished = stepPetWorld(middle, 800, false);

  assert.equal(middle.action, "rollover");
  assert.ok(middle.rotation > 120 && middle.rotation < 260);
  assert.equal(finished.action, "idle");
  assert.equal(finished.rotation, 0);
});

test("rollover curls before rotating and uncurls before it ends", () => {
  assert.deepEqual(resolveRolloverPose(180), { rotation: 0, clipElapsed: 564 });
  assert.deepEqual(resolveRolloverPose(600), { rotation: 180, clipElapsed: 1000 });
  assert.deepEqual(resolveRolloverPose(1020), { rotation: 0, clipElapsed: 564 });
});

test("reduced motion preserves intent without travel or spins", () => {
  const moving = applyWorldIntent(createPetWorldState(), { kind: "move", worldX: 390 });
  const after = stepPetWorld(moving, 500, true);

  assert.equal(after.petX, moving.petX);
  assert.equal(after.cameraX, moving.cameraX);
  assert.equal(after.rotation, 0);
});
