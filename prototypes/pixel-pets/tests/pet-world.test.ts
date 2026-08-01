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
  resolveFocusAtmosphere,
  setWorldZoom,
  spawnVisitor,
  stepPetWorld,
} from "../lib/pet-world.ts";

test("world travel requests authored locomotion instead of an idle fallback", () => {
  assert.equal(clipForWorldAction("walk"), "walk");
  assert.equal(clipForWorldAction("run"), "run");
  assert.equal(clipForWorldAction("seek-shelter"), "walk");
  assert.equal(clipForWorldAction("seek-sun"), "walk");
  assert.equal(clipForWorldAction("seek-shade"), "walk");
  assert.equal(clipForWorldAction("bask"), "idle");
  assert.equal(clipForWorldAction("shade"), "sleep");
  assert.equal(clipForWorldAction("jump"), "jump");
  assert.equal(clipForWorldAction("pounce"), "pounce");
  assert.equal(clipForWorldAction("rollover"), "rollover");
});

test("sun warms Leafling before it chooses the old tree's shade", () => {
  let sunny = setWorldWeather(createPetWorldState(), "sunny");
  assert.equal(sunny.action, "seek-sun");
  assert.equal(sunny.targetX, PET_WORLD.sunPatchX);

  for (let step = 0; step < 24; step += 1) sunny = stepPetWorld(sunny, 250, false);
  assert.equal(sunny.action, "bask");
  assert.ok(Math.abs(sunny.petX - PET_WORLD.sunPatchX) <= 2);

  sunny = stepPetWorld(sunny, PET_WORLD.sunBaskDuration, false);
  assert.equal(sunny.action, "seek-shade");
  assert.equal(sunny.targetX, PET_WORLD.treeShelterX);

  for (let step = 0; step < 36; step += 1) sunny = stepPetWorld(sunny, 250, false);
  assert.equal(sunny.action, "shade");
  assert.ok(Math.abs(sunny.petX - PET_WORLD.treeShelterX) <= 2);
});

test("reduced motion preserves the sunny heat-to-shade story without travel", () => {
  const seekingSun = setWorldWeather(createPetWorldState(), "sunny");
  const basking = stepPetWorld(seekingSun, 400, true);
  const shaded = stepPetWorld(basking, PET_WORLD.sunBaskDuration, true);

  assert.equal(basking.action, "bask");
  assert.equal(basking.petX, PET_WORLD.sunPatchX);
  assert.equal(shaded.action, "shade");
  assert.equal(shaded.petX, PET_WORLD.treeShelterX);
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

test("a passing visitor cannot pull the Pet out of rain shelter", () => {
  const sheltered = {
    ...spawnVisitor(createPetWorldState(), "young", { x: PET_WORLD.treeShelterX + 8, y: 170 }),
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
  assert.equal(focusing.focus.durationMs, 1200);
  assert.equal(focusing.focus.elapsedMs, 0);
  assert.equal(focusing.targetX, PET_WORLD.treeShelterX);

  for (let step = 0; step < 8; step += 1) focusing = stepPetWorld(focusing, 250, false);

  assert.equal(focusing.focus.active, false);
  assert.equal(focusing.focus.completed, true);
  assert.equal(focusing.action, "greet");
});

test("starting shared focus clears wildlife and enters a portable stillness clock", () => {
  const withVisitor = spawnVisitor(createPetWorldState(), "young", { x: 250 });
  const focusing = beginCompanionFocus(withVisitor, 15000);
  const after = stepPetWorld(focusing, 2200, false);

  assert.equal(focusing.visitor.active, false);
  assert.equal(after.focus.active, true);
  assert.equal(after.focus.elapsedMs, 2200);
  assert.equal(after.focus.remainingMs, 12800);
});

test("shared focus hushes weather and carries a gentle breathing cadence", () => {
  const breezy = setWorldWeather(createPetWorldState(), "breeze");
  const ordinary = stepPetWorld(breezy, 420, false);
  const focusing = beginCompanionFocus(breezy, 15000);
  const quiet = stepPetWorld(focusing, 420, false);
  const atmosphere = resolveFocusAtmosphere(quiet.focus, false);

  assert.ok(atmosphere.hush > 0);
  assert.ok(atmosphere.breath >= 0 && atmosphere.breath <= 1);
  assert.ok(Math.abs(quiet.weatherSway) < Math.abs(ordinary.weatherSway));
});

test("Reduce Motion keeps focus meaning without a pulsing cadence", () => {
  const focusing = beginCompanionFocus(createPetWorldState(), 15000);
  const settled = stepPetWorld(focusing, 100, true);
  const after = stepPetWorld(settled, 3200, true);
  const atmosphere = resolveFocusAtmosphere(after.focus, true);

  assert.equal(settled.action, "focus");
  assert.equal(after.action, "focus", "shared stillness must not become idle while its clock is active");
  assert.equal(atmosphere.hush, 1);
  assert.equal(atmosphere.breath, 0.5);
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

test("camera follow never makes forward locomotion move backward on screen", () => {
  const movingRight = {
    ...createPetWorldState(),
    petX: 300,
    cameraX: 285.5,
    action: "run" as const,
    targetX: 350,
    facing: 1 as const,
  };
  const movingLeft = {
    ...createPetWorldState(),
    petX: 180,
    cameraX: 194.5,
    action: "run" as const,
    targetX: 130,
    facing: -1 as const,
  };

  const rightScreenX = movingRight.petX - movingRight.cameraX;
  const leftScreenX = movingLeft.petX - movingLeft.cameraX;
  const afterRight = stepPetWorld(movingRight, 16, false);
  const afterLeft = stepPetWorld(movingLeft, 16, false);

  assert.ok(afterRight.petX - afterRight.cameraX >= rightScreenX, "right-facing travel cannot slide left");
  assert.ok(afterLeft.petX - afterLeft.cameraX <= leftScreenX, "left-facing travel cannot slide right");
});

test("high taps jump toward the finger and return safely to idle", () => {
  const start = applyWorldIntent(createPetWorldState(), { kind: "jump", worldX: 300 });
  const airborne = stepPetWorld(start, 300, false);
  const landed = stepPetWorld(airborne, 700, false);

  assert.equal(airborne.action, "jump");
  assert.ok(airborne.petX > start.petX, "the world still owns horizontal reach");
  assert.equal(airborne.poseY, 0, "the authored jump row owns body lift");
  assert.equal(landed.action, "idle");
  assert.equal(landed.poseY, 0);
});

test("each stage attracts a visitor at a newly reachable layer", () => {
  const baby = spawnVisitor(createPetWorldState(), "baby");
  const young = spawnVisitor(createPetWorldState(), "young");
  const guardian = spawnVisitor(createPetWorldState(), "guardian");

  assert.deepEqual(
    [baby.visitor.kind, young.visitor.kind, guardian.visitor.kind],
    ["crawler", "firefly", "sky-moth"],
  );
  assert.ok(baby.visitor.y > young.visitor.y);
  assert.ok(young.visitor.y > guardian.visitor.y);
});

test("tracking a visitor advances one attention performance instead of restarting every frame", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 300, direction: -1 });
  const noticed = stepPetWorld(start, 100, false);
  const tracking = stepPetWorld(noticed, 100, false);

  assert.equal(noticed.action, "track");
  assert.equal(tracking.action, "track");
  assert.equal(tracking.actionElapsed, 100);
});

test("a crossing firefly keeps its intercept on the visible side and cannot provoke a backward retry", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 226, y: 164, direction: 1 });
  const launched = stepPetWorld(start, 80, false);
  const fromRight = spawnVisitor(createPetWorldState(), "young", { x: 254, y: 164, direction: -1 });
  const launchedFromRight = stepPetWorld(fromRight, 80, false);
  const pursuit = stepPetWorld(launched, 260, false);
  const recovered = stepPetWorld(launched, PET_WORLD.pounceDuration, false);

  assert.equal(launched.action, "pounce");
  assert.equal(launched.facing, -1, "the Pet first faces the firefly that is still visibly left");
  assert.ok((launched.targetX ?? 0) < launched.petX, "prediction cannot pass through the Pet's body");
  assert.equal(launched.visitor.engaged, true);
  assert.equal(launched.visitor.direction, -1, "the firefly evades outward on the committed side");
  assert.ok(pursuit.visitor.x < pursuit.petX, "the visible visitor cannot cross behind the Pet during pursuit");
  assert.equal(launched.poseY, 0, "the authored pounce row owns body lift");
  assert.equal(launchedFromRight.facing, 1, "the mirrored case faces the visible firefly on the right");
  assert.ok((launchedFromRight.targetX ?? 0) > launchedFromRight.petX);
  assert.equal(recovered.action, "idle");
  assert.equal(recovered.visitor.active, false, "one visitor cannot provoke an opposite-facing second launch");
});

test("guardian tracks a high sky moth with its aerial vocabulary", () => {
  const start = spawnVisitor(createPetWorldState(), "guardian", { x: 260, direction: -1 });
  const after = stepPetWorld(start, 80, false);

  assert.equal(after.visitor.kind, "sky-moth");
  assert.ok(after.visitor.y < 130);
  assert.equal(after.action, "aerial-pounce");
  assert.equal(clipForWorldAction(after.action), "aerial");
  assert.equal(after.facing, 1, "the Guardian faces the sky moth that is still visibly right");
  assert.equal(after.visitor.direction, 1, "the sky moth escapes farther into the chosen side of the shot");
});

test("a pursued sky moth remains visible through the Guardian's committed reach", () => {
  const nearEdge = {
    ...createPetWorldState(),
    petX: 430,
    cameraX: 400,
  };
  const visitor = spawnVisitor(nearEdge, "guardian", { x: 448, direction: -1 });
  const launched = stepPetWorld(visitor, 80, false);
  const reaching = stepPetWorld(launched, 300, false);

  assert.equal(launched.action, "aerial-pounce");
  assert.equal(launched.facing, 1);
  assert.equal(reaching.visitor.active, true, "the target cannot vanish before the aerial performance resolves");
  assert.ok(reaching.visitor.x <= PET_WORLD.maxX);
});

test("rollover is a finite grounded performance", () => {
  const rolling = applyWorldIntent(createPetWorldState(), { kind: "rollover", worldX: 240 });
  const middle = stepPetWorld(rolling, 550, false);
  const finished = stepPetWorld(middle, 800, false);

  assert.equal(middle.action, "rollover");
  assert.equal(middle.rotation, 0, "the authored rollover row owns the body turn");
  assert.equal(finished.action, "idle");
  assert.equal(finished.rotation, 0);
});

test("reduced motion preserves intent without travel or spins", () => {
  const moving = applyWorldIntent(createPetWorldState(), { kind: "move", worldX: 390 });
  const after = stepPetWorld(moving, 500, true);

  assert.equal(after.petX, moving.petX);
  assert.equal(after.cameraX, moving.cameraX);
  assert.equal(after.rotation, 0);
});
