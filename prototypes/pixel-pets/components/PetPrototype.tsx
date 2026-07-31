"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PetEngineCanvas, type PetWorldCommand } from "./PetEngineCanvas";
import { clipForMotion, resolveGroundCue, type EngineMotion } from "@/lib/pet-engine";
import { createPetWorldState, type PetWorldAction, type PetWorldState } from "@/lib/pet-world";
import { LEAFLING_PRESENTATION, leaflingManifestForStage } from "@/lib/leafling";
import { clipDuration, nextFrameElapsed, type PetAnimationClip, type PetFrameSnapshot } from "@/lib/pet-runtime";
import {
  advancePrototypeDay,
  completeMeaningfulAction,
  createPetState,
  giveCare,
  type MeaningfulAction,
  type PetPalette,
  type PetReaction,
  type PetStage,
  type PetState,
  withReaction,
} from "@/lib/pet-state";

const STORAGE_KEY = "kwilt-pixel-pet-engine-proof-v4";

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
];

const REACTION_MOTION: Record<PetReaction, EngineMotion> = {
  idle: "idle",
  greet: "greet",
  eat: "care",
  discover: "discover",
  sleep: "sleep",
  evolve: "evolve",
};

function playPetSound(reaction: PetReaction, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const offsets: Record<PetReaction, number> = {
    idle: 0,
    greet: 80,
    eat: -30,
    discover: 130,
    sleep: -90,
    evolve: 260,
  };

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(392 + offsets[reaction], context.currentTime);
  oscillator.frequency.setValueAtTime(437 + offsets[reaction], context.currentTime + 0.08);
  if (reaction === "evolve") {
    oscillator.frequency.exponentialRampToValueAtTime(784, context.currentTime + 0.42);
  }
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (reaction === "evolve" ? 0.58 : 0.22));
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (reaction === "evolve" ? 0.6 : 0.24));
  oscillator.addEventListener("ended", () => void context.close());
}

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
  const [worldMessage, setWorldMessage] = useState<{ title: string; detail: string } | null>(null);
  const [worldCommand, setWorldCommand] = useState<PetWorldCommand | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const focusCompletionHandled = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setState(JSON.parse(saved) as PetState);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
  }, []);

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
    playPetSound("discover", next.soundEnabled);
    nudge();
    settleAfterMotion("discover");
  }, [settleAfterMotion, state, world.focus.completed]);

  function complete(source: MeaningfulAction) {
    const next = completeMeaningfulAction(state, source);
    setState(next);
    playPetSound("discover", next.soundEnabled);
    nudge();
    settleAfterMotion("discover");
  }

  function care() {
    const next = giveCare(state);
    setState(next);
    playPetSound(next.reaction, next.soundEnabled);
    nudge();
    settleAfterMotion(REACTION_MOTION[next.reaction], next.stage);
  }

  function advanceDay() {
    const next = advancePrototypeDay(state);
    setState(next);
    playPetSound("sleep", next.soundEnabled);
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
      const soundReaction: PetReaction = motion === "care" ? "eat" : motion;
      playPetSound(soundReaction, state.soundEnabled);
    }
    settleAfterMotion(motion);
  }

  const currentMotion = previewMotion ?? REACTION_MOTION[state.reaction];
  const currentClip = clipForMotion(currentMotion);
  const renderedClip = frame?.clip ?? currentClip;
  const currentStage = previewStage ?? state.stage;
  const currentManifest = leaflingManifestForStage(currentStage);
  const currentAnimation = currentManifest.clips[renderedClip] as PetAnimationClip;
  const currentScale = LEAFLING_PRESENTATION.stages[currentStage].width / currentManifest.atlas.frameWidth;
  const currentGroundCue = frame
    ? resolveGroundCue(frame.contact, frame.shadow.width, frame.shadow.opacity, currentScale)
    : null;
  const nextGrowthThreshold = state.stage === "baby" ? 3 : state.stage === "young" ? 8 : null;
  const momentsToGrow = nextGrowthThreshold === null ? 0 : Math.max(0, nextGrowthThreshold - state.careDays);
  const growthTitle = state.stage === "guardian" ? "Guardian form reached" : "Growing together";
  const growthDetail = state.stage === "guardian"
    ? `${state.careDays} moments remembered`
    : `${momentsToGrow} until ${state.stage === "baby" ? "young form" : "guardian form"}`;
  const dayHasCare = state.caredPrototypeDay === state.prototypeDay;
  const currentStatus = useMemo(() => {
    if (state.careAvailable) return { title: "A care moment is ready", detail: state.lastReceipt };
    if (worldMessage) return worldMessage;
    if (dayHasCare) return { title: "Cozy and cared for", detail: state.lastReceipt };
    return { title: "Quietly keeping you company", detail: state.lastReceipt };
  }, [dayHasCare, state.careAvailable, state.lastReceipt, worldMessage]);
  const handleFrame = useCallback((snapshot: PetFrameSnapshot) => setFrame(snapshot), []);
  const handleWorldFrame = useCallback((snapshot: PetWorldState) => setWorld(snapshot), []);
  const handleWorldInteraction = useCallback((action: PetWorldAction) => {
    const messages: Partial<Record<PetWorldAction, { title: string; detail: string }>> = {
      greet: { title: "A little hello", detail: `${state.name} noticed you.` },
      track: { title: "Ears up", detail: `Something caught ${state.name}’s eye.` },
      walk: { title: "Off we go", detail: `${state.name} is padding over.` },
      run: { title: "Coming fast", detail: `${state.name} is racing over.` },
      jump: { title: "Almost!", detail: `${state.name} reached for your finger.` },
      pounce: { title: "Couldn’t resist", detail: "That tiny visitor looked interesting." },
      rollover: { title: `Olive taught ${state.name} a trick`, detail: "A complete, leafy rollover." },
      "seek-shelter": { title: "Weather coming", detail: `${state.name} knows where the old tree keeps the ground dry.` },
      shelter: { title: "Safe under the leaves", detail: `Rain can pass. ${state.name} found a quiet place to curl up.` },
      bask: { title: "Following the warmth", detail: `${state.name} found the sunny part of the meadow.` },
      focus: { title: "Quiet company", detail: `${state.name} is focusing beside you.` },
    };
    setWorldMessage(messages[action] ?? null);
  }, [state.name]);

  function commandWorld(type: PetWorldCommand["type"]) {
    setWorldCommand((current) => ({ serial: (current?.serial ?? 0) + 1, type }));
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
    <main className="engine-lab" data-palette={state.palette}>
      <header className="engine-intro">
        <span className="eyebrow">Kwilt Lab · Pet Engine Study 08</span>
        <h1>Every step<br />has weight.</h1>
        <p>
          Leafling no longer slides through the meadow. Every form now walks and runs with its own authored footfalls, compression, flight, and contact.
        </p>
        <dl className="engine-facts">
          <div><dt>Gaits</dt><dd>walk · run</dd></div>
          <div><dt>Cycle</dt><dd>8 authored keys</dd></div>
          <div><dt>Control</dt><dd>tap · travel · follow</dd></div>
        </dl>
      </header>

      <section className="capability-frame" aria-label={`${state.name}'s Pet capability`}>
        <header className="capability-header">
          <div>
            <span className="device-label">Day {state.prototypeDay}</span>
            <strong>{state.name}</strong><span className="weather-label">{world.weather}</span>
          </div>
          <button
            type="button"
            className="sound-button"
            aria-label={state.soundEnabled ? "Mute Pet sounds" : "Turn on Pet sounds"}
            onClick={() => setState({ ...state, soundEnabled: !state.soundEnabled })}
          >
            {state.soundEnabled ? "♪" : "♪̸"}
          </button>
        </header>

        <div className="scene-frame">
          <PetEngineCanvas
            stage={currentStage}
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
            onWorldInteraction={handleWorldInteraction}
            label={`${state.name}'s interactive world. Tap to move, tap high to jump, pinch to zoom, or swipe across ${state.name} for a rollover.`}
          />
          <span className="scene-instructions" aria-hidden="true">tap · pinch · swipe · weather</span>
          <span className="scene-resolution" aria-hidden="true">x {Math.round(world.cameraX)} · {world.zoom.toFixed(2)}×</span>
        </div>

        <div className="pet-message" aria-live="polite">
          <span className={`receipt-icon ${state.careAvailable ? "ready" : ""}`} aria-hidden="true">
            {state.careAvailable ? "✦" : "·"}
          </span>
          <div>
            <strong>{currentStatus.title}</strong>
            <p>{currentStatus.detail}</p>
          </div>
        </div>

        {world.focus.active ? (
          <div className="focus-session" aria-live="polite">
            <span className="focus-orb" aria-hidden="true" />
            <div><strong>Focusing together</strong><small>{Math.ceil(world.focus.remainingMs / 1000)} seconds · Leafling will stay with you</small></div>
          </div>
        ) : state.careAvailable ? (
          <button className="care-button" type="button" onClick={care}>
            <span className="pixel-berry" aria-hidden="true" />
            Give today’s care
          </button>
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
          <div className="memory-dots" aria-label={`${Math.min(state.careDays, 8)} of 8 care moments`}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => <span key={index} className={index < state.careDays ? "remembered" : ""} />)}
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
          <div className="inspector-label"><span>World interaction</span><output>{world.action}</output></div>
          <div className="world-controls">
            <button type="button" onClick={() => commandWorld("firefly")}>Release firefly</button>
            <button type="button" onClick={() => commandWorld("rollover")}>Roll over</button>
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
            <span>Zoom <strong>{world.zoom.toFixed(2)}×</strong></span>
            <span>Visitor <strong>{world.insect.active ? "active" : "quiet"}</strong></span>
            <span>Weather <strong>{world.weather}</strong></span>
            <span>Focus <strong>{world.focus.active ? `${Math.ceil(world.focus.remainingMs / 1000)}s` : world.focus.completed ? "complete" : "quiet"}</strong></span>
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
            <button type="button" onClick={() => { setPreviewStage(null); setState(createPetState("leafling", "Moss", state.palette)); }}>Reset care loop</button>
          </div>
        </details>
      </aside>
    </main>
  );
}
