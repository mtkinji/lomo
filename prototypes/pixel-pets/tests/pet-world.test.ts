import assert from "node:assert/strict";
import test from "node:test";

import {
  PET_WORLD,
  applyWorldIntent,
  createPetWorldState,
  beginCompanionFocus,
  beginMemoryVisit,
  beginTreeRest,
  clipForWorldAction,
  setWorldWeather,
  resolveTapIntent,
  resolveFocusAtmosphere,
  nextWeatherKind,
  plantProgressBloom,
  restorePetWorldMemory,
  resolveCameraTargetX,
  resolveCinematicShot,
  serializePetWorldMemory,
  setWorldZoom,
  spawnVisitor,
  stepPetWorld,
} from "../lib/pet-world.ts";

test("durable world memory contains only bounded privacy-safe scenery", () => {
  let world = createPetWorldState();
  for (let index = 0; index < 4; index += 1) world = plantProgressBloom(world);
  world = {
    ...world,
    action: "focus",
    weather: "rain",
    petX: 84,
    cameraX: 92,
    visitor: { ...world.visitor, active: true, x: 116, ageMs: 320 },
  };

  const memory = serializePetWorldMemory(world);

  assert.deepEqual(Object.keys(memory).sort(), ["blooms", "version"]);
  assert.equal(memory.version, 1);
  assert.equal(memory.blooms.length, PET_WORLD.maxBlooms);
  assert.deepEqual(memory.blooms.map((bloom) => bloom.id), [2, 3, 4]);
  assert.ok(memory.blooms.every((bloom) => bloom.source === "todo" && bloom.growth === 1));
  assert.doesNotMatch(JSON.stringify(memory), /focus|rain|visitor|petX|camera/i);
});

test("returning to the capability restores scenery into a calm fresh world", () => {
  const memory = serializePetWorldMemory(plantProgressBloom(createPetWorldState(), 318));
  const restored = restorePetWorldMemory(createPetWorldState(), memory);

  assert.deepEqual(restored.blooms, [{ id: 1, x: 318, growth: 1, source: "todo" }]);
  assert.equal(restored.action, "idle");
  assert.equal(restored.petX, PET_WORLD.width / 2);
  assert.equal(restored.cameraX, PET_WORLD.width / 2);
  assert.equal(restored.weather, "sunny");
  assert.equal(restored.visitor.active, false);
});

test("world-memory recovery rejects malformed, private, and out-of-bounds data", () => {
  const initial = createPetWorldState();
  const restored = restorePetWorldMemory(initial, {
    version: 1,
    taskTitle: "A private task must never survive",
    blooms: [
      { id: 2, x: -900, growth: 0.2, source: "todo", title: "private" },
      { id: 3, x: 900, growth: 0.8, source: "todo" },
      { id: "bad", x: 240, growth: 1, source: "todo" },
      { id: 4, x: 250, growth: 1, source: "unknown" },
    ],
  });

  assert.deepEqual(restored.blooms, [
    { id: 2, x: PET_WORLD.minX, growth: 1, source: "todo" },
    { id: 3, x: PET_WORLD.maxX, growth: 1, source: "todo" },
  ]);
  assert.deepEqual(restorePetWorldMemory(initial, null).blooms, []);
  assert.deepEqual(restorePetWorldMemory(initial, { version: 2, blooms: [] }).blooms, []);
});

test("world travel requests authored locomotion instead of an idle fallback", () => {
  assert.equal(clipForWorldAction("walk"), "walk");
  assert.equal(clipForWorldAction("run"), "run");
  assert.equal(clipForWorldAction("seek-shelter"), "walk");
  assert.equal(clipForWorldAction("seek-sun"), "walk");
  assert.equal(clipForWorldAction("seek-shade"), "walk");
  assert.equal(clipForWorldAction("bask"), "sun-bask");
  assert.equal(clipForWorldAction("shade"), "sleep");
  assert.equal(clipForWorldAction("jump"), "jump");
  assert.equal(clipForWorldAction("pounce"), "pounce");
  assert.equal(clipForWorldAction("rollover"), "rollover");
  assert.equal(clipForWorldAction("weather-notice"), "weather-notice");
  assert.equal(clipForWorldAction("wind-brace"), "wind-brace");
  assert.equal(clipForWorldAction("rain-flinch"), "rain-flinch");
  assert.equal(clipForWorldAction("bloom-notice"), "discover");
  assert.equal(clipForWorldAction("seek-bloom"), "walk");
  assert.equal(clipForWorldAction("admire-bloom"), "care");
});

test("a completed intention opens one world memory that Moss notices and admires", () => {
  const initial = createPetWorldState();
  let blooming = plantProgressBloom(initial);
  const bloom = blooming.blooms[0];

  assert.equal(blooming.action, "bloom-notice");
  assert.equal(blooming.targetX, bloom.x);
  assert.equal(bloom.growth, 0);
  assert.ok(bloom.x >= PET_WORLD.minX && bloom.x <= PET_WORLD.maxX);

  blooming = stepPetWorld(blooming, PET_WORLD.bloomOpenDuration / 2, false);
  assert.ok(blooming.blooms[0].growth > 0.45 && blooming.blooms[0].growth < 0.55);
  assert.equal(blooming.action, "bloom-notice");

  blooming = stepPetWorld(blooming, PET_WORLD.bloomNoticeDuration, false);
  assert.equal(blooming.action, "seek-bloom");

  for (let step = 0; step < 20 && blooming.action === "seek-bloom"; step += 1) {
    blooming = stepPetWorld(blooming, 250, false);
  }
  assert.equal(blooming.action, "admire-bloom");
  assert.ok(Math.abs(blooming.petX - bloom.x) >= PET_WORLD.bloomApproachDistance - 2);
  assert.ok(Math.abs(blooming.petX - bloom.x) <= PET_WORLD.bloomApproachDistance + 2);
  assert.equal(blooming.facing, bloom.x < blooming.petX ? -1 : 1);

  blooming = stepPetWorld(blooming, PET_WORLD.bloomAdmireDuration, false);
  assert.equal(blooming.action, "idle");
  assert.equal(blooming.blooms[0].growth, 1);
});

test("habitat memories stay bounded and survive direct play plus Focus priority", () => {
  let world = createPetWorldState();
  for (let index = 0; index < 4; index += 1) world = plantProgressBloom(world);

  assert.equal(world.blooms.length, 3);
  assert.deepEqual(world.blooms.map((bloom) => bloom.id), [2, 3, 4]);
  assert.equal(new Set(world.blooms.map((bloom) => bloom.x)).size, 3);

  const touched = applyWorldIntent(world, { kind: "jump", worldX: world.petX + 20 });
  assert.equal(touched.action, "jump");
  assert.deepEqual(touched.blooms, world.blooms);

  const focused = beginCompanionFocus(touched, 1200);
  assert.equal(focused.action, "seek-shelter");
  assert.deepEqual(focused.blooms, world.blooms);
});

test("Reduce Motion opens the memory in place without staged travel", () => {
  const planted = plantProgressBloom(createPetWorldState());
  const after = stepPetWorld(planted, 16, true);

  assert.equal(after.action, "admire-bloom");
  assert.equal(after.petX, planted.petX);
  assert.equal(after.targetX, null);
  assert.equal(after.blooms[0].growth, 1);
});

test("an ambient memory visit notices, travels, remembers, and releases", () => {
  const world = restorePetWorldMemory(createPetWorldState(), {
    version: 1,
    blooms: [{ id: 1, x: 330, source: "todo" }],
  });
  let visiting = beginMemoryVisit(world, 330);

  assert.equal(visiting.action, "memory-notice");
  assert.equal(clipForWorldAction(visiting.action), "discover");

  visiting = stepPetWorld(visiting, PET_WORLD.memoryNoticeDuration, false);
  assert.equal(visiting.action, "seek-memory");
  assert.equal(clipForWorldAction(visiting.action), "walk");

  for (let step = 0; step < 30 && visiting.action === "seek-memory"; step += 1) {
    visiting = stepPetWorld(visiting, 250, false);
  }
  assert.equal(visiting.action, "remember");
  assert.equal(clipForWorldAction(visiting.action), "care");

  visiting = stepPetWorld(visiting, PET_WORLD.memoryHoldDuration, false);
  assert.equal(visiting.action, "idle");
});

test("tree rest is a finite voluntary scene, not a need", () => {
  let resting = beginTreeRest(createPetWorldState());
  assert.equal(resting.action, "seek-rest");
  assert.equal(resting.targetX, PET_WORLD.treeShelterX);

  for (let step = 0; step < 30 && resting.action === "seek-rest"; step += 1) {
    resting = stepPetWorld(resting, 250, false);
  }
  assert.equal(resting.action, "rest");
  assert.equal(clipForWorldAction(resting.action), "sleep");

  resting = stepPetWorld(resting, PET_WORLD.treeRestDuration, false);
  assert.equal(resting.action, "idle");
});

test("Reduce Motion preserves memory and rest meaning without ambient travel", () => {
  const remembered = stepPetWorld(
    beginMemoryVisit(
      restorePetWorldMemory(createPetWorldState(), {
        version: 1,
        blooms: [{ id: 1, x: 330, source: "todo" }],
      }),
      330,
    ),
    16,
    true,
  );
  const rested = stepPetWorld(beginTreeRest(createPetWorldState()), 16, true);

  assert.equal(remembered.action, "remember");
  assert.equal(remembered.petX, PET_WORLD.width / 2);
  assert.equal(rested.action, "rest");
  assert.equal(rested.petX, PET_WORLD.treeShelterX);
});

test("weather arrives as a noticed event before it changes the Pet's behavior", () => {
  const rain = setWorldWeather(createPetWorldState(), "rain");
  const gathering = stepPetWorld(rain, PET_WORLD.weatherArrivalDuration / 2, false);
  const arrived = stepPetWorld(gathering, PET_WORLD.weatherArrivalDuration / 2, false);

  assert.equal(rain.weatherPhase, "arriving");
  assert.equal(rain.weatherIntensity, 0);
  assert.equal(rain.action, "weather-notice");
  assert.equal(gathering.action, "weather-notice");
  assert.ok(gathering.weatherIntensity > 0.45 && gathering.weatherIntensity < 0.55);
  assert.equal(arrived.weatherPhase, "settled");
  assert.equal(arrived.weatherIntensity, 1);
  assert.equal(arrived.action, "rain-flinch");
  assert.equal(arrived.targetX, PET_WORLD.treeShelterX);

  const responding = stepPetWorld(arrived, PET_WORLD.rainFlinchDuration, false);
  assert.equal(responding.action, "seek-shelter");
  assert.equal(responding.targetX, PET_WORLD.treeShelterX);
});

test("direct touch can interrupt the notice beat while weather continues arriving", () => {
  const arriving = stepPetWorld(
    setWorldWeather(createPetWorldState(), "breeze"),
    PET_WORLD.weatherArrivalDuration / 4,
    false,
  );
  const touched = applyWorldIntent(arriving, { kind: "jump", worldX: arriving.petX + 30 });

  assert.equal(touched.weatherPhase, "arriving");
  assert.ok(touched.weatherIntensity > 0 && touched.weatherIntensity < 1);
  assert.equal(touched.action, "jump");
  assert.equal(touched.facing, 1);
});

test("sun warms Leafling before it chooses the old tree's shade", () => {
  let sunny = setWorldWeather(createPetWorldState(), "sunny");
  assert.equal(sunny.action, "weather-notice");

  sunny = stepPetWorld(sunny, PET_WORLD.weatherArrivalDuration, false);
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
  const basking = stepPetWorld(seekingSun, 16, true);
  const shaded = stepPetWorld(basking, PET_WORLD.sunBaskDuration, true);

  assert.equal(basking.action, "bask");
  assert.equal(basking.petX, PET_WORLD.sunPatchX);
  assert.equal(shaded.action, "shade");
  assert.equal(shaded.petX, PET_WORLD.treeShelterX);
});

test("rain changes the world into a shelter-seeking behavior", () => {
  const arriving = setWorldWeather(createPetWorldState(), "rain");
  const flinching = stepPetWorld(arriving, PET_WORLD.weatherArrivalDuration, false);
  const raining = stepPetWorld(flinching, PET_WORLD.rainFlinchDuration, false);

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
  const arriving = stepPetWorld(breezy, PET_WORLD.weatherArrivalDuration / 2, false);
  const after = stepPetWorld(arriving, PET_WORLD.weatherArrivalDuration / 2 + 420, false);

  assert.equal(after.weather, "breeze");
  assert.equal(after.weatherPhase, "settled");
  assert.equal(after.weatherIntensity, 1);
  assert.equal(after.action, "wind-brace");
  assert.ok(Math.abs(after.weatherSway) > 0.2);
  assert.ok(Math.abs(after.weatherSway) <= PET_WORLD.maxWeatherSway);
  assert.equal(after.poseY, 0);

  const recovered = stepPetWorld(after, PET_WORLD.windBraceDuration, false);
  assert.equal(recovered.action, "idle");
});

test("reduced motion preserves weather meaning by settling directly into shelter", () => {
  const raining = setWorldWeather(createPetWorldState(), "rain");
  const after = stepPetWorld(raining, 16, true);

  assert.equal(after.action, "shelter");
  assert.equal(after.petX, PET_WORLD.treeShelterX);
  assert.equal(after.weatherPhase, "settled");
  assert.equal(after.weatherIntensity, 1);
  assert.equal(after.weatherSway, 0);
});

test("autonomous weather follows one calm deterministic cycle", () => {
  assert.equal(nextWeatherKind("sunny"), "breeze");
  assert.equal(nextWeatherKind("breeze"), "rain");
  assert.equal(nextWeatherKind("rain"), "sunny");
});

test("directed travel frames destination-side world without leaving its bounds", () => {
  const idle = createPetWorldState();
  const rightward = { ...idle, petX: 300, action: "seek-sun" as const, facing: 1 as const };
  const leftward = { ...idle, petX: 180, action: "seek-shelter" as const, facing: -1 as const };
  const edge = { ...idle, petX: PET_WORLD.maxX, action: "run" as const, facing: 1 as const };

  assert.equal(resolveCameraTargetX(idle), idle.petX);
  assert.ok(resolveCameraTargetX(rightward) > rightward.petX);
  assert.ok(resolveCameraTargetX(leftward) < leftward.petX);
  assert.ok(resolveCameraTargetX(edge) <= PET_WORLD.width - PET_WORLD.viewportWidth / 2);
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
  assert.equal(setWorldZoom(world, 1.8).cameraShot, "user");
  assert.equal(setWorldZoom(world, 1.8).cameraControlRemainingMs, PET_WORLD.userCameraHoldDuration);
});

test("cinematic shots give quiet, reaction, intimacy, and action different compositions", () => {
  const idle = createPetWorldState();
  const greeting = { ...idle, action: "greet" as const };
  const remembering = { ...idle, action: "remember" as const };
  const pouncing = { ...idle, action: "aerial-pounce" as const };
  const focusing = { ...beginCompanionFocus(idle, 15000), action: "focus" as const };

  assert.deepEqual(resolveCinematicShot(idle, false), { id: "establishing", zoom: 1 });
  assert.deepEqual(resolveCinematicShot(greeting, false), { id: "reaction", zoom: 1.28 });
  assert.deepEqual(resolveCinematicShot(remembering, false), { id: "intimate", zoom: 1.45 });
  assert.deepEqual(resolveCinematicShot(pouncing, false), { id: "action-wide", zoom: 1 });
  assert.deepEqual(resolveCinematicShot(focusing, false), { id: "focus", zoom: 1.35 });
  assert.deepEqual(resolveCinematicShot(remembering, true), { id: "reduced-motion", zoom: 1 });
});

test("pinch ownership holds its composition, then yields gently to the scene director", () => {
  const close = setWorldZoom({ ...createPetWorldState(), action: "remember" }, 2);
  const whileHeld = stepPetWorld(close, PET_WORLD.userCameraHoldDuration - 1, false);
  const released = stepPetWorld(whileHeld, 2, false);
  const directed = stepPetWorld(released, 400, false);

  assert.equal(whileHeld.zoom, 2);
  assert.equal(whileHeld.cameraShot, "user");
  assert.equal(released.cameraControlRemainingMs, 0);
  assert.notEqual(directed.cameraShot, "user");
  assert.ok(directed.zoom < 2);
  assert.ok(directed.zoom > resolveCinematicShot(directed, false).zoom);
});

test("visitor action framing keeps both Moss and the visitor in the shot", () => {
  const tracking = {
    ...spawnVisitor(createPetWorldState(), "guardian", { x: 340, direction: -1 }),
    action: "track" as const,
    petX: 240,
  };

  assert.equal(resolveCameraTargetX(tracking), 290);
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
