import assert from "node:assert/strict";
import test from "node:test";

import {
  LIVING_DAY,
  createLivingDayDirector,
  interruptLivingDay,
  stepLivingDayDirector,
  type LivingDayObservation,
} from "../lib/pet-life-director.ts";

function quietObservation(overrides: Partial<LivingDayObservation> = {}): LivingDayObservation {
  return {
    stage: "baby",
    petX: 240,
    bloomXs: [],
    action: "idle",
    focusActive: false,
    visitorActive: false,
    weather: "sunny",
    weatherPhase: "settled",
    ceremonyActive: false,
    ...overrides,
  };
}

test("the living-day director leaves calm space before composing one scene", () => {
  const initial = createLivingDayDirector();
  const stillQuiet = stepLivingDayDirector(initial, quietObservation(), LIVING_DAY.initialQuietMs - 1);
  const started = stepLivingDayDirector(stillQuiet.state, quietObservation(), 1);

  assert.equal(stillQuiet.command, null);
  assert.deepEqual(started.command, { kind: "roam", targetX: 284 });
  assert.equal(started.state.activeEpisode, "roam");

  const whileMoving = stepLivingDayDirector(
    started.state,
    quietObservation({ action: "walk" }),
    9000,
  );
  assert.equal(whileMoving.command, null, "one scene must finish before another can begin");

  const finished = stepLivingDayDirector(whileMoving.state, quietObservation(), 16);
  assert.equal(finished.state.activeEpisode, null);
  assert.equal(finished.state.episodeIndex, 1);
  assert.equal(finished.state.quietElapsedMs, 0);
});

test("maturity expands autonomous roaming without changing the world bounds", () => {
  const ready = { ...createLivingDayDirector(), quietElapsedMs: LIVING_DAY.initialQuietMs };
  const baby = stepLivingDayDirector(ready, quietObservation({ stage: "baby" }), 0);
  const young = stepLivingDayDirector(ready, quietObservation({ stage: "young" }), 0);
  const guardian = stepLivingDayDirector(ready, quietObservation({ stage: "guardian" }), 0);
  const edge = stepLivingDayDirector(ready, quietObservation({ stage: "guardian", petX: 430 }), 0);

  assert.deepEqual(baby.command, { kind: "roam", targetX: 284 });
  assert.deepEqual(young.command, { kind: "roam", targetX: 316 });
  assert.deepEqual(guardian.command, { kind: "roam", targetX: 350 });
  assert.deepEqual(edge.command, { kind: "roam", targetX: 320 });
});

test("a remembered bloom becomes part of the Pet's next living-day sequence", () => {
  const readyForSecondEpisode = {
    ...createLivingDayDirector(),
    episodeIndex: 1,
    quietElapsedMs: LIVING_DAY.quietBetweenEpisodesMs,
  };
  const withMemory = stepLivingDayDirector(
    readyForSecondEpisode,
    quietObservation({ bloomXs: [118, 332] }),
    0,
  );
  const emptyMeadow = stepLivingDayDirector(readyForSecondEpisode, quietObservation(), 0);

  assert.deepEqual(withMemory.command, { kind: "visit-bloom", bloomX: 332 });
  assert.deepEqual(emptyMeadow.command, { kind: "tree-rest" });
});

test("deliberate interaction interrupts ambient direction and earns fresh quiet", () => {
  const active = {
    ...createLivingDayDirector(),
    activeEpisode: "tree-rest" as const,
    quietElapsedMs: 0,
  };
  const interrupted = interruptLivingDay(active);
  const blocked = stepLivingDayDirector(
    interrupted,
    quietObservation({ focusActive: true, action: "focus" }),
    LIVING_DAY.quietBetweenEpisodesMs * 2,
  );
  const justReturned = stepLivingDayDirector(
    blocked.state,
    quietObservation(),
    LIVING_DAY.quietBetweenEpisodesMs - 1,
  );

  assert.equal(interrupted.activeEpisode, null);
  assert.equal(interrupted.episodeIndex, 1);
  assert.equal(blocked.state.quietElapsedMs, 0, "Focus time cannot advance an ambient clock");
  assert.equal(justReturned.command, null);
});

test("weather and wildlife share the same authored sequence instead of racing timers", () => {
  const visitorReady = {
    ...createLivingDayDirector(),
    episodeIndex: 3,
    quietElapsedMs: LIVING_DAY.quietBetweenEpisodesMs,
  };
  const weatherReady = { ...visitorReady, episodeIndex: 4 };

  assert.deepEqual(
    stepLivingDayDirector(visitorReady, quietObservation(), 0).command,
    { kind: "visitor" },
  );
  assert.deepEqual(
    stepLivingDayDirector(weatherReady, quietObservation(), 0).command,
    { kind: "weather" },
  );
});

test("a settled rainy shelter scene directs the next weather change before roaming", () => {
  const ready = { ...createLivingDayDirector(), quietElapsedMs: LIVING_DAY.initialQuietMs };
  const rainy = stepLivingDayDirector(
    ready,
    quietObservation({ weather: "rain", action: "shelter" }),
    0,
  );

  assert.deepEqual(rainy.command, { kind: "weather" });
});
