import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Pixel Pet prototype shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Pet Engine Study 55 — Kwilt Lab<\/title>/i);
  assert.match(html, /Starting the Pet engine/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes starter infrastructure and exposes the portable engine study", async () => {
  const [page, layout, prototype, engine, evolution, habitat, habitatPerformance, affection, world, livingDay, plaything, soundscape, runtime, leafling, canvas] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PetPrototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-evolution.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-habitat.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-habitat-performance.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-affection.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-world.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-life-director.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-plaything.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-soundscape.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/leafling.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/PetEngineCanvas.tsx", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  assert.match(page, /<PetPrototype \/>/);
  assert.match(layout, /Pet Engine Study 55 — Kwilt Lab/);
  assert.match(layout, /og-study-34\.png/);
  assert.match(prototype, /Pet Engine Study 55/);
  assert.match(prototype, /The breeze finds<br \/>your hand\./i);
  assert.match(prototype, /First<\/dt><dd>the meadow stirs/i);
  assert.match(prototype, /Then<\/dt><dd>your hand enters/i);
  assert.match(prototype, /Finally<\/dt><dd>Moss answers/i);
  assert.match(prototype, /Catch the golden leaf/);
  assert.match(prototype, /Hold it, drag it, then let go/);
  assert.match(prototype, /is reading your hand/);
  assert.match(prototype, /windLeafActive/);
  assert.match(livingDay, /"wind-play"/);
  assert.match(canvas, /command\.kind === "wind-play"/);
  assert.match(prototype, /Meet the rain-light/);
  assert.match(prototype, /commandWorld\("after-rain"\)/);
  assert.match(canvas, /worldCommand\.type === "after-rain"/);
  assert.match(prototype, /Choose where quiet begins/);
  assert.match(prototype, /The full \$\{Math\.ceil\(world\.focus\.durationMs \/ 1000\)\} seconds begin/);
  assert.match(world, /chooseCompanionFocusPlace/);
  assert.match(world, /resolveCompanionFocusPlaceHit/);
  assert.match(world, /focusChoiceDuration/);
  assert.match(world, /escapeDirection/);
  assert.match(world, /visitor\.x \+ escapeDirection \* readableLead/);
  assert.match(canvas, /chooseCompanionFocusPlace/);
  assert.match(canvas, /resolveCompanionFocusPlaceHit/);
  assert.match(canvas, /worldRef\.current\.focus\.anchorX/);
  assert.match(canvas, /context\.translate\(world\.focus\.anchorX/);
  assert.match(canvas, /world\.focus\.phase === "together"/);
  assert.match(world, /RainGuestPhase/);
  assert.match(world, /resolveRainGuestHit/);
  assert.match(world, /beginRainGuestShelter/);
  assert.match(canvas, /drawRainGuest/);
  assert.match(canvas, /resolveRainGuestHit/);
  assert.match(prototype, /Rain guest/);
  assert.match(prototype, /Play at the old tree/);
  assert.match(prototype, /Old tree/);
  assert.match(world, /resolveTreePlayHit/);
  assert.match(world, /beginTreePlay/);
  assert.match(world, /beginTreeReturn/);
  assert.match(world, /finishTreeReturn/);
  assert.match(world, /resolveTreeReturnHit/);
  assert.match(canvas, /beginTreeReturn/);
  assert.match(canvas, /resolveTreeReturnHit/);
  assert.match(prototype, /Choose the landing/);
  assert.match(prototype, /Landing choice/);
  assert.match(world, /tree-perch/);
  assert.match(canvas, /"tree-play"/);
  assert.match(prototype, /beginPetReunion/);
  assert.match(world, /reunion-notice/);
  assert.match(world, /reunion-approach/);
  assert.match(world, /reunion-greet/);
  assert.match(prototype, /Visitor acting/);
  assert.match(prototype, /Habitat acting/);
  assert.match(prototype, /Pet \{state\.name\}/);
  assert.match(prototype, /Body contact/);
  assert.match(prototype, /data-testid="world-action-output"/);
  assert.match(prototype, /data-testid="attention-output"/);
  assert.match(prototype, /shouldShowSceneNarration/);
  assert.match(prototype, /scene-caption/);
  assert.match(prototype, /scene-announcer/);
  assert.match(prototype, /scene-announcer-\$\{sceneNarration\?\.serial \?\? 0\}/);
  assert.match(prototype, /clearSceneNarration/);
  assert.match(prototype, /rainGuestOwnsScene/);
  assert.match(prototype, /wildlifeOwnsScene/);
  assert.match(prototype, /data-reduced-motion/);
  assert.doesNotMatch(prototype, /Catch it—or watch|Touch the puddle before it settles/);
  assert.doesNotMatch(prototype, /pet-message/);
  assert.match(world, /GuardianWakePhase/);
  assert.match(world, /resolveGuardianWakePresentation/);
  assert.match(canvas, /drawGuardianWake/);
  assert.match(prototype, /Guardian wake/);
  assert.match(world, /AfterRainPhase/);
  assert.match(world, /puddle-splash/);
  assert.match(world, /PetDaylightPhase/);
  assert.match(world, /night-rest/);
  assert.match(world, /TwilightEchoPresentation/);
  assert.match(world, /resolveTwilightEchoPresentation/);
  assert.match(canvas, /drawTwilightEcho/);
  assert.match(canvas, /worldCommand\.source/);
  assert.match(prototype, /Twilight echo/);
  assert.match(prototype, /The day is coming home/);
  assert.match(prototype, /world-first-capability/);
  assert.match(prototype, /world-dock/);
  assert.match(prototype, /Care changes Moss\. Nothing can be lost\./);
  assert.doesNotMatch(prototype, /memory-dots|of 8 care moments/);
  assert.match(prototype, /Let the little world answer/);
  assert.match(prototype, /worldAnswering/);
  assert.match(prototype, /Touch the new bloom/);
  assert.match(prototype, /Touch the still light/);
  assert.match(prototype, /Touch the paired seedheads/);
  assert.match(prototype, /careEchoSource/);
  assert.match(prototype, /onCareEcho/);
  assert.doesNotMatch(prototype, /Give today’s care/);
  assert.match(prototype, /Let the next morning arrive/);
  assert.match(prototype, /Advance prototype time · nothing is lost/);
  assert.match(prototype, /resolvePrototypeDayPhase/);
  assert.match(prototype, /Hand guide/);
  assert.match(prototype, /Reach layer/);
  assert.match(prototype, /Wind episode/);
  assert.match(prototype, /The meadow remembers/);
  assert.match(prototype, /Life echoes/);
  assert.match(prototype, /Wind leaf/);
  assert.match(prototype, /Flight profile/);
  assert.match(prototype, /Leaf position/);
  assert.match(prototype, /Catch point/);
  assert.match(prototype, /Camera shot/);
  assert.match(prototype, /Soundscape/);
  assert.match(prototype, /Audio mix/);
  assert.match(prototype, /Living day/);
  assert.match(prototype, /Evolution phase/);
  assert.match(prototype, /Engine inspector/);
  assert.match(prototype, /Complete a To-do/);
  assert.match(prototype, /Focus with \{state\.name\}/);
  assert.match(prototype, /Play with family or a friend/);
  assert.match(prototype, /External Kwilt receipts/);
  assert.match(prototype, /resting-world-dock/);
  assert.match(prototype, /kwilt-pixel-pet-world-memory-v1/);
  assert.match(prototype, /restorePetWorldMemory/);
  assert.match(prototype, /serializePetWorldMemory/);
  assert.match(prototype, /initialWorld/);
  assert.match(prototype, /Weather study controls/);
  assert.match(prototype, /Advance one day/);
  assert.match(prototype, /Reset prototype/);
  assert.match(prototype, /Portable Pet runtime output/);
  assert.match(prototype, /Ground contact/);
  assert.match(prototype, /Ground anchor/);
  assert.match(prototype, /Ground cue/);
  assert.match(prototype, /Drawing role/);
  assert.match(prototype, /Anatomy layers/);
  assert.match(prototype, /Canvas 2D/);
  assert.match(engine, /width: 160, height: 240/);
  assert.match(engine, /MOTION_CLIPS/);
  assert.match(evolution, /previousStageFor/);
  assert.match(evolution, /resolveEvolutionComposition/);
  assert.match(habitat, /leafling-habitat-backdrop-v1\.png/);
  assert.match(habitat, /leafling-shelter-tree-v1\.png/);
  assert.match(habitat, /leafling-meadow-foreground-v1\.png/);
  assert.match(habitat, /weatherBakedIn: false/);
  assert.match(habitatPerformance, /trunkRotation: 0/);
  assert.match(habitatPerformance, /grassLean/);
  assert.match(habitatPerformance, /vineLag/);
  assert.match(affection, /resolvePetContactGesture/);
  assert.match(affection, /isPetContactHit/);
  assert.match(canvas, /drawAuthoredHabitatPerformance/);
  assert.match(canvas, /drawAffectionContact/);
  assert.match(canvas, /kind: "affection"/);
  assert.match(canvas, /if \(contactGesture !== "tap"\) return/);
  assert.doesNotMatch(canvas, /if \(gestureMovedRef\.current\) return/);
  assert.match(world, /stepPetWorld/);
  assert.match(world, /spawnVisitor/);
  assert.match(world, /sky-moth/);
  assert.match(world, /setWorldWeather/);
  assert.match(world, /weatherPhase/);
  assert.match(world, /weatherIntensity/);
  assert.match(world, /weatherResponsePending/);
  assert.match(world, /weather-notice/);
  assert.match(world, /wind-brace/);
  assert.match(world, /rain-flinch/);
  assert.match(world, /plantProgressBloom/);
  assert.match(world, /resolveCareEchoHit/);
  assert.match(world, /CARE_ECHO_TARGET/);
  assert.match(world, /holdCareEcho/);
  assert.match(world, /bloom-notice/);
  assert.match(world, /admire-bloom/);
  assert.match(world, /beginMemoryVisit/);
  assert.match(world, /beginTreeRest/);
  assert.match(world, /resolveCinematicShot/);
  assert.match(world, /cameraControlRemainingMs/);
  assert.match(livingDay, /stepLivingDayDirector/);
  assert.match(livingDay, /quietBetweenEpisodesMs/);
  assert.match(plaything, /createWindLeaf/);
  assert.match(plaything, /releaseWindLeaf/);
  assert.match(plaything, /resolveWindLeafFlightProfile/);
  assert.match(plaything, /stepWindLeaf/);
  assert.match(world, /grabWorldWindLeaf/);
  assert.match(world, /tossWorldWindLeaf/);
  assert.match(world, /guideWorldWithHand/);
  assert.match(world, /releaseWorldHandGuide/);
  assert.match(world, /hand-pounce/);
  assert.match(world, /hand-aerial/);
  assert.match(soundscape, /resolveSoundscapeMix/);
  assert.match(soundscape, /BrowserPetSoundscape/);
  assert.match(soundscape, /playVisitorCue/);
  assert.match(leafling, /sun-bask/);
  assert.match(world, /beginCompanionFocus/);
  assert.match(runtime, /resolvePetFrame/);
  assert.match(runtime, /nextFrameElapsed/);
  assert.match(runtime, /PetFrameLayer/);
  assert.match(leafling, /leafling-motion-atlas-v5\.png/);
  assert.match(leafling, /leafling-stage-atlas-v3\.png/);
  assert.match(leafling, /leafling-stage-atlas-v4\.png/);
  assert.match(leafling, /leaflingManifestForStage/);
  assert.match(leafling, /"tail"/);
  assert.match(leafling, /idle/);
  assert.match(leafling, /greet/);
  assert.match(leafling, /walk/);
  assert.match(leafling, /run/);
  assert.match(leafling, /jump/);
  assert.match(leafling, /pounce/);
  assert.match(leafling, /rollover/);
  assert.match(canvas, /imageSmoothingEnabled = false/);
  assert.match(canvas, /resolvePetFrame/);
  assert.match(canvas, /drawWindLeaf/);
  assert.match(canvas, /drawHandMote/);
  assert.match(canvas, /isWindLeafHit/);
  assert.match(canvas, /previousSprite/);
  assert.match(canvas, /drawEvolutionMotes/);
  assert.match(canvas, /resolveFocusAtmosphere/);
  assert.match(canvas, /drawFocusStillness/);
  assert.match(canvas, /-snapshot\.anchor\.y \* scaleY/);
  assert.match(canvas, /onPointerDown/);
  assert.match(canvas, /setWorldZoom/);
  assert.match(canvas, /nextWeatherKind/);
  assert.match(canvas, /drawProgressBlooms/);
  assert.match(canvas, /drawCareEchoInvitation/);
  assert.match(canvas, /resolveCareEchoHit/);
  assert.match(canvas, /holdCareEcho/);
  assert.match(canvas, /plantLifeEcho/);
  assert.match(canvas, /initialWorld/);
  assert.doesNotMatch(canvas, /context\.rotate\(\(world\.weatherSway \* Math\.PI\)/);
  assert.match(canvas, /layer\.masks/);
});
