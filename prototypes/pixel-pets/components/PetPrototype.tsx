"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PetEngineCanvas, type PetWorldCommand } from "./PetEngineCanvas";
import { previousStageFor, resolveEvolutionComposition } from "@/lib/pet-evolution";
import { clipForMotion, resolveGroundCue, type EngineMotion } from "@/lib/pet-engine";
import {
  createPetWorldState,
  resolveFocusAtmosphere,
  restorePetWorldMemory,
  serializePetWorldMemory,
  type PetWorldAction,
  type PetWorldState,
} from "@/lib/pet-world";
import { LEAFLING_PRESENTATION, leaflingManifestForStage } from "@/lib/leafling";
import { createLivingDayDirector, type LivingDayDirectorState } from "@/lib/pet-life-director";
import { VISITOR_PERFORMANCE_CLIPS, resolveVisitorPerformance } from "@/lib/pet-visitor-performance";
import {
  resolveWorldInteractionMessage,
  shouldShowSceneNarration,
} from "@/lib/pet-world-message";
import { clipDuration, nextFrameElapsed, type PetAnimationClip, type PetFrameSnapshot } from "@/lib/pet-runtime";
import { BrowserPetSoundscape, resolveSoundscapeMix } from "@/lib/pet-soundscape";
import {
  advancePrototypeDay,
  completeMeaningfulAction,
  createPetState,
  giveCare,
  resolvePrototypeDayPhase,
  type MeaningfulAction,
  type PetPalette,
  type PetReaction,
  type PetStage,
  type PetState,
  withReaction,
} from "@/lib/pet-state";

const STORAGE_KEY = "kwilt-pixel-pet-engine-proof-v4";
const WORLD_MEMORY_STORAGE_KEY = "kwilt-pixel-pet-world-memory-v1";

const PALETTES: Array<{ id: PetPalette; label: string }> = [
  { id: "moss", label: "Moss" },
  { id: "lagoon", label: "Lagoon" },
  { id: "ember", label: "Ember" },
  { id: "clay", label: "Clay" },
  { id: "sky", label: "Sky" },
];

const MOTIONS: Array<{ id: EngineMotion; label: string }> = [
  { id: "idle", label: "Idle" },
  { id: "blink", label: "Blink" },
  { id: "greet", label: "Greet" },
  { id: "care", label: "Care" },
  { id: "discover", label: "Discover" },
  { id: "sleep", label: "Sleep" },
  { id: "evolve", label: "Evolve" },
  { id: "jump", label: "Jump" },
  { id: "pounce", label: "Pounce" },
  { id: "rollover", label: "Rollover" },
];

const REACTION_MOTION: Record<PetReaction, EngineMotion> = {
  idle: "idle",
  greet: "greet",
  eat: "care",
  discover: "discover",
  sleep: "sleep",
  evolve: "evolve",
};

const MOTION_SOUND: Record<EngineMotion, PetReaction> = {
  idle: "idle",
  blink: "idle",
  greet: "greet",
  care: "eat",
  discover: "discover",
  sleep: "sleep",
  evolve: "evolve",
  jump: "greet",
  pounce: "discover",
  rollover: "sleep",
};

function nudge() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(18);
}

export function PetPrototype() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PetState>(() => createPetState("leafling", "Moss", "moss"));
  const [previewMotion, setPreviewMotion] = useState<EngineMotion | null>(null);
  const [previewStage, setPreviewStage] = useState<PetStage | null>(null);
  const [paused, setPaused] = useState(false);
  const [manualElapsed, setManualElapsed] = useState(0);
  const [showRig, setShowRig] = useState(false);
  const [frame, setFrame] = useState<PetFrameSnapshot | null>(null);
  const [world, setWorld] = useState<PetWorldState>(() => createPetWorldState());
  const [livingDay, setLivingDay] = useState<LivingDayDirectorState>(() => createLivingDayDirector());
  const [worldMessage, setWorldMessage] = useState<{ title: string; detail: string } | null>(null);
  const [sceneNarration, setSceneNarration] = useState<{ title: string; detail: string; serial: number } | null>(null);
  const [worldCommand, setWorldCommand] = useState<PetWorldCommand | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const narrationTimer = useRef<number | null>(null);
  const narrationSerial = useRef(0);
  const focusCompletionHandled = useRef(false);
  const soundscapeRef = useRef<BrowserPetSoundscape | null>(null);
  const lastVisitorRef = useRef<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setState(JSON.parse(saved) as PetState);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      try {
        const savedWorldMemory = window.localStorage.getItem(WORLD_MEMORY_STORAGE_KEY);
        if (savedWorldMemory) {
          setWorld(restorePetWorldMemory(createPetWorldState(), JSON.parse(savedWorldMemory)));
        }
      } catch {
        window.localStorage.removeItem(WORLD_MEMORY_STORAGE_KEY);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const worldMemorySignature = JSON.stringify(serializePetWorldMemory(world));
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(WORLD_MEMORY_STORAGE_KEY, worldMemorySignature);
  }, [hydrated, worldMemorySignature]);

  useEffect(() => () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    if (narrationTimer.current) window.clearTimeout(narrationTimer.current);
    soundscapeRef.current?.dispose();
  }, []);

  useEffect(() => {
    const focus = resolveFocusAtmosphere(world.focus, state.reducedMotion);
    soundscapeRef.current?.update(resolveSoundscapeMix({
      enabled: state.soundEnabled,
      weather: world.weather,
      weatherIntensity: world.weatherIntensity,
      focusHush: focus.hush,
      visitor: world.visitor.active ? world.visitor.kind : null,
    }));
  }, [state.reducedMotion, state.soundEnabled, world.focus, world.visitor.active, world.visitor.kind, world.weather, world.weatherIntensity]);

  useEffect(() => {
    const visitorKey = world.visitor.active ? `${world.visitor.kind}:${world.visitor.ageMs > 0 ? "moving" : "new"}` : null;
    if (world.visitor.active && lastVisitorRef.current === null && state.soundEnabled) {
      soundscapeRef.current?.playVisitorCue(world.visitor.kind);
    }
    lastVisitorRef.current = visitorKey;
  }, [state.soundEnabled, world.visitor.active, world.visitor.ageMs, world.visitor.kind]);

  function soundscape() {
    if (!soundscapeRef.current) soundscapeRef.current = new BrowserPetSoundscape();
    return soundscapeRef.current;
  }

  function currentSoundscapeMix(enabled = state.soundEnabled) {
    const focus = resolveFocusAtmosphere(world.focus, state.reducedMotion);
    return resolveSoundscapeMix({
      enabled,
      weather: world.weather,
      weatherIntensity: world.weatherIntensity,
      focusHush: focus.hush,
      visitor: world.visitor.active ? world.visitor.kind : null,
    });
  }

  function beginSoundscape() {
    if (!state.soundEnabled) return;
    const controller = soundscape();
    controller.update(currentSoundscapeMix());
    void controller.start();
  }

  const playPetCue = useCallback((reaction: PetReaction, stage: PetStage = state.stage) => {
    if (!state.soundEnabled) return;
    if (!soundscapeRef.current) soundscapeRef.current = new BrowserPetSoundscape();
    const controller = soundscapeRef.current;
    const focus = resolveFocusAtmosphere(world.focus, state.reducedMotion);
    controller.update(resolveSoundscapeMix({
      enabled: true,
      weather: world.weather,
      weatherIntensity: world.weatherIntensity,
      focusHush: focus.hush,
      visitor: world.visitor.active ? world.visitor.kind : null,
    }));
    void controller.start().then((started) => {
      if (started) controller.playPetCue(stage, reaction);
    });
  }, [state.reducedMotion, state.soundEnabled, state.stage, world.focus, world.visitor.active, world.visitor.kind, world.weather, world.weatherIntensity]);

  const settle = useCallback((delay = 1250) => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => {
      setPreviewMotion(null);
      setPaused(false);
      setManualElapsed(0);
      setState((current) => withReaction(current, "idle"));
    }, delay);
  }, []);

  const settleAfterMotion = useCallback((motion: EngineMotion, stage: PetStage = state.stage, hold = 220) => {
    const clip = leaflingManifestForStage(stage).clips[clipForMotion(motion)];
    if (!clip.loop) settle(clipDuration(clip) + hold);
  }, [settle, state.stage]);

  useEffect(() => {
    if (!world.focus.completed || focusCompletionHandled.current) return;
    focusCompletionHandled.current = true;
    const next = completeMeaningfulAction(state, "focus");
    setState(next);
    setWorldCommand((current) => ({ serial: (current?.serial ?? 0) + 1, type: "focus-memory" }));
    playPetCue("discover", next.stage);
    nudge();
    settleAfterMotion("discover");
  }, [playPetCue, settleAfterMotion, state, world.focus.completed]);

  function complete(source: MeaningfulAction) {
    const next = completeMeaningfulAction(state, source);
    setState(next);
    if (source === "todo") commandWorld("todo-memory");
    playPetCue("discover", next.stage);
    nudge();
    settleAfterMotion("discover");
  }

  function care() {
    const next = giveCare(state);
    setState(next);
    setWorldMessage(next.reaction === "evolve"
      ? { title: next.stage === "guardian" ? "A Guardian arrives" : "Growing before your eyes", detail: next.lastReceipt }
      : { title: "Today is cared for", detail: next.lastReceipt });
    playPetCue(next.reaction, next.stage);
    commandWorld("evening");
    nudge();
    settleAfterMotion(REACTION_MOTION[next.reaction], next.stage);
  }

  function advanceDay() {
    const next = advancePrototypeDay(state);
    setState(next);
    commandWorld("morning");
    setWorldMessage({ title: "A new morning", detail: `${state.name} wakes to a fresh day. Nothing was lost overnight.` });
    playPetCue("greet", next.stage);
    nudge();
    settleAfterMotion("greet", next.stage);
  }

  function focusTogether() {
    focusCompletionHandled.current = false;
    commandWorld("focus");
    setWorldMessage({ title: `Focusing with ${state.name}`, detail: "The little world is settling with you for fifteen quiet seconds." });
  }

  function playTogether() {
    complete("play");
    commandWorld("play");
    setWorldMessage({ title: "A shared spark", detail: "Playing together stirred the breeze and brought a tiny visitor." });
  }

  function preview(motion: EngineMotion) {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setPreviewMotion(motion);
    setPaused(false);
    setManualElapsed(0);
    if (motion !== "idle" && motion !== "blink") {
      playPetCue(MOTION_SOUND[motion], currentStage);
    }
    settleAfterMotion(motion);
  }

  const currentMotion = previewMotion ?? REACTION_MOTION[state.reaction];
  const currentClip = clipForMotion(currentMotion);
  const renderedClip = frame?.clip ?? currentClip;
  const currentStage = previewStage ?? state.stage;
  const evolutionFromStage = currentMotion === "evolve" ? previousStageFor(currentStage) : null;
  const evolutionComposition = evolutionFromStage && frame
    ? resolveEvolutionComposition(frame.progress, state.reducedMotion)
    : null;
  const visitorLabel = currentStage === "baby"
    ? "moss crawler"
    : currentStage === "young"
      ? "firefly"
      : "sky moth";
  const currentManifest = leaflingManifestForStage(currentStage);
  const currentAnimation = currentManifest.clips[renderedClip] as PetAnimationClip;
  const currentScale = LEAFLING_PRESENTATION.stages[currentStage].height / currentManifest.atlas.frameHeight;
  const currentGroundCue = frame
    ? resolveGroundCue(frame.contact, frame.shadow.width, frame.shadow.opacity, currentScale)
    : null;
  const focusAtmosphere = resolveFocusAtmosphere(world.focus, state.reducedMotion);
  const soundscapeMix = currentSoundscapeMix();
  const visitorPerformance = world.visitor.active
    ? resolveVisitorPerformance(world.visitor, world.weather, state.reducedMotion)
    : null;
  const growthTitle = state.stage === "guardian"
    ? "Guardian form"
    : state.stage === "young"
      ? "Young form · still becoming"
      : "Baby form · still becoming";
  const growthDetail = state.stage === "guardian"
    ? "Powerful, playful, and still Moss."
    : state.stage === "young"
      ? "New reach, same Moss. Care is remembered."
      : "Care changes Moss. Nothing can be lost.";
  const careEchoCopy = state.pendingSource === "focus"
    ? { title: "Touch the still light", detail: "The quiet place your Focus left is ready." }
    : state.pendingSource === "play"
      ? { title: "Touch the paired seedheads", detail: "The meadow kept the spark you shared." }
      : { title: "Touch the new bloom", detail: "What you moved forward has taken root." };
  const dayHasCare = state.caredPrototypeDay === state.prototypeDay;
  const dayPhase = resolvePrototypeDayPhase(state);
  const bloomAnswering = ["bloom-notice", "seek-bloom", "admire-bloom"].includes(world.action);
  const playAnswering = world.visitor.active || ["track", "pounce", "aerial-pounce"].includes(world.action);
  const worldAnswering = state.careAvailable && (
    (state.pendingSource === "todo" && bloomAnswering)
    || (state.pendingSource === "focus" && bloomAnswering)
    || (state.pendingSource === "play" && playAnswering)
  );
  const worldAnswerDetail = state.pendingSource === "focus"
    ? `${state.name} is noticing the still light your Focus left behind.`
    : state.pendingSource === "play"
      ? `${state.name} is following the little spark that play brought in.`
      : `${state.name} is going to see what took root.`;
  const currentStatus = useMemo(() => {
    if (state.reaction === "evolve") return {
      title: state.stage === "guardian" ? "A Guardian arrives" : "Growing before your eyes",
      detail: state.lastReceipt,
    };
    if (world.guardianWake.phase === "released") return {
      title: "The meadow answered",
      detail: `The air ${state.name} carried touched the ground and traveled through the grass.`,
    };
    if (worldMessage) return worldMessage;
    if (state.careAvailable) return { title: "A care moment is ready", detail: state.lastReceipt };
    if (dayHasCare) return { title: "Cozy and cared for", detail: state.lastReceipt };
    return { title: "Quietly keeping you company", detail: state.lastReceipt };
  }, [dayHasCare, state.careAvailable, state.lastReceipt, state.name, state.reaction, state.stage, world.guardianWake.phase, worldMessage]);
  const handleFrame = useCallback((snapshot: PetFrameSnapshot) => setFrame(snapshot), []);
  const handleWorldFrame = useCallback((snapshot: PetWorldState) => setWorld(snapshot), []);
  function showSceneNarration(message: { title: string; detail: string }) {
    if (narrationTimer.current) window.clearTimeout(narrationTimer.current);
    narrationSerial.current += 1;
    setSceneNarration({ ...message, serial: narrationSerial.current });
    narrationTimer.current = window.setTimeout(() => {
      setSceneNarration(null);
      narrationTimer.current = null;
    }, 2800);
  }

  function clearSceneNarration() {
    if (narrationTimer.current) window.clearTimeout(narrationTimer.current);
    narrationTimer.current = null;
    setSceneNarration(null);
  }

  function handleWorldInteraction(action: PetWorldAction, worldSnapshot: PetWorldState) {
    beginSoundscape();
    const narrationContext = { focusActive: worldSnapshot.focus.active };
    const contextualMessage = resolveWorldInteractionMessage(action, {
      focusActive: worldSnapshot.focus.active,
      name: state.name,
    });
    if (contextualMessage) {
      setWorldMessage(contextualMessage);
      if (shouldShowSceneNarration(action, narrationContext)) showSceneNarration(contextualMessage);
      return;
    }
    const messages: Partial<Record<PetWorldAction, { title: string; detail: string }>> = {
      greet: { title: "A little hello", detail: `${state.name} noticed you.` },
      track: { title: "Ears up", detail: `Something caught ${state.name}’s eye.` },
      "hand-track": { title: "Your hand entered the world", detail: `${state.name} noticed before taking a single step.` },
      "hand-walk": { title: "Coming closer", detail: `${state.name} is following without becoming a cursor.` },
      "hand-run": { title: "Wait for me", detail: `${state.name} opened into a real run to close the distance.` },
      "hand-pounce": { title: "A new layer", detail: `${state.name} can reach the light with one committed bound.` },
      "hand-aerial": { title: "The sky opened", detail: currentStage === "guardian" ? `${state.name} gathered the meadow’s loose air into one committed flight.` : `${state.name} read the height, launched, and chose one landing.` },
      "hand-found": { title: worldSnapshot.guardianWake.phase === "released" ? "The meadow answered" : "There you are", detail: worldSnapshot.guardianWake.phase === "released" ? `The air ${state.name} carried touched the ground and traveled through the grass.` : `${state.name} found the last place your hand left light.` },
      "guardian-land": { title: "The meadow answered", detail: `The air ${state.name} carried touched the ground and traveled through the grass.` },
      "weather-notice": { title: "The air changed", detail: `${state.name} felt it before the weather arrived.` },
      "wind-brace": { title: "Holding steady", detail: `Paws down. Leaves back. ${state.name} is reading the gust.` },
      "leaf-invite": { title: "The wind found the toy", detail: `A gust loosened the golden leaf. ${state.name} watched its bright path through the grass.` },
      "rain-flinch": { title: "First drops", detail: `${state.name} shakes once, then looks for cover.` },
      "bloom-notice": { title: "Something took root", detail: `${state.name} noticed the meadow answer.` },
      "seek-bloom": { title: "Going to see", detail: `${state.name} is padding toward the new bloom.` },
      "admire-bloom": { title: "The meadow remembers", detail: "One real thing moved forward, and the little world kept it beautifully." },
      "memory-notice": { title: "Something familiar", detail: `${state.name} remembered a place that changed.` },
      "seek-memory": { title: "Padding back", detail: `${state.name} is returning to a bloom from your life.` },
      remember: { title: "A quiet memory", detail: `${state.name} stopped beside something you helped grow.` },
      "seek-rest": { title: "A favorite place", detail: `${state.name} is wandering toward the old tree.` },
      rest: { title: "A small pause", detail: `${state.name} curled up because this is home, not because anything is wrong.` },
      walk: { title: "Off we go", detail: `${state.name} is padding over.` },
      run: { title: "Coming fast", detail: `${state.name} is racing over.` },
      jump: { title: "Almost!", detail: `${state.name} reached for your finger.` },
      pounce: { title: "Couldn’t resist", detail: "That tiny visitor looked interesting." },
      "aerial-pounce": { title: "Above the meadow", detail: `${state.name} read the sky moth’s path and reached high.` },
      "leaf-track": { title: "Following your hand", detail: `${state.name} is reading every turn of the golden leaf.` },
      "seek-leaf": { title: "The chase is on", detail: `${state.name} saw where the wind leaf came down.` },
      "leaf-pounce": { title: "A playful opening", detail: `${state.name} committed to one grounded catch.` },
      "leaf-aerial": { title: "Meet it in the air", detail: `${state.name} found the leaf’s path above the meadow.` },
      "leaf-catch": { title: "Caught together", detail: "One toss, one delighted little answer, then the meadow grows quiet again." },
      "puddle-notice": { title: "The rain left a glint", detail: `${state.name} noticed that the meadow is still holding a little sky.` },
      "puddle-invite": { title: "Something to splash", detail: `Rain gathered the sky into one bright place at ${state.name}’s feet.` },
      "seek-puddle": { title: "Couldn’t resist", detail: `${state.name} is finding the wet ground before committing.` },
      "puddle-splash": { title: "After the rain", detail: "One grounded pounce sent the clearing light everywhere." },
      rollover: { title: `Olive taught ${state.name} a trick`, detail: "A complete, leafy rollover." },
      shelter: { title: "Safe under the leaves", detail: `Rain can pass. ${state.name} found a quiet place to curl up.` },
      "seek-sun": { title: "Following the warmth", detail: `${state.name} noticed the sunny part of the meadow.` },
      bask: { title: "Warm leaves", detail: `${state.name} is soaking up a little sun.` },
      "seek-shade": { title: "Warm enough", detail: `${state.name} is heading back to the old tree.` },
      shade: { title: "Cool under the canopy", detail: `${state.name} curled up where the leaves make shade.` },
      focus: { title: "Quiet company", detail: `${state.name} is focusing beside you.` },
    };
    const message = messages[action] ?? null;
    setWorldMessage(message);
    if (message && shouldShowSceneNarration(action, narrationContext)) showSceneNarration(message);
  }

  function commandWorld(type: PetWorldCommand["type"]) {
    beginSoundscape();
    setWorldCommand((current) => ({ serial: (current?.serial ?? 0) + 1, type }));
  }

  function toggleSoundscape() {
    const enabled = !state.soundEnabled;
    setState({ ...state, soundEnabled: enabled });
    if (enabled) {
      const controller = soundscape();
      controller.update(currentSoundscapeMix(true));
      void controller.start();
    } else {
      soundscapeRef.current?.update(currentSoundscapeMix(false));
    }
  }

  if (!hydrated) {
    return (
      <main className="prototype-shell loading-shell" aria-live="polite">
        <span className="loading-pixel" />
        <p>Starting the Pet engine…</p>
      </main>
    );
  }

  return (
    <main className="engine-lab" data-palette={state.palette} data-reduced-motion={state.reducedMotion}>
      <header className="engine-intro">
        <span className="eyebrow">Kwilt Lab · Pet Engine Study 35</span>
        <h1>Everything alive.<br />Has acting.</h1>
        <p>
          Watch a crawler carry weight, a firefly breathe light, and a sky moth bank before Moss gives chase.
        </p>
        <dl className="engine-facts">
          <div><dt>Body</dt><dd>carries weight</dd></div>
          <div><dt>Wings</dt><dd>hold and strike</dd></div>
          <div><dt>Weather</dt><dd>changes material</dd></div>
        </dl>
      </header>

      <section className="capability-frame world-first-capability" aria-label={`${state.name}'s Pet capability`}>
        <header className="capability-header">
          <div>
            <span className="device-label">Day {state.prototypeDay}</span>
            <span className="pet-identity-line">
              <strong>{state.name}</strong>
              <span className="weather-label">{world.weather}{world.weatherPhase === "arriving" ? " arriving" : ""}</span>
            </span>
          </div>
          <button
            type="button"
            className="sound-button"
            aria-label={state.soundEnabled ? "Mute Pet sounds" : "Turn on Pet sounds"}
            onClick={toggleSoundscape}
          >
            {state.soundEnabled ? "♪" : "♪̸"}
          </button>
        </header>

        <div className="scene-frame">
          <PetEngineCanvas
            initialWorld={world}
            stage={currentStage}
            evolutionFromStage={evolutionFromStage}
            palette={state.palette}
            motion={currentMotion}
            reducedMotion={state.reducedMotion}
            paused={paused}
            manualElapsed={manualElapsed}
            showRig={showRig}
            previewing={previewMotion !== null}
            worldCommand={worldCommand}
            onFrame={handleFrame}
            onWorldFrame={handleWorldFrame}
            onLivingDayFrame={setLivingDay}
            onWorldInteraction={handleWorldInteraction}
            careEchoSource={dayPhase === "care-ready" && !worldAnswering ? state.pendingSource : null}
            onCareEcho={care}
            label={`${state.name}'s interactive world. Draw one finger upward through the meadow to discover how ${state.name}'s reach grows, drag the golden leaf to play, tap to move, tap high to jump, pinch to zoom, or swipe across ${state.name} for a rollover.`}
          />
          {sceneNarration ? (
            <div key={sceneNarration.serial} className="scene-caption" aria-hidden="true">
              <strong>{sceneNarration.title}</strong>
              <span>{sceneNarration.detail}</span>
            </div>
          ) : null}
        </div>

        <div key={`scene-announcer-${narrationSerial.current}`} className="scene-announcer" aria-live="polite" aria-atomic="true">
          {currentStatus.title}. {currentStatus.detail}
        </div>

        <div className="world-dock">
          {world.focus.active ? (
          <div className="focus-session" aria-live="polite">
            <span className="focus-orb" aria-hidden="true" />
            <div>
              <strong>{world.action === "focus" ? "Quietly focusing together" : "Settling under the old tree"}</strong>
              <small>{world.action === "focus" ? `${state.name} is curled beneath the old tree` : `${state.name} is padding to a quiet place`} · {Math.ceil(world.focus.remainingMs / 1000)} seconds</small>
            </div>
          </div>
          ) : worldAnswering ? (
          <div className="focus-session world-answering" aria-live="polite">
            <span className="answering-sprout" aria-hidden="true" />
            <div>
              <strong>Let the little world answer</strong>
              <small>{worldAnswerDetail}</small>
            </div>
          </div>
          ) : dayPhase === "care-ready" ? (
          <button
            className="care-button care-invitation"
            type="button"
            onClick={care}
            aria-label={`${careEchoCopy.title}. ${careEchoCopy.detail} Press here if you cannot target it in the meadow.`}
          >
            <span className={`echo-touch-mark echo-touch-${state.pendingSource ?? "todo"}`} aria-hidden="true" />
            <span className="care-invitation-copy">
              <strong>{careEchoCopy.title}</strong>
              <small>{careEchoCopy.detail}</small>
            </span>
          </button>
          ) : dayPhase === "care-settling" ? (
          <div className="focus-session day-settling" aria-live="polite">
            <span className="settling-leaves" aria-hidden="true">✦</span>
            <div>
              <strong>{state.reaction === "evolve" ? `Let ${state.name} arrive` : "Let this moment settle"}</strong>
              <small>{state.reaction === "evolve" ? "The old and new forms are completing one grounded handoff." : `${state.name} is finishing today’s care before morning.`}</small>
            </div>
          </div>
          ) : dayPhase === "day-complete" && world.daylight.phase === "night" && world.action === "night-rest" ? (
          <button className="care-button next-morning-button" type="button" onClick={advanceDay}>
            <span className="morning-orb" aria-hidden="true" />
            <span className="morning-copy">
              <strong>Let the next morning arrive</strong>
              <small>Advance prototype time · nothing is lost</small>
            </span>
          </button>
          ) : dayPhase === "day-complete" ? (
          <div className="focus-session day-settling" aria-live="polite">
            <span className="settling-leaves evening-moon" aria-hidden="true">☾</span>
            <div>
              <strong>{world.action === "seek-rest" ? `${state.name} is finding the old tree` : "The meadow is becoming evening"}</strong>
              <small>Golden light, a grounded curl, then one quiet night.</small>
            </div>
          </div>
          ) : (
          <div className="action-pair three-actions" aria-label="Simulate a meaningful Kwilt action">
            <button type="button" onClick={() => complete("todo")}><span aria-hidden="true">✓</span>Complete a To-do</button>
            <button type="button" onClick={focusTogether}><span aria-hidden="true">◎</span>Focus together</button>
            <button type="button" onClick={playTogether}><span aria-hidden="true">✦</span>Play together</button>
          </div>
          )}

          <div className="growth-memory">
            <div className="memory-copy">
              <span>{growthTitle}</span>
              <small>{growthDetail}</small>
            </div>
          </div>
        </div>
      </section>

      <aside className="engine-inspector" aria-label="Pet engine inspector">
        <div className="inspector-heading">
          <div>
            <span className="eyebrow">Engine inspector</span>
            <h2>Open the machine</h2>
          </div>
          <span className={`engine-status ${paused ? "paused" : ""}`}>{paused ? "Paused" : "Running"}</span>
        </div>

        <section className="inspector-section">
          <div className="inspector-label"><span>World interaction</span><output data-testid="world-action-output">{world.action}</output></div>
          <div className="world-controls">
            <button type="button" onClick={() => commandWorld("visitor")}>Invite {visitorLabel}</button>
            <button type="button" onClick={() => commandWorld("rollover")}>Roll over</button>
            <button type="button" onClick={() => { setPreviewStage("guardian"); commandWorld("guardian-wake-left"); }}>Guardian landing left</button>
            <button type="button" onClick={() => { setPreviewStage("guardian"); commandWorld("guardian-wake-right"); }}>Guardian landing right</button>
            <button type="button" onClick={() => commandWorld("center")}>Reset camera</button>
          </div>
          <div className="weather-controls" aria-label="Weather study controls">
            <button type="button" className={world.weather === "sunny" ? "active" : ""} onClick={() => commandWorld("sunny")}>Sun</button>
            <button type="button" className={world.weather === "breeze" ? "active" : ""} onClick={() => commandWorld("breeze")}>Wind</button>
            <button type="button" className={world.weather === "rain" ? "active" : ""} onClick={() => commandWorld("rain")}>Rain</button>
          </div>
          <div className="world-readout" aria-label="Portable world runtime output">
            <span>Pet x <strong>{Math.round(world.petX)}</strong></span>
            <span>Camera x <strong>{Math.round(world.cameraX)}</strong></span>
            <span>Facing <strong>{world.facing === -1 ? "left" : "right"}</strong></span>
            <span>Zoom <strong>{world.zoom.toFixed(2)}×</strong></span>
            <span>Camera shot <strong>{world.cameraShot}{world.cameraShot === "user" ? ` · ${Math.ceil(world.cameraControlRemainingMs / 1000)}s` : ""}</strong></span>
            <span>Attention <strong data-testid="attention-output">{world.action === "track" || world.action === "hand-track" ? "noticing" : world.visitor.engaged || world.action === "hand-pounce" || world.action === "hand-aerial" ? "committed" : "quiet"}</strong></span>
            <span>Visitor <strong>{world.visitor.active ? `${world.visitor.kind} · ${Math.round(world.visitor.x)}, ${Math.round(world.visitor.y)}` : "quiet"}</strong></span>
            <span>Visitor acting <strong>{visitorPerformance ? `${visitorPerformance.role} · ${visitorPerformance.material} · ${visitorPerformance.frame + 1}/${VISITOR_PERFORMANCE_CLIPS[visitorPerformance.kind].frames.length}` : "quiet"}</strong></span>
            <span>Hand guide <strong>{world.hand.phase === "quiet" ? "quiet" : `${world.hand.phase} · ${Math.round(world.hand.x)}, ${Math.round(world.hand.y)}`}</strong></span>
            <span>Reach layer <strong>{currentStage === "baby" ? "ground" : currentStage === "young" ? "bound" : "aerial"}{world.hand.acroUsed ? " · spent" : ""}</strong></span>
            <span>Wind leaf <strong>{world.playLeaf.phase} · {world.playLeaf.mode}</strong></span>
            <span>Wind episode <strong>{world.action === "wind-brace" ? "gathering" : world.action === "leaf-invite" ? "inviting" : world.action.startsWith("leaf-") || world.action === "seek-leaf" ? "playing" : "quiet"}</strong></span>
            <span>Flight profile <strong>{world.playLeaf.phase === "perched" || world.playLeaf.phase === "held" ? "waiting" : world.playLeaf.flight.id}</strong></span>
            <span>Leaf position <strong>{Math.round(world.playLeaf.x)}, {Math.round(world.playLeaf.y)}</strong></span>
            <span>Catch point <strong>{Math.round(world.playLeaf.catchX)}, 202</strong></span>
            <span>Weather <strong>{world.weather}</strong></span>
            <span>Daylight <strong>{world.daylight.phase}{world.daylight.eveningActive ? " · closing" : ""}</strong></span>
            <span>After rain <strong>{world.afterRain.phase === "quiet" ? "quiet" : `${world.afterRain.phase} · ${Math.round(world.afterRain.x)}`}</strong></span>
            <span>Guardian wake <strong>{world.guardianWake.phase === "quiet" ? "quiet" : `${world.guardianWake.phase} · ${Math.round(world.guardianWake.x)}`}</strong></span>
            <span>Episode <strong>{world.weatherPhase} · {Math.round(world.weatherIntensity * 100)}%</strong></span>
            <span>Weather response <strong>{world.weatherResponsePending ? "waiting" : "settled"}</strong></span>
            <span>Living day <strong>{livingDay.activeEpisode ?? `quiet · ${livingDay.episodeIndex + 1}`}</strong></span>
            <span>Focus <strong>{world.focus.active ? `${Math.ceil(world.focus.remainingMs / 1000)}s` : world.focus.completed ? "complete" : "quiet"}</strong></span>
            <span>Stillness <strong>{world.focus.active ? `${Math.round(focusAtmosphere.hush * 100)}%` : "quiet"}</strong></span>
            <span>Soundscape <strong>{!state.soundEnabled ? "muted" : soundscapeRef.current?.started ? "awake" : "tap to hear"}</strong></span>
            <span>Audio mix <strong>{world.focus.active ? "meadow · hush" : world.weather === "rain" ? "meadow · rain" : world.weather === "breeze" ? "meadow · wind" : "meadow · warmth"}{soundscapeMix.wildlife > 0 ? " · wildlife" : ""}</strong></span>
            <span>Life echoes <strong>{world.blooms.length === 0 ? "quiet" : world.blooms.map((memory) => memory.source).join(" · ")}</strong></span>
          </div>
        </section>

        <section className="inspector-section">
          <div className="inspector-label"><span>Playback</span><output>{renderedClip} · {frame ? `${frame.frameIndex + 1}/${frame.frameCount}` : "—"}</output></div>
          <div className="motion-grid">
            {MOTIONS.map((motion) => (
              <button key={motion.id} type="button" className={currentMotion === motion.id ? "active" : ""} onClick={() => preview(motion.id)}>
                {motion.label}
              </button>
            ))}
          </div>
          <div className="transport-row">
            <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Play" : "Pause"}</button>
            <button type="button" onClick={() => { setPaused(true); setManualElapsed((value) => nextFrameElapsed(currentAnimation, value)); }}>Step drawing</button>
          </div>
          <div className="runtime-contract" aria-label="Portable Pet runtime output">
            <div className="inspector-label"><span>Behavior request</span><output>{world.action === "idle" ? currentMotion : world.action}</output></div>
            {evolutionComposition ? <div className="inspector-label"><span>Evolution phase</span><output>{evolutionComposition.phase}</output></div> : null}
            <div className="inspector-label"><span>Authored clip</span><output>{renderedClip}{renderedClip !== (world.action === "idle" ? currentMotion : world.action) ? " · composed" : ""}</output></div>
            <div className="inspector-label"><span>Atlas cell</span><output>{frame ? `${frame.cell.column}, ${frame.cell.row}` : "—"}</output></div>
            <div className="inspector-label"><span>Drawing role</span><output>{frame?.role ?? "—"}</output></div>
            <div className="inspector-label"><span>Anatomy layers</span><output>{frame?.layers.length ? `Eyes · ${frame.layers.length}` : "Base pose"}</output></div>
            <div className="inspector-label"><span>Frame offset</span><output>{frame ? `${frame.transform.x}, ${frame.transform.y}` : "—"}</output></div>
            <div className="inspector-label"><span>Ground contact</span><output>{frame?.contact ?? "—"}</output></div>
            <div className="inspector-label"><span>Ground anchor</span><output>{frame ? `${frame.anchor.x}, ${frame.anchor.y}` : "—"}</output></div>
            <div className="inspector-label"><span>Ground cue</span><output>{currentGroundCue ? `${currentGroundCue.width}px · terrain` : "—"}</output></div>
            <div className="inspector-label"><span>Playback rule</span><output>{currentAnimation.loopFrom ? `intro → loop ${currentAnimation.loopFrom + 1}–8` : currentAnimation.loop ? "loop" : "one-shot"}</output></div>
            <div className="inspector-label"><span>Frame event</span><output>{frame?.events.join(" · ") || "—"}</output></div>
            <div className="inspector-label"><span>Renderer</span><output>Canvas 2D</output></div>
          </div>
        </section>

        <section className="inspector-section anatomy-section">
          <div className="inspector-label"><span>Authoring channels</span><button type="button" className="text-control" onClick={() => setShowRig((value) => !value)}>{showRig ? "Hide rig" : "Show rig"}</button></div>
          <div className="layer-list" aria-label="Pet animation authoring channels">
            {["Tail", "Body", "Feet", "Head", "Ears", "Face", "Eyes", "Markings"].map((layer) => <span key={layer}>{layer}</span>)}
          </div>
        </section>

        <section className="inspector-section">
          <div className="inspector-label"><span>Form</span><output>{currentStage}</output></div>
          <div className="segmented-control">
            <button type="button" className={currentStage === "baby" ? "active" : ""} onClick={() => setPreviewStage("baby")}>Baby</button>
            <button type="button" className={currentStage === "young" ? "active" : ""} onClick={() => setPreviewStage("young")}>Young</button>
            <button type="button" className={currentStage === "guardian" ? "active" : ""} onClick={() => setPreviewStage("guardian")}>Guardian</button>
          </div>
        </section>

        <section className="inspector-section">
          <div className="inspector-label"><span>Habitat palette</span><output>{state.palette}</output></div>
          <div className="palette-picker" aria-label="Habitat palette">
            {PALETTES.map((option) => (
              <button key={option.id} type="button" className={`palette-dot palette-${option.id} ${state.palette === option.id ? "selected" : ""}`} aria-label={option.label} aria-pressed={state.palette === option.id} onClick={() => setState({ ...state, palette: option.id })} />
            ))}
          </div>
        </section>

        <details className="prototype-controls">
          <summary>Time and accessibility</summary>
          <div className="control-grid">
            <button type="button" onClick={advanceDay}>Advance one day</button>
            <button type="button" onClick={() => setState({ ...state, reducedMotion: !state.reducedMotion })}>{state.reducedMotion ? "Enable motion" : "Reduce motion"}</button>
            <button type="button" onClick={() => {
              setPreviewStage(null);
              setState(createPetState("leafling", "Moss", state.palette));
              setWorldMessage(null);
              clearSceneNarration();
              commandWorld("reset");
            }}>Reset prototype</button>
          </div>
        </details>
      </aside>
    </main>
  );
}
