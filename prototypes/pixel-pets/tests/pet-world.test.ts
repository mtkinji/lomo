import assert from "node:assert/strict";
import test from "node:test";

import {
  PET_WORLD,
  RAIN_GUEST,
  TREE_PLAY,
  applyWorldIntent,
  beginPetReunion,
  beginPetEvening,
  beginPetMorning,
  beginAfterRainSplash,
  beginWindLeafInvitation,
  createPetWorldState,
  dragWorldWindLeaf,
  beginCompanionFocus,
  chooseCompanionFocusPlace,
  beginSharedPlayEcho,
  beginMemoryVisit,
  beginTreeRest,
  beginTreePlay,
  beginTreeReturn,
  beginRainGuestShelter,
  cancelWorldHandGuide,
  clipForWorldAction,
  setWorldWeather,
  resolveTapIntent,
  resolveTreePlayHit,
  resolveTreeReturnHit,
  resolveRainGuestHit,
  resolveFocusAtmosphere,
  resolveCompanionFocusPlaceHit,
  grabWorldWindLeaf,
  guideWorldWithHand,
  holdCareEcho,
  nextWeatherKind,
  plantProgressBloom,
  plantLifeEcho,
  resolveCareEchoHit,
  resolveAfterRainHit,
  resolveAfterRainPlayProfile,
  resolveAfterRainSplashPresentation,
  resolveGuardianWakePresentation,
  restorePetWorldMemory,
  resolveCameraTargetX,
  resolveCinematicShot,
  serializePetWorldMemory,
  setWorldZoom,
  spawnVisitor,
  stepPetWorld,
  tossWorldWindLeaf,
  releaseWorldHandGuide,
} from "../lib/pet-world.ts";
import { leaflingManifestForStage } from "../lib/leafling.ts";
import { resolvePetFrame } from "../lib/pet-runtime.ts";

test("returning to the capability begins with recognition before movement", () => {
  const baby = beginPetReunion(createPetWorldState(), "baby");
  const young = beginPetReunion(createPetWorldState(), "young");
  const guardian = beginPetReunion(createPetWorldState(), "guardian");

  assert.equal(baby.action, "reunion-notice");
  assert.equal(young.action, "reunion-notice");
  assert.equal(guardian.action, "reunion-notice");
  assert.equal(baby.targetX, PET_WORLD.reunionTargetX);
  assert.equal(young.targetX, PET_WORLD.reunionTargetX);
  assert.equal(guardian.targetX, PET_WORLD.reunionTargetX);
  assert.ok(baby.petX > young.petX, "Baby begins nearby instead of performing a long entrance");
  assert.ok(young.petX > guardian.petX, "Guardian has the largest entrance lane");
  assert.equal(baby.cameraX, baby.petX);
  assert.equal(clipForWorldAction(baby.action), "discover");
  assert.equal(resolveCinematicShot(baby, false).id, "reaction");
});

test("reunion approach grows from a walk into a faster confident arrival", () => {
  const noticedBaby = stepPetWorld(
    beginPetReunion(createPetWorldState(), "baby"),
    PET_WORLD.reunionNoticeDuration,
    false,
    "baby",
  );
  const noticedYoung = stepPetWorld(
    beginPetReunion(createPetWorldState(), "young"),
    PET_WORLD.reunionNoticeDuration,
    false,
    "young",
  );
  const noticedGuardian = stepPetWorld(
    beginPetReunion(createPetWorldState(), "guardian"),
    PET_WORLD.reunionNoticeDuration,
    false,
    "guardian",
  );

  assert.equal(noticedBaby.action, "reunion-approach");
  assert.equal(noticedYoung.action, "reunion-approach");
  assert.equal(noticedGuardian.action, "reunion-approach");
  assert.equal(clipForWorldAction(noticedBaby.action, false, "baby"), "walk");
  assert.equal(clipForWorldAction(noticedYoung.action, false, "young"), "run");
  assert.equal(clipForWorldAction(noticedGuardian.action, false, "guardian"), "run");

  const babyStep = stepPetWorld(noticedBaby, 400, false, "baby");
  const youngStep = stepPetWorld(noticedYoung, 400, false, "young");
  const guardianStep = stepPetWorld(noticedGuardian, 400, false, "guardian");
  assert.ok(babyStep.petX - noticedBaby.petX < youngStep.petX - noticedYoung.petX);
  assert.ok(youngStep.petX - noticedYoung.petX < guardianStep.petX - noticedGuardian.petX);
});

test("a reunion lands beside the user, holds one hello, and releases the world", () => {
  let world = beginPetReunion(createPetWorldState(), "guardian");
  world = stepPetWorld(world, PET_WORLD.reunionNoticeDuration, false, "guardian");
  for (let step = 0; step < 80 && world.action === "reunion-approach"; step += 1) {
    world = stepPetWorld(world, 64, false, "guardian");
  }

  assert.equal(world.action, "reunion-greet");
  assert.equal(world.petX, PET_WORLD.reunionTargetX);
  assert.equal(world.targetX, null);
  assert.equal(world.poseY, 0);
  assert.equal(clipForWorldAction(world.action), "affection");
  assert.ok(
    leaflingManifestForStage("guardian").clips.affection.frames.every((frame) => frame.contact !== "airborne"),
    "the final close-up must stay planted on the terrain",
  );
  assert.equal(resolveCinematicShot(world, false).id, "intimate");

  world = stepPetWorld(world, PET_WORLD.reunionGreetingDuration, false, "guardian");
  assert.equal(world.action, "idle");
});

test("direct play interrupts the reunion and Reduce Motion keeps only recognition", () => {
  const reunion = beginPetReunion(createPetWorldState(), "young");
  const touched = applyWorldIntent(reunion, { kind: "move", worldX: 360 });
  assert.equal(touched.action, "walk");
  assert.equal(stepPetWorld(touched, 64, false, "young").action, "run");

  const reduced = stepPetWorld(
    beginPetReunion(createPetWorldState(), "guardian"),
    1,
    true,
    "guardian",
  );
  assert.equal(reduced.action, "reunion-greet");
  assert.equal(reduced.petX, PET_WORLD.reunionTargetX);
  assert.equal(reduced.poseY, 0);
});

test("affection is a finite grounded relationship with an intimate camera", () => {
  const initial = { ...createPetWorldState(), petX: 220, facing: 1 as const };
  const affectionate = applyWorldIntent(initial, { kind: "affection", worldX: 208 });

  assert.equal(affectionate.action, "affection");
  assert.equal(affectionate.facing, -1);
  assert.equal(affectionate.targetX, null);
  assert.equal(affectionate.poseY, 0);
  assert.equal(resolveCinematicShot(affectionate, false).id, "intimate");
  assert.equal(clipForWorldAction("affection"), "affection");

  const holding = stepPetWorld(affectionate, PET_WORLD.affectionDuration - 1, false, "young");
  assert.equal(holding.action, "affection");
  assert.equal(holding.petX, initial.petX);
  assert.equal(holding.poseY, 0);
  const settled = stepPetWorld(holding, 2, false, "young");
  assert.equal(settled.action, "idle");
  assert.equal(settled.poseY, 0);
});

test("Focus and rain shelter remain stronger than affection", () => {
  const focused = beginCompanionFocus(createPetWorldState(), 15000);
  const sheltered = {
    ...createPetWorldState(),
    weather: "rain" as const,
    weatherPhase: "settled" as const,
    action: "shelter" as const,
  };

  assert.equal(applyWorldIntent(focused, { kind: "affection", worldX: focused.petX }).action, focused.action);
  assert.equal(applyWorldIntent(sheltered, { kind: "affection", worldX: sheltered.petX }).action, "shelter");
});

test("only a real rain-to-sun clearing leaves one bounded puddle", () => {
  const ordinarySun = setWorldWeather(createPetWorldState(), "sunny");
  assert.equal(ordinarySun.afterRain.phase, "quiet");
  const cancelledFirstDrop = setWorldWeather(setWorldWeather(createPetWorldState(), "rain"), "sunny");
  assert.equal(cancelledFirstDrop.afterRain.phase, "quiet");

  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const clearing = setWorldWeather(rain, "sunny");

  assert.equal(clearing.afterRain.phase, "shimmer");
  assert.ok(clearing.afterRain.x >= PET_WORLD.minX);
  assert.ok(clearing.afterRain.x <= PET_WORLD.maxX);
  assert.equal(clearing.afterRain.elapsedMs, 0);
});

test("clearing light crossfades the settled rain instead of deleting it", () => {
  const rain = {
    ...createPetWorldState(),
    weather: "rain" as const,
    weatherPhase: "settled" as const,
    weatherIntensity: 1,
  };
  const clearing = setWorldWeather(rain, "sunny");
  const halfway = stepPetWorld(clearing, PET_WORLD.weatherArrivalDuration / 2, false, "young");
  const settled = stepPetWorld(halfway, PET_WORLD.weatherArrivalDuration / 2, false, "young");
  const reduced = stepPetWorld(clearing, 1, true, "young");

  assert.equal(clearing.clearingRainIntensity, 1);
  assert.ok(halfway.clearingRainIntensity > 0.49 && halfway.clearingRainIntensity < 0.51);
  assert.equal(settled.clearingRainIntensity, 0);
  assert.equal(reduced.clearingRainIntensity, 0);
});

test("the clearing puddle owns a forgiving but terrain-bounded touch target", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const clearing = setWorldWeather(rain, "sunny");
  const x = clearing.afterRain.x;

  assert.equal(resolveAfterRainHit(clearing, { x: x + 15, y: PET_WORLD.puddleY - 5 }), true);
  assert.equal(resolveAfterRainHit(clearing, { x: x + 23, y: PET_WORLD.puddleY - 5 }), false);
  assert.equal(resolveAfterRainHit(clearing, { x, y: PET_WORLD.puddleY - 17 }), false);
  assert.equal(resolveAfterRainHit({ ...clearing, afterRain: { ...clearing.afterRain, phase: "spent" } }, { x, y: PET_WORLD.puddleY }), false);
});

test("the after-rain invitation frames Moss and the puddle together", () => {
  const rain = { ...createPetWorldState(), petX: 112, weather: "rain" as const, weatherPhase: "settled" as const };
  const clearing = setWorldWeather(rain, "sunny");
  const invited = { ...clearing, action: "puddle-invite" as const, zoom: 1.28 };
  const target = resolveCameraTargetX(invited);

  assert.ok(target > invited.petX);
  assert.ok(target < invited.afterRain.x);
  assert.ok(Math.abs((invited.petX - target) * invited.zoom) < PET_WORLD.viewportWidth / 2);
  assert.ok(Math.abs((invited.afterRain.x - target) * invited.zoom) < PET_WORLD.viewportWidth / 2);
});

test("tapping after rain commits one correctly faced grounded splash", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  let world = setWorldWeather({ ...rain, petX: 112 }, "sunny");
  world = beginAfterRainSplash(world);

  assert.equal(world.action, "seek-puddle");
  assert.equal(world.facing, 1);
  assert.ok(world.targetX !== null && world.targetX < world.afterRain.x);

  for (let index = 0; index < 40 && world.action === "seek-puddle"; index += 1) {
    world = stepPetWorld(world, 250, false, "young");
  }
  assert.equal(world.action, "puddle-splash");
  assert.equal(world.poseY, 0);
  world = stepPetWorld(world, PET_WORLD.puddleSplashDuration + 1, false, "young");
  assert.equal(world.afterRain.phase, "spent");
  assert.equal(world.action, "greet");
  assert.equal(world.poseY, 0);
  assert.notEqual(stepPetWorld(world, 9000, false, "young").action, "puddle-splash");
});

test("after-rain spray begins at paw contact, peaks there, and ends with the authored pounce", () => {
  const base = { ...createPetWorldState(), action: "puddle-splash" as const };
  const beforeContact = resolveAfterRainSplashPresentation(
    { ...base, actionElapsed: PET_WORLD.puddleSplashContactAt - 1 },
    false,
  );
  const contact = resolveAfterRainSplashPresentation(
    { ...base, actionElapsed: PET_WORLD.puddleSplashContactAt },
    false,
  );
  const afterClip = resolveAfterRainSplashPresentation(
    { ...base, actionElapsed: PET_WORLD.puddleSplashVisualEnd },
    false,
  );

  assert.equal(beforeContact.visible, false);
  assert.deepEqual(contact, { visible: true, animated: true, progress: 0, lift: 1, spread: 11 });
  assert.equal(afterClip.visible, false);
  assert.equal(
    PET_WORLD.puddleSplashDuration,
    PET_WORLD.puddleSplashVisualEnd + PET_WORLD.puddleSplashRecoveryHold,
  );
});

test("the same puddle reveals a larger physical vocabulary as Moss matures", () => {
  const baby = resolveAfterRainPlayProfile("baby");
  const young = resolveAfterRainPlayProfile("young");
  const guardian = resolveAfterRainPlayProfile("guardian");

  assert.equal(baby.clip, "care");
  assert.equal(young.clip, "pounce");
  assert.equal(guardian.clip, "aerial");
  assert.ok(baby.contactAt < young.contactAt);
  assert.ok(young.contactAt < guardian.contactAt);
  assert.ok(baby.baseSpread < young.baseSpread);
  assert.ok(young.baseSpread < guardian.baseSpread);
  assert.equal(baby.releasesWake, false);
  assert.equal(young.releasesWake, false);
  assert.equal(guardian.releasesWake, true);
  assert.equal(clipForWorldAction("puddle-splash", false, "baby"), "care");
  assert.equal(clipForWorldAction("puddle-splash", false, "young"), "pounce");
  assert.equal(clipForWorldAction("puddle-splash", false, "guardian"), "aerial");
});

test("each form releases water on its own authored contact frame", () => {
  const base = { ...createPetWorldState(), action: "puddle-splash" as const };

  for (const stage of ["baby", "young", "guardian"] as const) {
    const profile = resolveAfterRainPlayProfile(stage);
    const before = resolveAfterRainSplashPresentation(
      { ...base, actionElapsed: profile.contactAt - 1 },
      false,
      stage,
    );
    const contact = resolveAfterRainSplashPresentation(
      { ...base, actionElapsed: profile.contactAt },
      false,
      stage,
    );
    const finished = resolveAfterRainSplashPresentation(
      { ...base, actionElapsed: profile.visualEnd },
      false,
      stage,
    );

    assert.equal(before.visible, false, `${stage} water cannot anticipate physical contact`);
    assert.equal(contact.visible, true, `${stage} should release water on contact`);
    assert.equal(contact.spread, profile.baseSpread);
    assert.equal(finished.visible, false, `${stage} spray should end with its authored action`);
  }
});

test("only Guardian's after-rain landing releases one meadow wake", () => {
  const makeSplash = () => ({
    ...createPetWorldState(),
    action: "puddle-splash" as const,
    actionElapsed: 0,
    afterRain: { phase: "engaged" as const, x: 284, elapsedMs: 0 },
  });

  const youngProfile = resolveAfterRainPlayProfile("young");
  const young = stepPetWorld(makeSplash(), youngProfile.contactAt + 1, false, "young");
  assert.equal(young.guardianWake.phase, "quiet");

  const guardianProfile = resolveAfterRainPlayProfile("guardian");
  const guardian = stepPetWorld(makeSplash(), guardianProfile.contactAt + 1, false, "guardian");
  assert.equal(guardian.guardianWake.phase, "released");
  assert.equal(guardian.guardianWake.x, 284);
  const later = stepPetWorld(guardian, 16, false, "guardian");
  assert.equal(later.guardianWake.elapsedMs, 16, "the landing wake should continue rather than restart");
});

test("Reduce Motion presents one static contact mark instead of animated spray", () => {
  const base = { ...createPetWorldState(), action: "puddle-splash" as const };
  const first = resolveAfterRainSplashPresentation({ ...base, actionElapsed: 0 }, true);
  const later = resolveAfterRainSplashPresentation({ ...base, actionElapsed: 250 }, true);

  assert.deepEqual(first, later);
  assert.deepEqual(first, { visible: true, animated: false, progress: 0, lift: 0, spread: 11 });
});

test("Reduce Motion preserves the after-rain touch without animated travel or spray", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const clearing = setWorldWeather(rain, "sunny");
  const invited = beginAfterRainSplash(clearing);
  const splashed = stepPetWorld(invited, 1, true, "guardian");

  assert.equal(splashed.petX, clearing.afterRain.x);
  assert.equal(splashed.action, "puddle-splash");
  assert.equal(splashed.poseY, 0);
});

test("Reduce Motion lets an ignored puddle settle without trapping the scene", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const clearing = setWorldWeather(rain, "sunny");
  const invited = { ...clearing, action: "puddle-invite" as const };
  const settled = stepPetWorld(invited, PET_WORLD.puddleInvitationDuration + 1, true, "young");

  assert.equal(settled.afterRain.phase, "quiet");
  assert.equal(settled.action, "idle");
});

test("direct play may interrupt the invitation without making the puddle permanent", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const clearing = setWorldWeather(rain, "sunny");
  const redirected = {
    ...clearing,
    action: "walk" as const,
    targetX: clearing.petX + 30,
    afterRain: { ...clearing.afterRain, elapsedMs: PET_WORLD.puddleInvitationDuration - 10 },
  };
  const settled = stepPetWorld(redirected, 20, false, "young");

  assert.equal(settled.afterRain.phase, "quiet");
  assert.equal(settled.action, "walk");
});

test("a committed splash cannot be redirected by ordinary touch or weather", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const committed = beginAfterRainSplash(setWorldWeather(rain, "sunny"));

  assert.equal(applyWorldIntent(committed, { kind: "move", worldX: 420 }).action, "seek-puddle");
  assert.equal(setWorldWeather(committed, "breeze").action, "seek-puddle");
  assert.equal(setWorldWeather(committed, "breeze").afterRain.phase, "engaged");
});

test("meaningful Focus may preempt after-rain play without stranding residue", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const committed = beginAfterRainSplash(setWorldWeather(rain, "sunny"));
  const focused = beginCompanionFocus(committed, 1000);

  assert.equal(focused.action, "focus-invite");
  assert.equal(focused.afterRain.phase, "quiet");
});

test("evening is a directed journey from golden light to the old tree", () => {
  const busy = spawnVisitor(plantLifeEcho(createPetWorldState(), "todo", 318), "young");
  const evening = beginPetEvening({ ...busy, petX: 336 });

  assert.equal(evening.daylight.phase, "golden");
  assert.equal(evening.daylight.eveningActive, true);
  assert.equal(evening.action, "seek-rest");
  assert.equal(evening.targetX, PET_WORLD.treeShelterX);
  assert.equal(evening.facing, -1);
  assert.equal(evening.visitor.active, false);
  assert.equal(evening.playLeaf.phase, "perched");
});

test("daylight advances deterministically through dusk into night", () => {
  let world = beginPetEvening(createPetWorldState());

  world = stepPetWorld(world, PET_WORLD.goldenDuration, false, "young");
  assert.equal(world.daylight.phase, "dusk");
  world = stepPetWorld(world, PET_WORLD.duskDuration, false, "young");
  assert.equal(world.daylight.phase, "night");
});

test("an evening curl remains asleep and grounded after the finite sleep clip", () => {
  let world = beginPetEvening({ ...createPetWorldState(), petX: PET_WORLD.treeShelterX });
  world = stepPetWorld(world, 1, true, "young");
  assert.equal(world.action, "rest");
  world = stepPetWorld(world, PET_WORLD.treeRestDuration + 1000, true, "young");

  assert.equal(world.action, "night-rest");
  assert.equal(world.petX, PET_WORLD.treeShelterX);
  assert.equal(world.poseY, 0);
  assert.equal(clipForWorldAction(world.action), "sleep");
  assert.equal(stepPetWorld(world, 9000, false, "young").action, "night-rest");
});

test("morning wakes Moss through dawn and restores the clear day", () => {
  let world = beginPetMorning({
    ...beginPetEvening(createPetWorldState()),
    action: "night-rest",
    daylight: { phase: "night", elapsedMs: 0, eveningActive: true },
  });

  assert.equal(world.daylight.phase, "dawn");
  assert.equal(world.daylight.eveningActive, false);
  assert.equal(world.action, "greet");
  world = stepPetWorld(world, PET_WORLD.dawnDuration, false, "young");
  assert.equal(world.daylight.phase, "day");
  assert.equal(world.weather, "sunny");
});

test("care touch resolves only the newest matching life echo", () => {
  let world = createPetWorldState();
  world = plantLifeEcho(world, "todo", 126);
  world = plantLifeEcho(world, "focus", 202);
  world = plantLifeEcho(world, "todo", 278);

  assert.deepEqual(resolveCareEchoHit(world, "todo", { x: 278, y: 194 })?.id, 3);
  assert.equal(resolveCareEchoHit(world, "todo", { x: 202, y: 194 }), null);
  assert.equal(resolveCareEchoHit(world, "focus", { x: 278, y: 194 }), null);
});

test("care touch keeps a forgiving but bounded world-space target", () => {
  const world = plantLifeEcho(createPetWorldState(), "play", 244);

  assert.deepEqual(resolveCareEchoHit(world, "play", { x: 258, y: 178 })?.id, 1);
  assert.equal(resolveCareEchoHit(world, "play", { x: 263, y: 178 }), null);
  assert.equal(resolveCareEchoHit(world, "play", { x: 244, y: 164 }), null);
  assert.equal(resolveCareEchoHit(world, null, { x: 244, y: 194 }), null);
});

test("a ready care echo holds Moss and the camera story beside that exact change", () => {
  let world = plantLifeEcho(createPetWorldState(), "todo", 318);
  world = {
    ...world,
    action: "seek-rest",
    petX: PET_WORLD.treeShelterX,
    cameraX: PET_WORLD.treeShelterX,
    visitor: { ...world.visitor, active: true },
  };

  const held = holdCareEcho(world, "todo");

  assert.equal(held.action, "remember");
  assert.equal(held.targetX, null);
  assert.equal(held.visitor.active, false);
  assert.ok(Math.abs(held.petX - 318) <= PET_WORLD.bloomApproachDistance + 1);
  assert.equal(held.facing, 318 < held.petX ? -1 : 1);
  assert.ok(Math.abs(resolveCameraTargetX(held) - 318) <= PET_WORLD.bloomApproachDistance + 1);
});

test("durable world memory contains only bounded privacy-safe scenery", () => {
  let world = createPetWorldState();
  world = plantLifeEcho(world, "todo");
  world = plantLifeEcho(world, "focus");
  world = plantLifeEcho(world, "play");
  world = plantLifeEcho(world, "todo");
  world = plantLifeEcho(world, "focus");
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
  assert.deepEqual(memory.blooms.map((bloom) => bloom.id), [2, 3, 4, 5]);
  assert.deepEqual(memory.blooms.map((bloom) => bloom.source), ["focus", "play", "todo", "focus"]);
  assert.ok(memory.blooms.every((bloom) => bloom.growth === 1));
  assert.ok(memory.blooms.every((bloom) => Object.keys(bloom).sort().join(",") === "growth,id,source,x"));
  assert.doesNotMatch(JSON.stringify(memory), /taskTitle|person|duration|date|goal|arc|visitor|petX|camera/i);
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
      { id: 3, x: 900, growth: 0.8, source: "focus" },
      { id: 4, x: 240, growth: 1, source: "play", person: "private" },
      { id: "bad", x: 240, growth: 1, source: "todo" },
      { id: 5, x: 250, growth: 1, source: "unknown" },
    ],
  });

  assert.deepEqual(restored.blooms, [
    { id: 2, x: PET_WORLD.minX, growth: 1, source: "todo" },
    { id: 3, x: PET_WORLD.maxX, growth: 1, source: "focus" },
    { id: 4, x: 240, growth: 1, source: "play" },
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

test("a life echo owns the scene even as arriving weather settles", () => {
  let world = setWorldWeather(createPetWorldState(), "sunny");
  world = stepPetWorld(world, PET_WORLD.weatherArrivalDuration / 2, false);
  world = plantLifeEcho(world, "todo", world.petX + 48);

  world = stepPetWorld(world, PET_WORLD.weatherArrivalDuration / 2, false);

  assert.equal(world.weatherPhase, "settled");
  assert.equal(world.action, "bloom-notice");
  assert.equal(world.weatherResponsePending, false);

  for (let step = 0; step < 40 && world.action !== "idle"; step += 1) {
    world = stepPetWorld(world, 200, false);
  }
  assert.equal(world.action, "idle");
  assert.equal(world.weatherResponsePending, false);

  world = stepPetWorld(world, 16, false);
  assert.equal(world.action, "idle");
  assert.equal(world.weatherResponsePending, false);
});

test("doing, focusing, and playing create distinct traces in one memory system", () => {
  let world = createPetWorldState();
  world = plantLifeEcho(world, "todo", 286);
  world = plantLifeEcho(world, "focus", 118);
  world = plantLifeEcho(world, "play", 350);

  assert.deepEqual(world.blooms.map(({ source, x }) => ({ source, x })), [
    { source: "todo", x: 286 },
    { source: "focus", x: 118 },
    { source: "play", x: 350 },
  ]);
  assert.ok(world.blooms.every((memory) => memory.growth === 0));
  assert.equal(world.action, "bloom-notice");
  assert.equal(world.targetX, 350);
});

test("shared play keeps its breeze and visitor while planting a paired memory", () => {
  const playing = beginSharedPlayEcho(createPetWorldState(), "young");

  assert.equal(playing.weather, "breeze");
  assert.equal(playing.visitor.active, true);
  assert.equal(playing.visitor.kind, "firefly");
  assert.equal(playing.action, "track");
  assert.equal(playing.weatherResponsePending, false);
  assert.deepEqual(playing.blooms.map((memory) => memory.source), ["play"]);
});

test("habitat memories stay bounded and survive direct play plus Focus priority", () => {
  let world = createPetWorldState();
  const sources = ["todo", "focus", "play", "todo", "focus"] as const;
  for (const source of sources) world = plantLifeEcho(world, source);

  assert.equal(world.blooms.length, 4);
  assert.deepEqual(world.blooms.map((bloom) => bloom.id), [2, 3, 4, 5]);
  assert.equal(new Set(world.blooms.map((bloom) => bloom.x)).size, 4);

  const touched = applyWorldIntent(world, { kind: "jump", worldX: world.petX + 20 });
  assert.equal(touched.action, "jump");
  assert.deepEqual(touched.blooms, world.blooms);

  const focused = beginCompanionFocus(touched, 1200);
  assert.equal(focused.action, "focus-invite");
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

test("rain asks only Guardian to notice smaller life before seeking shelter", () => {
  const arrive = (stage: "baby" | "young" | "guardian") => stepPetWorld(
    setWorldWeather(createPetWorldState(), "rain"),
    PET_WORLD.weatherArrivalDuration,
    false,
    stage,
  );
  const baby = arrive("baby");
  const young = arrive("young");
  const guardian = arrive("guardian");

  assert.equal(baby.action, "rain-flinch");
  assert.equal(young.action, "rain-flinch");
  assert.equal(baby.rainGuest.phase, "quiet");
  assert.equal(young.rainGuest.phase, "quiet");
  assert.equal(guardian.action, "rain-guest-notice");
  assert.equal(guardian.rainGuest.phase, "waiting");
  assert.ok(guardian.rainGuest.x > guardian.petX, "the wet firefly should enter away from the old tree");
  assert.ok(guardian.rainGuest.y < PET_WORLD.visitorGroundY, "the guest should struggle low without floating at sky height");
  assert.equal(resolveCinematicShot(guardian, false).id, "reaction");
});

test("the wet firefly is the bounded invitation and Guardian commits from its actual side", () => {
  const noticed = stepPetWorld(
    setWorldWeather(createPetWorldState(), "rain"),
    PET_WORLD.weatherArrivalDuration,
    false,
    "guardian",
  );
  const waiting = stepPetWorld(noticed, RAIN_GUEST.noticeDuration, false, "guardian");

  assert.equal(waiting.action, "rain-guest-wait");
  assert.equal(resolveRainGuestHit(waiting, { x: waiting.rainGuest.x, y: waiting.rainGuest.y }), true);
  assert.equal(resolveRainGuestHit(waiting, { x: waiting.rainGuest.x + RAIN_GUEST.hitRadiusX + 1, y: waiting.rainGuest.y }), false);

  const invited = beginRainGuestShelter(waiting);
  assert.equal(invited.action, "seek-rain-guest");
  assert.equal(invited.facing, 1);
  assert.equal(invited.targetX, waiting.rainGuest.x - RAIN_GUEST.approachDistance);
  assert.equal(invited.rainGuest.x, waiting.rainGuest.x, "the visitor must not teleport onto Guardian");
});

test("Guardian makes contact, carries the wet firefly, and shares the existing shelter", () => {
  let world = stepPetWorld(
    setWorldWeather(createPetWorldState(), "rain"),
    PET_WORLD.weatherArrivalDuration + RAIN_GUEST.noticeDuration,
    false,
    "guardian",
  );
  world = beginRainGuestShelter(world);
  for (let step = 0; step < 80 && world.action === "seek-rain-guest"; step += 1) {
    world = stepPetWorld(world, 64, false, "guardian");
  }

  assert.equal(world.action, "rain-guest-carry");
  assert.equal(world.rainGuest.phase, "carried");
  assert.ok(Math.abs(world.rainGuest.x - world.petX) <= 12);
  assert.equal(world.poseY, 0);
  assert.equal(clipForWorldAction(world.action, false, "guardian"), "care");

  world = stepPetWorld(world, RAIN_GUEST.contactDuration, false, "guardian");
  assert.equal(world.action, "seek-shelter");
  assert.equal(world.targetX, PET_WORLD.treeShelterX);
  assert.equal(world.rainGuest.phase, "carried");

  for (let step = 0; step < 100 && world.action === "seek-shelter"; step += 1) {
    const before = world;
    world = stepPetWorld(world, 64, false, "guardian");
    if (world.action === "seek-shelter") {
      assert.ok(Math.abs(world.rainGuest.x - world.petX) <= 12, "the passenger should stay attached during travel");
    }
    if (world.petX !== before.petX) assert.equal(world.facing, -1, "Guardian should face the shelter while moving left");
  }

  assert.equal(world.action, "rain-guest-shelter");
  assert.equal(world.petX, PET_WORLD.treeShelterX);
  assert.equal(world.rainGuest.phase, "sheltered");
  assert.equal(world.poseY, 0);
  assert.equal(resolveCinematicShot(world, false).id, "intimate");
});

test("a quiet invitation resolves with care, while Focus and new weather retain authority", () => {
  const noticed = stepPetWorld(
    setWorldWeather(createPetWorldState(), "rain"),
    PET_WORLD.weatherArrivalDuration,
    false,
    "guardian",
  );
  const waiting = stepPetWorld(noticed, RAIN_GUEST.noticeDuration, false, "guardian");
  const autonomous = stepPetWorld(waiting, RAIN_GUEST.waitDuration, false, "guardian");
  const focusing = beginCompanionFocus(waiting, 15000);
  const clearing = setWorldWeather(waiting, "sunny");

  assert.equal(autonomous.action, "seek-rain-guest");
  assert.equal(focusing.rainGuest.phase, "quiet");
  assert.equal(focusing.action, "focus-invite");
  assert.equal(clearing.rainGuest.phase, "quiet");
  assert.equal(clearing.action, "weather-notice");
});

test("Reduce Motion preserves shared shelter without animated travel", () => {
  const sheltered = stepPetWorld(
    setWorldWeather(createPetWorldState(), "rain"),
    16,
    true,
    "guardian",
  );

  assert.equal(sheltered.action, "rain-guest-shelter");
  assert.equal(sheltered.petX, PET_WORLD.treeShelterX);
  assert.equal(sheltered.poseY, 0);
  assert.equal(sheltered.rainGuest.phase, "sheltered");
  assert.equal(clipForWorldAction(sheltered.action, true, "guardian"), "affection");
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

test("wind has a bounded grounded sway, then loosens one playable leaf", () => {
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

  const invitation = stepPetWorld(after, PET_WORLD.windBraceDuration, false, "young");
  assert.equal(invitation.action, "leaf-invite");
  assert.equal(invitation.playLeaf.phase, "flying");
  assert.equal(invitation.playLeaf.mode, "leap");
  assert.equal(invitation.playLeaf.flight.id, "wind-drift");
  assert.equal(clipForWorldAction(invitation.action), "discover");
});

test("the wind hands one moving toy to the person before Moss commits", () => {
  const breezy = {
    ...createPetWorldState(),
    weather: "breeze" as const,
    weatherPhase: "settled" as const,
    weatherIntensity: 1,
    weatherSway: 1.5,
  };
  const invitation = beginWindLeafInvitation(breezy, "guardian", false);

  assert.equal(invitation.action, "leaf-invite");
  assert.equal(invitation.playLeaf.phase, "flying");
  assert.equal(invitation.playLeaf.mode, "aerial");
  assert.equal(invitation.visitor.active, false);
  assert.equal(invitation.targetX, null);

  const noticed = stepPetWorld(invitation, 160, false, "guardian");
  assert.equal(noticed.action, "leaf-invite");
  assert.equal(noticed.petX, invitation.petX, "the invitation is a look, not an automatic slide");

  const grabbed = grabWorldWindLeaf(
    noticed,
    { x: noticed.playLeaf.x, y: noticed.playLeaf.y },
    "guardian",
  );
  assert.equal(grabbed.playLeaf.phase, "held");
  assert.equal(grabbed.action, "leaf-track");
});

test("an ignored wind toy resolves at the movement layer each form has earned", () => {
  const resolveInvitation = (stage: "baby" | "young" | "guardian") => {
    let world = beginWindLeafInvitation({
      ...createPetWorldState(),
      weather: "breeze",
      weatherPhase: "settled",
      weatherIntensity: 1,
      weatherSway: 1.4,
    }, stage, false);
    for (let frame = 0; frame < 240 && (world.action === "leaf-invite" || world.action === "leaf-track"); frame += 1) {
      world = stepPetWorld(world, 16, false, stage);
    }
    return world;
  };

  const baby = resolveInvitation("baby");
  const young = resolveInvitation("young");
  const guardian = resolveInvitation("guardian");

  assert.equal(baby.action, "seek-leaf");
  assert.equal(young.action, "leaf-pounce");
  assert.equal(guardian.action, "leaf-aerial");
});

test("an active visitor keeps priority over the wind-toy episode", () => {
  const visitor = spawnVisitor(createPetWorldState(), "young", { x: 300, y: 150 });
  const braced = {
    ...visitor,
    weather: "breeze" as const,
    weatherPhase: "settled" as const,
    weatherIntensity: 1,
    action: "wind-brace" as const,
    actionElapsed: PET_WORLD.windBraceDuration - 1,
  };
  const after = stepPetWorld(braced, 2, false, "young");

  assert.equal(after.action, "idle");
  assert.equal(after.playLeaf.phase, "perched");
  assert.equal(after.visitor.active, true);
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

test("shared Focus begins with a place choice and its clock waits for Moss to arrive", () => {
  const invited = beginCompanionFocus({ ...createPetWorldState(), petX: 112 }, 1200);

  assert.equal(invited.action, "focus-invite");
  assert.equal(invited.focus.phase, "choosing");
  assert.equal(invited.focus.remainingMs, 1200);

  const waiting = stepPetWorld(invited, 800, false);
  assert.equal(waiting.focus.remainingMs, 1200, "the Focus duration cannot be consumed by setup");

  let focusing = chooseCompanionFocusPlace(waiting, 338);
  assert.equal(focusing.action, "seek-focus");
  assert.equal(focusing.focus.phase, "settling");
  assert.equal(focusing.focus.anchorX, 338);

  for (let step = 0; step < 100 && focusing.action !== "focus"; step += 1) {
    focusing = stepPetWorld(focusing, 100, false);
  }

  assert.equal(focusing.action, "focus");
  assert.equal(focusing.petX, 338);
  assert.equal(focusing.focus.phase, "together");
  assert.equal(focusing.focus.remainingMs, 1200, "the complete clock begins only after arrival");
});

test("focus together completes at the chosen place without inventing a streak", () => {
  let focusing = chooseCompanionFocusPlace(beginCompanionFocus(createPetWorldState(), 1200), 318);
  for (let step = 0; step < 40 && focusing.action !== "focus"; step += 1) focusing = stepPetWorld(focusing, 100, false);
  assert.equal(focusing.focus.remainingMs, 1200);
  assert.equal(focusing.focus.durationMs, 1200);
  assert.equal(focusing.focus.elapsedMs, 0);
  assert.equal(focusing.focus.anchorX, 318);

  for (let step = 0; step < 8; step += 1) focusing = stepPetWorld(focusing, 250, false);

  assert.equal(focusing.focus.active, false);
  assert.equal(focusing.focus.completed, true);
  assert.equal(focusing.focus.phase, "complete");
  assert.equal(focusing.focus.anchorX, 318);
  assert.equal(focusing.action, "greet");

  const remembered = plantLifeEcho(focusing, "focus", focusing.focus.anchorX);
  assert.equal(remembered.blooms.at(-1)?.x, 318, "the still light remembers the shared place");
});

test("rain keeps a chosen Focus place beneath the old tree", () => {
  const rain = { ...createPetWorldState(), weather: "rain" as const, weatherPhase: "settled" as const };
  const focusing = chooseCompanionFocusPlace(beginCompanionFocus(rain, 1200), PET_WORLD.maxX);

  assert.equal(focusing.focus.phase, "settling");
  assert.ok(focusing.focus.anchorX >= PET_WORLD.treeShelterX - 34);
  assert.ok(focusing.focus.anchorX <= PET_WORLD.treeShelterX + 34);
});

test("only the terrain becomes a shared Focus place", () => {
  const invited = beginCompanionFocus(createPetWorldState(), 1200);

  assert.equal(resolveCompanionFocusPlaceHit(invited, { x: 330, y: 72 }), null);
  assert.equal(resolveCompanionFocusPlaceHit(invited, { x: 330, y: 194 }), 330);
  assert.equal(resolveCompanionFocusPlaceHit(createPetWorldState(), { x: 330, y: 194 }), null);
});

test("an unanswered Focus invitation chooses the old tree without becoming a need", () => {
  const invited = beginCompanionFocus(createPetWorldState(), 1200);
  const defaulted = stepPetWorld(invited, PET_WORLD.focusChoiceDuration, false);

  assert.equal(defaulted.action, "seek-focus");
  assert.equal(defaulted.focus.phase, "settling");
  assert.equal(defaulted.focus.anchorX, PET_WORLD.treeShelterX);
  assert.equal(defaulted.focus.remainingMs, 1200);
});

test("starting shared focus clears wildlife and enters a portable stillness clock", () => {
  const withVisitor = spawnVisitor(createPetWorldState(), "young", { x: 250 });
  let focusing = chooseCompanionFocusPlace(beginCompanionFocus(withVisitor, 15000), withVisitor.petX);
  focusing = stepPetWorld(focusing, 100, false);
  const after = stepPetWorld(focusing, 2200, false);

  assert.equal(focusing.visitor.active, false);
  assert.equal(after.focus.active, true);
  assert.equal(after.focus.elapsedMs, 2200);
  assert.equal(after.focus.remainingMs, 12800);
});

test("shared focus hushes weather and carries a gentle breathing cadence", () => {
  const breezy = setWorldWeather(createPetWorldState(), "breeze");
  const ordinary = stepPetWorld(breezy, 420, false);
  const focusing = chooseCompanionFocusPlace(beginCompanionFocus(breezy, 15000), breezy.petX);
  const settled = stepPetWorld(focusing, 100, false);
  const quiet = stepPetWorld(settled, 420, false);
  const atmosphere = resolveFocusAtmosphere(quiet.focus, false);

  assert.ok(atmosphere.hush > 0);
  assert.ok(atmosphere.breath >= 0 && atmosphere.breath <= 1);
  assert.ok(Math.abs(quiet.weatherSway) < Math.abs(ordinary.weatherSway));
});

test("Reduce Motion keeps focus meaning without a pulsing cadence", () => {
  const focusing = chooseCompanionFocusPlace(beginCompanionFocus(createPetWorldState(), 15000), 318);
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

test("the authored old tree owns one bounded world-space touch target", () => {
  const world = createPetWorldState();

  assert.equal(resolveTreePlayHit(world, { x: PET_WORLD.treeShelterX, y: 90 }), true);
  assert.equal(resolveTreePlayHit(world, { x: PET_WORLD.treeShelterX - TREE_PLAY.hitRadiusX - 1, y: 90 }), false);
  assert.equal(resolveTreePlayHit(world, { x: PET_WORLD.treeShelterX, y: TREE_PLAY.hitTopY - 1 }), false);
  assert.equal(resolveTreePlayHit(world, { x: PET_WORLD.treeShelterX, y: TREE_PLAY.hitBottomY + 1 }), false);
});

test("Baby explores the old roots without leaving the terrain", () => {
  const invited = beginTreePlay(createPetWorldState(), "baby");
  const noticed = stepPetWorld(invited, TREE_PLAY.noticeDuration, false, "baby");
  const approached = stepPetWorld(noticed, 5000, false, "baby");
  const arrived = stepPetWorld(approached, 1, false, "baby");
  const held = stepPetWorld(arrived, TREE_PLAY.rootHoldDuration - 1, false, "baby");
  const settled = stepPetWorld(held, 2, false, "baby");

  assert.equal(invited.action, "tree-notice");
  assert.equal(noticed.action, "seek-tree");
  assert.equal(arrived.action, "tree-root");
  assert.equal(arrived.petX, TREE_PLAY.rootX);
  assert.equal(arrived.poseY, 0);
  assert.equal(held.poseY, 0);
  assert.equal(clipForWorldAction(arrived.action, false, "baby"), "affection");
  assert.equal(settled.action, "idle");
  assert.equal(settled.treePlay.active, false);
});

test("the old tree opens a progressively higher stable perch as Moss matures", () => {
  const youngInvited = beginTreePlay(createPetWorldState(), "young");
  const guardianInvited = beginTreePlay(createPetWorldState(), "guardian");
  const youngLaunch = stepPetWorld(youngInvited, TREE_PLAY.noticeDuration, false, "young");
  const guardianLaunch = stepPetWorld(guardianInvited, TREE_PLAY.noticeDuration, false, "guardian");
  const youngPerched = stepPetWorld(youngLaunch, TREE_PLAY.young.launchDuration, false, "young");
  const guardianPerched = stepPetWorld(guardianLaunch, TREE_PLAY.guardian.launchDuration, false, "guardian");

  assert.equal(youngLaunch.action, "tree-launch");
  assert.equal(guardianLaunch.action, "tree-launch");
  assert.equal(clipForWorldAction(youngLaunch.action, false, "young"), "pounce");
  assert.equal(clipForWorldAction(guardianLaunch.action, false, "guardian"), "aerial");
  assert.equal(youngPerched.action, "tree-perch");
  assert.equal(guardianPerched.action, "tree-perch");
  assert.equal(youngPerched.petX, TREE_PLAY.young.perchX);
  assert.equal(guardianPerched.petX, TREE_PLAY.guardian.perchX);
  assert.equal(youngPerched.poseY, TREE_PLAY.young.perchY);
  assert.equal(guardianPerched.poseY, TREE_PLAY.guardian.perchY);
  assert.ok(guardianPerched.poseY < youngPerched.poseY, "the Guardian should occupy the highest bough");
});

test("a tree perch waits for the person, then returns through their committed landing", () => {
  const invited = beginTreePlay(createPetWorldState(), "guardian");
  const launch = stepPetWorld(invited, TREE_PLAY.noticeDuration, false, "guardian");
  const perched = stepPetWorld(launch, TREE_PLAY.guardian.launchDuration, false, "guardian");
  const held = stepPetWorld(perched, TREE_PLAY.perchDecisionDuration - 1, false, "guardian");
  const returning = beginTreeReturn(held, PET_WORLD.maxX);
  const airborne = stepPetWorld(returning, TREE_PLAY.guardian.returnDuration / 2, false, "guardian");
  const landed = stepPetWorld(airborne, TREE_PLAY.guardian.returnDuration / 2 + 1, false, "guardian");

  assert.equal(held.action, "tree-perch", "Moss should not leave while the person still has the scene");
  assert.equal(held.petX, TREE_PLAY.guardian.perchX);
  assert.equal(held.poseY, TREE_PLAY.guardian.perchY);
  assert.equal(returning.action, "tree-return");
  assert.equal(returning.facing, 1);
  assert.equal(returning.treePlay.landingX, TREE_PLAY.guardian.perchX + TREE_PLAY.guardian.landingReach);
  assert.ok(airborne.poseY < 0);
  assert.ok(airborne.petX > returning.petX);
  assert.equal(landed.action, "guardian-land");
  assert.equal(landed.petX, returning.treePlay.landingX);
  assert.equal(landed.poseY, 0);
  assert.equal(landed.treePlay.active, false);
  assert.equal(landed.guardianWake.phase, "released");
  assert.equal(landed.guardianWake.x, returning.treePlay.landingX);
  assert.equal(landed.guardianWake.facing, 1);

  const wake = resolveGuardianWakePresentation(landed);
  assert.equal(wake.mode, "released");
  assert.equal(wake.centerX, returning.treePlay.landingX);
  assert.equal(wake.intensity, 1);

  const settled = stepPetWorld(
    landed,
    PET_WORLD.handAerialDuration - PET_WORLD.handAerialContactAt + 1,
    false,
    "guardian",
  );
  assert.equal(settled.action, "idle");
});

test("a Young tree return lands at the chosen place without moving the meadow", () => {
  const invited = beginTreePlay(createPetWorldState(), "young");
  const launch = stepPetWorld(invited, TREE_PLAY.noticeDuration, false, "young");
  const perched = stepPetWorld(launch, TREE_PLAY.young.launchDuration, false, "young");
  const returning = beginTreeReturn(perched, PET_WORLD.minX);
  const landed = stepPetWorld(returning, TREE_PLAY.young.returnDuration + 1, false, "young");

  assert.equal(landed.action, "idle");
  assert.equal(landed.petX, returning.treePlay.landingX);
  assert.equal(landed.poseY, 0);
  assert.equal(landed.treePlay.active, false);
  assert.equal(landed.guardianWake.phase, "quiet");
  assert.equal(resolveGuardianWakePresentation(landed).mode, "quiet");
});

test("maturity expands the landing space without allowing an impossible request", () => {
  const perch = (stage: "young" | "guardian") => {
    const invited = beginTreePlay(createPetWorldState(), stage);
    const launch = stepPetWorld(invited, TREE_PLAY.noticeDuration, false, stage);
    return stepPetWorld(launch, TREE_PLAY[stage].launchDuration, false, stage);
  };
  const youngLeft = beginTreeReturn(perch("young"), PET_WORLD.minX);
  const guardianRight = beginTreeReturn(perch("guardian"), PET_WORLD.maxX);

  assert.equal(youngLeft.facing, -1);
  assert.equal(youngLeft.treePlay.landingX, TREE_PLAY.young.perchX - TREE_PLAY.young.landingReach);
  assert.equal(guardianRight.facing, 1);
  assert.equal(guardianRight.treePlay.landingX, TREE_PLAY.guardian.perchX + TREE_PLAY.guardian.landingReach);
  assert.ok(TREE_PLAY.guardian.landingReach > TREE_PLAY.young.landingReach);
});

test("only terrain touch becomes a landing invitation while Moss is actually perched", () => {
  const invited = beginTreePlay(createPetWorldState(), "young");
  const launch = stepPetWorld(invited, TREE_PLAY.noticeDuration, false, "young");
  const perched = stepPetWorld(launch, TREE_PLAY.young.launchDuration, false, "young");

  assert.equal(resolveTreeReturnHit(perched, { x: 300, y: TREE_PLAY.landingHitTopY }), true);
  assert.equal(resolveTreeReturnHit(perched, { x: 300, y: TREE_PLAY.landingHitTopY - 1 }), false);
  assert.equal(resolveTreeReturnHit(launch, { x: 300, y: PET_WORLD.visitorGroundY }), false);
});

test("a chosen branch return cannot reverse in flight and quiet inaction still comes home", () => {
  const invited = beginTreePlay(createPetWorldState(), "young");
  const launch = stepPetWorld(invited, TREE_PLAY.noticeDuration, false, "young");
  const perched = stepPetWorld(launch, TREE_PLAY.young.launchDuration, false, "young");
  const chosen = beginTreeReturn(perched, PET_WORLD.minX);
  const reversed = beginTreeReturn(chosen, PET_WORLD.maxX);
  const waiting = stepPetWorld(perched, TREE_PLAY.perchDecisionDuration - 1, false, "young");
  const autonomous = stepPetWorld(waiting, 2, false, "young");

  assert.deepEqual(reversed, chosen, "one landing invitation must stay immutable through flight");
  assert.equal(waiting.action, "tree-perch");
  assert.equal(autonomous.action, "tree-return");
  assert.equal(autonomous.treePlay.landingX, TREE_PLAY.defaultLandingX);
});

test("Reduce Motion keeps tree discovery grounded and stronger rituals keep authority", () => {
  const invited = beginTreePlay(createPetWorldState(), "guardian");
  const reduced = stepPetWorld(invited, TREE_PLAY.noticeDuration, true, "guardian");
  const focusing = beginCompanionFocus(createPetWorldState(), 15000);
  const raining = {
    ...createPetWorldState(),
    weather: "rain" as const,
    weatherPhase: "settled" as const,
    action: "shelter" as const,
  };

  assert.equal(reduced.action, "tree-root");
  assert.equal(reduced.petX, TREE_PLAY.rootX);
  assert.equal(reduced.poseY, 0);
  assert.equal(beginTreePlay(focusing, "guardian"), focusing);
  assert.equal(beginTreePlay(raining, "guardian"), raining);
});

test("a deliberate hand guide earns attention before choosing an honest gait", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 310, y: 146 });
  const watched = guideWorldWithHand(start, { x: start.petX + 10, y: 188 }, "young");
  const walkingInvitation = guideWorldWithHand(watched, { x: start.petX + 42, y: 184 }, "young");
  const walking = stepPetWorld(walkingInvitation, PET_WORLD.handNoticeDuration, false, "young");
  const running = guideWorldWithHand(walking, { x: start.petX + 118, y: 180 }, "young");

  assert.equal(watched.hand.phase, "held");
  assert.equal(watched.action, "hand-track");
  assert.equal(watched.petX, start.petX, "attention must not fake movement");
  assert.equal(walking.action, "hand-walk");
  assert.equal(running.action, "hand-run");
  assert.equal(running.facing, 1);
  assert.equal(running.visitor.active, false, "deliberate touch owns the scene");
  assert.equal(running.playLeaf.phase, "perched");
  assert.equal(clipForWorldAction(watched.action), "discover");
  assert.equal(clipForWorldAction(walking.action), "walk");
  assert.equal(clipForWorldAction(running.action), "run");
});

test("Moss follows a moving hand with inertia instead of teleporting to the cursor", () => {
  let world = guideWorldWithHand(createPetWorldState(), { x: 390, y: 184 }, "young");
  world = stepPetWorld(world, PET_WORLD.handNoticeDuration, false, "young");
  const first = stepPetWorld(world, 160, false, "young");

  assert.ok(first.petX > world.petX);
  assert.ok(first.petX < world.hand.x);
  assert.equal(first.facing, 1);

  world = guideWorldWithHand(first, { x: 92, y: 184 }, "young");
  const turned = stepPetWorld(world, 160, false, "young");
  assert.ok(turned.petX < world.petX);
  assert.ok(turned.petX > world.hand.x);
  assert.equal(turned.facing, -1);
});

test("a more specific gesture can cancel hand guidance without inventing an arrival", () => {
  const guided = guideWorldWithHand(createPetWorldState(), { x: 390, y: 184 }, "young");
  const cancelled = cancelWorldHandGuide(guided);

  assert.equal(cancelled.action, "idle");
  assert.equal(cancelled.targetX, null);
  assert.equal(cancelled.hand.phase, "quiet");
});

test("releasing the hand commits to one last place, greets, and becomes quiet", () => {
  let world = releaseWorldHandGuide(
    guideWorldWithHand(createPetWorldState(), { x: 356, y: 184 }, "young"),
    "young",
  );

  assert.equal(world.hand.phase, "released");
  assert.equal(world.targetX, 356);
  for (let frame = 0; frame < 300 && world.action !== "hand-found"; frame += 1) {
    world = stepPetWorld(world, 16, false, "young");
  }

  assert.equal(world.action, "hand-found");
  assert.ok(Math.abs(world.petX - 356) <= PET_WORLD.handArrivalDistance);
  assert.equal(clipForWorldAction(world.action), "greet");

  world = stepPetWorld(world, PET_WORLD.handFoundDuration, false, "young");
  assert.equal(world.action, "idle");
  assert.equal(world.hand.phase, "quiet");
});

test("rain shelter and shared Focus are stronger than a hand invitation", () => {
  const sheltered = {
    ...createPetWorldState(),
    weather: "rain" as const,
    weatherPhase: "settled" as const,
    action: "shelter" as const,
    petX: PET_WORLD.treeShelterX,
  };
  const focusing = beginCompanionFocus(createPetWorldState(), 15_000);

  const rainRefusal = guideWorldWithHand(sheltered, { x: 380, y: 80 }, "guardian");
  const focusRefusal = guideWorldWithHand(focusing, { x: 380, y: 80 }, "guardian");

  assert.deepEqual(rainRefusal, sheltered);
  assert.deepEqual(focusRefusal, focusing);
  assert.equal(rainRefusal.guardianWake.phase, "quiet");
  assert.equal(focusRefusal.guardianWake.phase, "quiet");
});

test("Reduce Motion preserves guide, arrival, and greeting without animated travel", () => {
  const guided = guideWorldWithHand(createPetWorldState(), { x: 352, y: 72 }, "guardian");
  const arrived = stepPetWorld(releaseWorldHandGuide(guided, "guardian"), 16, true, "guardian");

  assert.equal(arrived.petX, 352);
  assert.equal(arrived.action, "guardian-land");
  assert.equal(arrived.hand.phase, "released");
  assert.equal(arrived.poseY, 0);
});

test("a committed hand leap cannot flip when the finger crosses behind Moss", () => {
  const youngNotice = guideWorldWithHand(createPetWorldState(), { x: 300, y: 118 }, "young");
  const youngCommitted = stepPetWorld(youngNotice, PET_WORLD.handNoticeDuration, false, "young");
  const youngCrossed = guideWorldWithHand(youngCommitted, { x: 180, y: 118 }, "young");
  const youngAirborne = stepPetWorld(youngCrossed, 160, false, "young");
  const guardianNotice = guideWorldWithHand(createPetWorldState(), { x: 300, y: 58 }, "guardian");
  const guardianCommitted = stepPetWorld(guardianNotice, PET_WORLD.handNoticeDuration, false, "guardian");
  const guardianCrossed = guideWorldWithHand(guardianCommitted, { x: 180, y: 58 }, "guardian");
  const guardianAirborne = stepPetWorld(guardianCrossed, 320, false, "guardian");

  assert.equal(youngCommitted.action, "hand-pounce");
  assert.equal(youngCrossed.targetX, 300);
  assert.equal(youngCrossed.facing, 1);
  assert.ok(youngAirborne.petX > youngCommitted.petX);
  assert.equal(guardianCommitted.action, "hand-aerial");
  assert.equal(guardianCrossed.targetX, 300);
  assert.equal(guardianCrossed.facing, 1);
  assert.ok(guardianAirborne.petX > guardianCommitted.petX);
});

test("the reachable sky opens from grounded baby to bounding young to aerial Guardian", () => {
  const baby = stepPetWorld(
    guideWorldWithHand(createPetWorldState(), { x: 240, y: 58 }, "baby"),
    PET_WORLD.handNoticeDuration,
    false,
    "baby",
  );
  const young = stepPetWorld(
    guideWorldWithHand(createPetWorldState(), { x: 276, y: 118 }, "young"),
    PET_WORLD.handNoticeDuration,
    false,
    "young",
  );
  const guardian = stepPetWorld(
    guideWorldWithHand(createPetWorldState(), { x: 276, y: 58 }, "guardian"),
    PET_WORLD.handNoticeDuration,
    false,
    "guardian",
  );

  assert.equal(baby.hand.y, PET_WORLD.handBabyReachY);
  assert.equal(baby.action, "hand-track", "Baby can watch high play without borrowing a mature jump");
  assert.equal(young.hand.y, PET_WORLD.handYoungReachY);
  assert.equal(young.action, "hand-pounce");
  assert.equal(clipForWorldAction(young.action), "pounce");
  assert.equal(guardian.hand.y, 58);
  assert.equal(guardian.action, "hand-aerial");
  assert.equal(clipForWorldAction(guardian.action), "aerial");
});

test("only Guardian gathers a meadow wake from the existing high-hand gesture", () => {
  const baby = stepPetWorld(guideWorldWithHand(createPetWorldState(), { x: 300, y: 58 }, "baby"), PET_WORLD.handNoticeDuration, false, "baby");
  const young = stepPetWorld(guideWorldWithHand(createPetWorldState(), { x: 300, y: 58 }, "young"), PET_WORLD.handNoticeDuration, false, "young");
  const guardian = stepPetWorld(guideWorldWithHand(createPetWorldState(), { x: 300, y: 58 }, "guardian"), PET_WORLD.handNoticeDuration, false, "guardian");

  assert.equal(baby.guardianWake.phase, "quiet");
  assert.equal(young.guardianWake.phase, "quiet");
  assert.deepEqual(guardian.guardianWake, {
    phase: "gathering",
    x: guardian.petX,
    elapsedMs: 0,
    facing: 1,
  });
});

test("the Guardian wake waits for authored landing, releases once, and settles", () => {
  const aerial = leaflingManifestForStage("guardian").clips.aerial;
  const landIndex = aerial.frames.findIndex((frame) => frame.events?.includes("land"));
  const authoredContactAt = aerial.frames
    .slice(0, landIndex)
    .reduce((duration, frame) => duration + frame.duration, 0);
  assert.equal(PET_WORLD.handAerialContactAt, authoredContactAt);

  let world = stepPetWorld(
    guideWorldWithHand(createPetWorldState(), { x: 318, y: 58 }, "guardian"),
    PET_WORLD.handNoticeDuration,
    false,
    "guardian",
  );
  world = releaseWorldHandGuide(world, "guardian");
  world = stepPetWorld(world, PET_WORLD.handAerialContactAt - 1, false, "guardian");
  assert.equal(world.guardianWake.phase, "gathering");
  assert.notEqual(world.petX, 318);

  world = stepPetWorld(world, 1, false, "guardian");
  assert.equal(world.action, "guardian-land");
  assert.equal(world.actionElapsed, PET_WORLD.handAerialContactAt);
  assert.equal(world.petX, 318);
  assert.deepEqual(world.guardianWake, {
    phase: "released",
    x: 318,
    elapsedMs: 0,
    facing: 1,
  });

  const recovery = stepPetWorld(world, 180, false, "guardian");
  assert.equal(recovery.action, "guardian-land");
  assert.equal(recovery.petX, 318, "authored grounded recovery must not continue translating");

  const settled = stepPetWorld(world, PET_WORLD.guardianWakeDuration + 1, false, "guardian");
  assert.equal(settled.guardianWake.phase, "quiet");
});

test("meaningful Focus clears a released meadow wake and owns the scene", () => {
  const released = {
    ...createPetWorldState(),
    action: "guardian-land" as const,
    guardianWake: { phase: "released" as const, x: 318, elapsedMs: 180, facing: 1 as const },
  };

  const focusing = beginCompanionFocus(released, 15_000);

  assert.equal(focusing.action, "focus-invite");
  assert.equal(focusing.guardianWake.phase, "quiet");
});

test("a released Guardian landing recovers on the terrain instead of greeting with a second hop", () => {
  let world = stepPetWorld(
    guideWorldWithHand(createPetWorldState(), { x: 318, y: 58 }, "guardian"),
    PET_WORLD.handNoticeDuration,
    false,
    "guardian",
  );
  world = releaseWorldHandGuide(world, "guardian");
  world = stepPetWorld(world, PET_WORLD.handAerialContactAt, false, "guardian");

  assert.equal(world.action, "guardian-land");
  assert.equal(clipForWorldAction(world.action), "aerial");
  assert.equal(clipForWorldAction(world.action, true), "discover");
  assert.equal(world.poseY, 0);
  assert.equal(world.targetX, null);

  world = stepPetWorld(
    world,
    PET_WORLD.handAerialDuration - PET_WORLD.handAerialContactAt,
    false,
    "guardian",
  );
  assert.equal(world.action, "idle");
  assert.equal(world.hand.phase, "quiet");
  assert.equal(world.poseY, 0);
});

test("Guardian wake presentation is contact-led limited animation, not an aura", () => {
  const base = createPetWorldState();
  const gathering = resolveGuardianWakePresentation({
    ...base,
    guardianWake: { phase: "gathering", x: 240, elapsedMs: 360, facing: 1 },
  }, false);
  const contact = resolveGuardianWakePresentation({
    ...base,
    guardianWake: { phase: "released", x: 318, elapsedMs: 0, facing: 1 },
  }, false);
  const traveling = resolveGuardianWakePresentation({
    ...base,
    guardianWake: { phase: "released", x: 318, elapsedMs: PET_WORLD.guardianWakeDuration / 2, facing: 1 },
  }, false);

  assert.equal(gathering.mode, "gathering");
  assert.ok(gathering.radius < contact.radius);
  assert.deepEqual(
    { mode: contact.mode, intensity: contact.intensity, progress: contact.progress },
    { mode: "released", intensity: 1, progress: 0 },
  );
  assert.ok(traveling.radius > contact.radius);
  assert.ok(traveling.intensity < contact.intensity);
  assert.equal(traveling.particles, true);
});

test("Reduce Motion keeps one static bowed-grass contact without traveling particles", () => {
  const base = {
    ...createPetWorldState(),
    guardianWake: { phase: "released" as const, x: 318, elapsedMs: 0, facing: 1 as const },
  };
  const first = resolveGuardianWakePresentation(base, true);
  const later = resolveGuardianWakePresentation({
    ...base,
    guardianWake: { ...base.guardianWake, elapsedMs: 500 },
  }, true);

  assert.deepEqual(first, later);
  assert.deepEqual(first, {
    visible: true,
    mode: "released",
    centerX: 318,
    facing: 1,
    progress: 0,
    intensity: 0.42,
    radius: 30,
    lift: 0,
    particles: false,
  });
});

test("an acrobatic hand chase commits once, lands, then watches instead of pogoing", () => {
  let world = guideWorldWithHand(createPetWorldState(), { x: 318, y: 62 }, "guardian");
  world = stepPetWorld(world, PET_WORLD.handNoticeDuration, false, "guardian");
  world = stepPetWorld(world, 160, false, "guardian");
  const elapsedBeforeRefine = world.actionElapsed;
  world = guideWorldWithHand(world, { x: 342, y: 70 }, "guardian");

  assert.equal(world.action, "hand-aerial");
  assert.equal(world.actionElapsed, elapsedBeforeRefine, "moving the landing point must not restart the authored flight");
  assert.ok(world.petX > 240 && world.petX < world.hand.x);

  world = stepPetWorld(world, PET_WORLD.handAerialDuration, false, "guardian");
  assert.equal(world.action, "guardian-land");
  assert.equal(world.hand.acroUsed, true);
  assert.equal(world.poseY, 0, "the creature must land before holding attention");

  const heldAfterLanding = guideWorldWithHand(world, { x: 350, y: 62 }, "guardian");
  assert.notEqual(heldAfterLanding.action, "hand-aerial", "one continuous gesture cannot trigger a pogo loop");

  const released = releaseWorldHandGuide(heldAfterLanding, "guardian");
  assert.equal(released.action, "guardian-land");
});

test("settling weather may change the habitat but cannot cut off a committed hand landing", () => {
  const arriving = stepPetWorld(
    setWorldWeather(createPetWorldState(), "breeze"),
    PET_WORLD.weatherArrivalDuration - 80,
    false,
    "guardian",
  );
  const committed = guideWorldWithHand(arriving, { x: 318, y: 62 }, "guardian");
  const settled = stepPetWorld(committed, PET_WORLD.handNoticeDuration, false, "guardian");

  assert.equal(settled.weatherPhase, "settled");
  assert.equal(settled.action, "hand-aerial");
  assert.equal(settled.actionElapsed, 0, "weather may settle during the look, but the authored flight still begins cleanly");
  assert.equal(settled.guardianWake.phase, "gathering");
});

test("holding the wind leaf lets Moss track the finger without sliding", () => {
  const start = createPetWorldState();
  const grabbed = grabWorldWindLeaf(start, { x: 180, y: 94 }, "young");
  const dragged = dragWorldWindLeaf(grabbed, { x: 140, y: 72 });

  assert.equal(grabbed.playLeaf.phase, "held");
  assert.equal(grabbed.action, "leaf-track");
  assert.equal(dragged.petX, start.petX);
  assert.equal(dragged.facing, -1);
  assert.deepEqual([dragged.playLeaf.x, dragged.playLeaf.y], [140, 72]);
  assert.equal(clipForWorldAction(dragged.action), "discover");
});

test("baby waits for a grounded wind leaf, then approaches and catches once", () => {
  let world = grabWorldWindLeaf(createPetWorldState(), { x: 330, y: 104 }, "baby");
  world = tossWorldWindLeaf(world, { x: 0.08, y: -0.1 }, true);
  world = stepPetWorld(world, 16, false);

  assert.equal(world.playLeaf.phase, "landed");
  assert.equal(world.action, "seek-leaf");
  assert.equal(world.targetX, world.playLeaf.catchX);

  for (let step = 0; step < 40 && world.action === "seek-leaf"; step += 1) {
    world = stepPetWorld(world, 160, false);
  }
  assert.equal(world.action, "leaf-pounce");

  world = stepPetWorld(world, PET_WORLD.pounceDuration, false);
  assert.equal(world.action, "leaf-catch");
  assert.equal(world.playLeaf.phase, "caught");

  world = stepPetWorld(world, PET_WORLD.leafCatchDuration, false);
  assert.equal(world.action, "idle");
  assert.equal(world.playLeaf.phase, "perched");
});

test("young and Guardian commit to distinct stable airborne catches", () => {
  const youngHeld = grabWorldWindLeaf(createPetWorldState(), { x: 292, y: 146 }, "young");
  const young = tossWorldWindLeaf(youngHeld, { x: 0.06, y: -0.04 }, false);
  const guardianHeld = grabWorldWindLeaf(createPetWorldState(), { x: 292, y: 74 }, "guardian");
  const guardian = tossWorldWindLeaf(guardianHeld, { x: 0.06, y: -0.1 }, false);

  assert.equal(young.action, "leaf-pounce");
  assert.equal(clipForWorldAction(young.action), "pounce");
  assert.equal(guardian.action, "leaf-aerial");
  assert.equal(clipForWorldAction(guardian.action), "aerial");
  assert.equal(young.targetX, young.playLeaf.catchX);
  assert.equal(guardian.targetX, guardian.playLeaf.catchX);
  assert.equal(young.facing, 1);
  assert.equal(guardian.facing, 1);
});

test("the Pet world samples settled weather once for each wind-leaf throw", () => {
  const sunny = tossWorldWindLeaf(
    grabWorldWindLeaf(setWorldWeather(createPetWorldState(), "sunny"), { x: 292, y: 74 }, "guardian"),
    { x: 0.02, y: -0.09 },
    false,
  );
  const breezyState = {
    ...setWorldWeather(createPetWorldState(), "breeze"),
    weatherPhase: "settled" as const,
    weatherIntensity: 1,
    weatherSway: -2,
  };
  const breezy = tossWorldWindLeaf(
    grabWorldWindLeaf(breezyState, { x: 292, y: 74 }, "guardian"),
    { x: 0.02, y: -0.09 },
    false,
  );

  assert.equal(sunny.playLeaf.flight.id, "sun-updraft");
  assert.equal(breezy.playLeaf.flight.id, "wind-drift");
  assert.ok(breezy.playLeaf.flight.windX < 0);
  assert.ok(breezy.playLeaf.catchX < sunny.playLeaf.catchX);

  const stepped = stepPetWorld(breezy, 320, false);
  assert.equal(stepped.playLeaf.flight, breezy.playLeaf.flight, "weather cannot rewrite a throw after Moss commits");
  assert.equal(stepped.playLeaf.catchX, breezy.playLeaf.catchX);
});

test("Focus immediately returns the wind leaf and owns the scene", () => {
  const playing = tossWorldWindLeaf(
    grabWorldWindLeaf(createPetWorldState(), { x: 310, y: 72 }, "guardian"),
    { x: 0.08, y: -0.12 },
    false,
  );
  const focused = beginCompanionFocus(playing, 15000);

  assert.equal(focused.action, "focus-invite");
  assert.equal(focused.focus.active, true);
  assert.equal(focused.playLeaf.phase, "perched");
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
  assert.equal(baby.visitor.y, PET_WORLD.visitorGroundY, "the crawler's body anchor belongs on the terrain");
  assert.ok(baby.visitor.y > young.visitor.y);
  assert.ok(young.visitor.y > guardian.visitor.y);
});

test("an arriving visitor is already readable inside the shot when attention begins", () => {
  const visitors = (["baby", "young", "guardian"] as const).map((stage) =>
    spawnVisitor(createPetWorldState(), stage)
  );

  for (const world of visitors) {
    const visitorScreenX = PET_WORLD.viewportWidth / 2
      + (world.visitor.x - world.cameraX) * world.zoom;

    assert.ok(visitorScreenX >= 12, `${world.visitor.kind} cannot begin hidden behind the left scenery`);
    assert.ok(
      visitorScreenX <= PET_WORLD.viewportWidth - 12,
      `${world.visitor.kind} cannot begin hidden behind the right scenery`,
    );
  }
});

test("tracking a visitor advances one attention performance instead of restarting every frame", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 300, direction: -1 });
  const noticed = stepPetWorld(start, 100, false);
  const tracking = stepPetWorld(noticed, 100, false);

  assert.equal(noticed.action, "track");
  assert.equal(tracking.action, "track");
  assert.equal(tracking.actionElapsed, 100);
});

test("a nearby visitor earns a visible attention beat before Moss commits to pursuit", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 254, y: 164, direction: -1 });
  const noticed = stepPetWorld(start, 16, false, "young");

  assert.equal(noticed.action, "track");
  assert.equal(noticed.facing, 1);
  assert.equal(noticed.visitor.engaged, false);
  assert.equal(noticed.petX, start.petX, "eyes, ears, and head should acquire the target before the body travels");
});

test("every wildlife chase plays its directional anticipation before takeoff", () => {
  const stages = ["baby", "young", "guardian"] as const;

  for (const stage of stages) {
    const start = spawnVisitor(createPetWorldState(), stage, { x: 250, direction: -1 });
    const noticed = stepPetWorld(start, 16, false, stage);
    const prepared = stepPetWorld(noticed, 440, false, stage);

    assert.equal(prepared.action, "visitor-turn", `${stage} must plant and aim before leaving the ground`);
    assert.equal(prepared.petX, start.petX);
    assert.equal(
      clipForWorldAction(prepared.action, false, stage),
      stage === "baby" ? "walk" : stage === "guardian" ? "aerial" : "pounce",
      `${stage} anticipation must use the same directional body line as its takeoff`,
    );
  }
});

test("Baby stalks the crawler without ever breaking terrain contact", () => {
  const manifest = leaflingManifestForStage("baby");
  const start = spawnVisitor(createPetWorldState(), "baby", { x: 250, direction: -1 });
  const noticed = stepPetWorld(start, 16, false, "baby");
  const prepared = stepPetWorld(noticed, 440, false, "baby");
  const stalking = stepPetWorld(prepared, PET_WORLD.visitorTurnDuration, false, "baby");

  assert.equal(clipForWorldAction(prepared.action, false, "baby"), "walk");
  assert.equal(stalking.action, "visitor-stalk");
  assert.equal(clipForWorldAction(stalking.action, false, "baby"), "walk");
  assert.ok(
    manifest.clips.walk.frames.every((frame) => frame.contact === "planted"),
    "the Baby chase vocabulary must keep every authored frame on the terrain",
  );
  for (let elapsed = 0; elapsed <= PET_WORLD.pounceDuration; elapsed += 40) {
    assert.equal(resolvePetFrame(manifest, "walk", elapsed, false).contact, "planted");
  }
});

test("Young returns world lift to zero when the authored pounce makes contact", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 250, direction: -1 });
  const noticed = stepPetWorld(start, 16, false, "young");
  const prepared = stepPetWorld(noticed, 340, false, "young");
  const contact = stepPetWorld(prepared, 425, false, "young");
  const snapshot = resolvePetFrame(
    leaflingManifestForStage("young"),
    clipForWorldAction(contact.action, false, "young"),
    contact.actionElapsed,
    false,
  );

  assert.equal(contact.action, "pounce");
  assert.equal(snapshot.contact, "planted");
  assert.equal(contact.poseY, 0, "world lift and authored foot contact must land on the same frame");
});

test("Moss commits toward the visitor's latest side after the attention beat", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 237, y: 164, direction: 1 });
  const noticed = stepPetWorld(start, 16, false, "young");
  const committed = stepPetWorld(noticed, 360, false, "young");

  assert.equal(noticed.action, "track");
  assert.equal(noticed.facing, -1, "the first glance follows the firefly on the left");
  assert.ok(committed.visitor.x > committed.petX, "the firefly crosses to the right during the glance");
  assert.equal(committed.action, "visitor-turn");
  assert.equal(committed.facing, 1, "the planted turn must use the target's latest visible side");
  assert.ok((committed.targetX ?? 0) > committed.petX);
  assert.equal(committed.visitor.direction, 1);

  const launched = stepPetWorld(committed, PET_WORLD.visitorTurnDuration, false, "young");
  assert.equal(launched.action, "pounce");
  assert.equal(launched.facing, 1);
});

test("a wildlife commitment leads the visitor along the same escape side Moss faces", () => {
  const commit = (stage: "baby" | "young" | "guardian") => {
    let world = spawnVisitor(createPetWorldState(), stage);
    for (let frame = 0; frame < 700 && world.action !== "visitor-turn"; frame += 1) {
      world = stepPetWorld(world, 16, false, stage);
    }
    return world;
  };

  const baby = commit("baby");
  const young = commit("young");
  const guardian = commit("guardian");

  for (const world of [baby, young, guardian]) {
    assert.equal(world.action, "visitor-turn");
    assert.ok(world.targetX !== null);
    assert.ok(
      ((world.targetX ?? world.petX) - world.visitor.x) * world.facing >= 0,
      "the landing cannot be left behind when the visitor turns to flee",
    );
    assert.ok(
      ((world.targetX ?? world.petX) - world.petX) * world.facing > 0,
      "the committed landing and Moss's body line must point the same way",
    );
  }

  const reaches = [baby, young, guardian].map((world) => Math.abs((world.targetX ?? world.petX) - world.petX));
  assert.ok(reaches[0] < reaches[1], "Young should commit beyond the Baby's ground pursuit");
  assert.ok(reaches[1] < reaches[2], "Guardian should own the longest aerial intercept");
});

test("a crossing visitor earns a planted turn before Moss launches the other way", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 246, y: 164, direction: -1 });
  const noticed = stepPetWorld(start, 16, false, "young");
  const turned = stepPetWorld(noticed, 340, false, "young");

  assert.equal(noticed.action, "track");
  assert.equal(noticed.facing, 1, "Moss first sees the firefly on the right");
  assert.ok(turned.visitor.x < turned.petX, "the firefly crosses to the left during attention");
  assert.equal(turned.action, "visitor-turn");
  assert.equal(turned.facing, -1);
  assert.equal(turned.petX, start.petX, "turning establishes the action line before translation");
  assert.equal(clipForWorldAction(turned.action), "pounce");

  const planted = stepPetWorld(turned, PET_WORLD.visitorTurnDuration - 1, false, "young");
  const launched = stepPetWorld(planted, 2, false, "young");
  const airborne = stepPetWorld(launched, 390, false, "young");

  assert.equal(planted.action, "visitor-turn");
  assert.equal(planted.petX, start.petX);
  assert.equal(launched.action, "pounce");
  assert.equal(launched.facing, -1);
  assert.ok(airborne.petX < launched.petX, "screen travel must follow the planted facing");
});

test("a new hand invitation is noticed before stage-specific movement begins", () => {
  const babyNotice = guideWorldWithHand(createPetWorldState(), { x: 300, y: 58 }, "baby");
  const youngNotice = guideWorldWithHand(createPetWorldState(), { x: 300, y: 118 }, "young");
  const guardianNotice = guideWorldWithHand(createPetWorldState(), { x: 300, y: 58 }, "guardian");

  assert.deepEqual(
    [babyNotice.action, youngNotice.action, guardianNotice.action],
    ["hand-track", "hand-track", "hand-track"],
  );

  const babyCommit = stepPetWorld(babyNotice, 300, false, "baby");
  const youngCommit = stepPetWorld(youngNotice, 300, false, "young");
  const guardianCommit = stepPetWorld(guardianNotice, 300, false, "guardian");

  assert.equal(babyCommit.action, "hand-walk");
  assert.equal(youngCommit.action, "hand-pounce");
  assert.equal(guardianCommit.action, "hand-aerial");
  assert.equal(guardianCommit.guardianWake.phase, "gathering");
});

test("a crossing firefly keeps its intercept on the visible side and cannot provoke a backward retry", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 226, y: 164, direction: 1 });
  const noticed = stepPetWorld(start, 80, false);
  const prepared = stepPetWorld(noticed, 340, false);
  const launched = stepPetWorld(prepared, PET_WORLD.visitorTurnDuration, false);
  const fromRight = spawnVisitor(createPetWorldState(), "young", { x: 254, y: 164, direction: -1 });
  const noticedFromRight = stepPetWorld(fromRight, 80, false);
  const preparedFromRight = stepPetWorld(noticedFromRight, 340, false);
  const launchedFromRight = stepPetWorld(preparedFromRight, PET_WORLD.visitorTurnDuration, false);
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

test("a visitor chase plants the turn and coil before translating toward the locked target", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 254, y: 164, direction: -1 });
  const noticed = stepPetWorld(start, 16, false);
  const committed = stepPetWorld(noticed, 340, false);
  const coiled = stepPetWorld(committed, 240, false);
  const launched = stepPetWorld(coiled, 60, false);
  const airborne = stepPetWorld(launched, 40, false);

  assert.equal(committed.action, "visitor-turn");
  assert.equal(clipForWorldAction(committed.action), "pounce");
  assert.equal(committed.facing, 1);
  assert.equal(committed.visitor.launchX, start.petX);
  assert.equal(coiled.petX, committed.petX, "acquire, lower, and coil must stay planted");
  assert.equal(coiled.facing, committed.facing, "a committed chase cannot flip during anticipation");
  assert.ok(launched.petX > coiled.petX, "a delayed frame preserves its takeoff overshoot instead of freezing translation");
  assert.ok(airborne.petX > launched.petX, "translation begins only once the authored launch starts");
  assert.equal(launched.facing, committed.facing);
  assert.ok((airborne.petX - launched.petX) * airborne.facing > 0, "screen travel must agree with the body action line");
});

test("a planted wildlife turn locks one action line before takeoff", () => {
  const start = spawnVisitor(createPetWorldState(), "guardian", { x: 260, direction: -1 });
  const noticed = stepPetWorld(start, 80, false, "guardian");
  const committed = stepPetWorld(noticed, 280, false, "guardian");
  const committedScreenX = committed.petX - committed.cameraX;
  const holding = stepPetWorld(committed, 120, false, "guardian");
  const launched = stepPetWorld(holding, PET_WORLD.visitorTurnDuration - 120, false, "guardian");

  assert.equal(committed.action, "visitor-turn");
  assert.equal(holding.action, "visitor-turn");
  assert.equal(holding.targetX, committed.targetX, "the intercept cannot move after Moss plants the turn");
  assert.equal(
    holding.petX - holding.cameraX,
    committedScreenX,
    "camera pursuit cannot make a planted Moss slide backward on screen",
  );
  assert.equal(launched.action, "aerial-pounce");
  assert.equal(launched.targetX, committed.targetX, "takeoff must use the action line Moss visibly committed to");
  assert.equal(launched.facing, committed.facing);
});

test("guardian tracks a high sky moth with its aerial vocabulary", () => {
  const start = spawnVisitor(createPetWorldState(), "guardian", { x: 260, direction: -1 });
  const noticed = stepPetWorld(start, 80, false, "guardian");
  const prepared = stepPetWorld(noticed, 280, false, "guardian");
  const after = stepPetWorld(prepared, PET_WORLD.visitorTurnDuration, false, "guardian");

  assert.equal(after.visitor.kind, "sky-moth");
  assert.ok(after.visitor.y < 130);
  assert.equal(after.action, "aerial-pounce");
  assert.equal(clipForWorldAction(after.action), "aerial");
  assert.equal(after.facing, 1, "the Guardian faces the sky moth that is still visibly right");
  assert.equal(after.visitor.direction, 1, "the sky moth escapes farther into the chosen side of the shot");
});

test("maturity unlocks progressively higher wildlife and a longer aerial travel window", () => {
  const baby = spawnVisitor(createPetWorldState(), "baby", { x: 250, direction: -1 });
  const young = spawnVisitor(createPetWorldState(), "young", { x: 250, direction: -1 });
  const guardian = spawnVisitor(createPetWorldState(), "guardian", { x: 260, direction: -1 });
  const babyCommitted = stepPetWorld(stepPetWorld(baby, 16, false, "baby"), 420, false, "baby");
  const youngCommitted = stepPetWorld(stepPetWorld(young, 16, false, "young"), 340, false, "young");
  const guardianCommitted = stepPetWorld(stepPetWorld(guardian, 16, false, "guardian"), 280, false, "guardian");
  const babyLaunched = stepPetWorld(babyCommitted, PET_WORLD.visitorTurnDuration, false, "baby");
  const youngLaunched = stepPetWorld(youngCommitted, PET_WORLD.visitorTurnDuration, false, "young");
  const guardianLaunched = stepPetWorld(guardianCommitted, PET_WORLD.visitorTurnDuration, false, "guardian");
  const babyAirborne = stepPetWorld(babyLaunched, 110, false, "baby");
  const youngAirborne = stepPetWorld(youngLaunched, 110, false, "young");
  const guardianAirborne = stepPetWorld(guardianLaunched, 110, false, "guardian");

  assert.deepEqual(
    [babyCommitted.visitor.kind, youngCommitted.visitor.kind, guardianCommitted.visitor.kind],
    ["crawler", "firefly", "sky-moth"],
  );
  assert.ok(babyCommitted.visitor.y > youngCommitted.visitor.y);
  assert.ok(youngCommitted.visitor.y > guardianCommitted.visitor.y);
  assert.equal(clipForWorldAction(babyCommitted.action, false, "baby"), "walk");
  assert.equal(clipForWorldAction(youngCommitted.action, false, "young"), "pounce");
  assert.equal(clipForWorldAction(guardianCommitted.action, false, "guardian"), "aerial");
  assert.ok(
    Math.abs(guardianAirborne.petX - guardianCommitted.petX) > Math.abs(youngAirborne.petX - youngCommitted.petX),
    "the Guardian's aerial path should cover more ground than the young pounce",
  );
  assert.ok(youngAirborne.poseY < babyAirborne.poseY, "the young form should add lift beyond the ground chase");
  assert.ok(guardianAirborne.poseY < youngAirborne.poseY, "the Guardian should visibly own the highest air layer");
  assert.equal(clipForWorldAction(babyLaunched.action, false, "baby"), "walk");
  assert.equal(clipForWorldAction(youngLaunched.action), "pounce");
  assert.equal(clipForWorldAction(guardianLaunched.action, false, "guardian"), "aerial");
});

test("Reduce Motion resolves wildlife on the target side without animated pursuit", () => {
  const start = spawnVisitor(createPetWorldState(), "young", { x: 300, y: 158, direction: -1 });
  const resolved = stepPetWorld(start, 16, true, "young");
  const settled = stepPetWorld(resolved, 300, true, "young");

  assert.equal(resolved.action, "pounce");
  assert.equal(resolved.facing, 1);
  assert.ok(resolved.petX > start.petX);
  assert.equal(resolved.visitor.engaged, true);
  assert.equal(resolved.targetX, null);
  assert.equal(resolved.poseY, 0);
  assert.equal(settled.action, "idle");
  assert.equal(settled.visitor.active, false);
  assert.equal(settled.visitor.engaged, false);
});

test("a pursued sky moth remains visible through the Guardian's committed reach", () => {
  const nearEdge = {
    ...createPetWorldState(),
    petX: 430,
    cameraX: 400,
  };
  const visitor = spawnVisitor(nearEdge, "guardian", { x: 448, direction: -1 });
  const noticed = stepPetWorld(visitor, 80, false, "guardian");
  const prepared = stepPetWorld(noticed, 280, false, "guardian");
  const launched = stepPetWorld(prepared, PET_WORLD.visitorTurnDuration, false, "guardian");
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
