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
  assert.match(html, /<title>Pet Engine Study 32 — Kwilt Lab<\/title>/i);
  assert.match(html, /Starting the Pet engine/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("removes starter infrastructure and exposes the portable engine study", async () => {
  const [page, layout, prototype, engine, evolution, habitat, world, livingDay, plaything, soundscape, runtime, leafling, canvas] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PetPrototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-evolution.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/pet-habitat.ts", import.meta.url), "utf8"),
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
  assert.match(layout, /Pet Engine Study 32 — Kwilt Lab/);
  assert.match(layout, /og-study-32\.png/);
  assert.match(prototype, /Pet Engine Study 32/);
  assert.match(prototype, /Make the meadow<br \/>answer\./i);
  assert.match(prototype, /landing travel through the world/i);
  assert.match(world, /GuardianWakePhase/);
  assert.match(world, /resolveGuardianWakePresentation/);
  assert.match(canvas, /drawGuardianWake/);
  assert.match(prototype, /Guardian wake/);
  assert.match(world, /AfterRainPhase/);
  assert.match(world, /puddle-splash/);
  assert.match(world, /PetDaylightPhase/);
  assert.match(world, /night-rest/);
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
  assert.match(prototype, /Focus together/);
  assert.match(prototype, /Play together/);
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
