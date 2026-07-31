"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PetEngineCanvas } from "./PetEngineCanvas";
import type { AnimationSnapshot, EngineMotion } from "@/lib/pet-engine";
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

const STORAGE_KEY = "kwilt-pixel-pet-engine-proof-v2";

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
  const [frame, setFrame] = useState<AnimationSnapshot | null>(null);
  const reactionTimer = useRef<number | null>(null);

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

  function react(reaction: PetReaction, receipt = state.lastReceipt) {
    setPreviewMotion(null);
    setPaused(false);
    setManualElapsed(0);
    setState(withReaction(state, reaction, receipt));
    playPetSound(reaction, state.soundEnabled);
    nudge();
    settle(reaction === "evolve" ? 2100 : 1300);
  }

  function complete(source: MeaningfulAction) {
    const next = completeMeaningfulAction(state, source);
    setState(next);
    playPetSound("discover", next.soundEnabled);
    nudge();
    settle();
  }

  function care() {
    const next = giveCare(state);
    setState(next);
    playPetSound(next.reaction, next.soundEnabled);
    nudge();
    settle(next.reaction === "evolve" ? 2300 : 1600);
  }

  function advanceDay() {
    const next = advancePrototypeDay(state);
    setState(next);
    playPetSound("sleep", next.soundEnabled);
    settle();
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
    settle(motion === "sleep" ? 2200 : motion === "evolve" ? 2400 : 1500);
  }

  const currentMotion = previewMotion ?? REACTION_MOTION[state.reaction];
  const currentStage = previewStage ?? state.stage;
  const momentsToGrow = Math.max(0, 5 - state.careDays);
  const dayHasCare = state.caredPrototypeDay === state.prototypeDay;
  const currentStatus = useMemo(() => {
    if (state.careAvailable) return { title: "A care moment is ready", detail: state.lastReceipt };
    if (dayHasCare) return { title: "Cozy and cared for", detail: state.lastReceipt };
    return { title: "Quietly keeping you company", detail: state.lastReceipt };
  }, [dayHasCare, state.careAvailable, state.lastReceipt]);
  const handleFrame = useCallback((snapshot: AnimationSnapshot) => setFrame(snapshot), []);

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
        <span className="eyebrow">Kwilt Lab · Pet Engine Study 01</span>
        <h1>A tiny creature.<br />A real system.</h1>
        <p>
          Leafling is the reference Pet for a higher-fidelity, layered animation engine designed to scale to a full iPhone capability.
        </p>
        <dl className="engine-facts">
          <div><dt>Scene</dt><dd>160 × 240</dd></div>
          <div><dt>Pet</dt><dd>48–64 px</dd></div>
          <div><dt>Motion</dt><dd>Integer pixels</dd></div>
        </dl>
      </header>

      <section className="capability-frame" aria-label={`${state.name}'s Pet capability`}>
        <header className="capability-header">
          <div>
            <span className="device-label">Day {state.prototypeDay}</span>
            <strong>{state.name}</strong>
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
            onFrame={handleFrame}
            onPet={() => react("greet", `${state.name} noticed you.`)}
            label={`Pet ${state.name}`}
          />
          <span className="scene-resolution" aria-hidden="true">160 × 240</span>
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

        {state.careAvailable ? (
          <button className="care-button" type="button" onClick={care}>
            <span className="pixel-berry" aria-hidden="true" />
            Give today’s care
          </button>
        ) : (
          <div className="action-pair" aria-label="Simulate a meaningful Kwilt action">
            <button type="button" onClick={() => complete("todo")}><span aria-hidden="true">✓</span>Complete a To-do</button>
            <button type="button" onClick={() => complete("focus")}><span aria-hidden="true">◎</span>Finish Focus</button>
          </div>
        )}

        <div className="growth-memory">
          <div className="memory-copy">
            <span>{state.stage === "evolved" ? "First evolution reached" : "Growing together"}</span>
            <small>{state.stage === "evolved" ? `${state.careDays} moments remembered` : `${momentsToGrow} until something new`}</small>
          </div>
          <div className="memory-dots" aria-label={`${Math.min(state.careDays, 5)} of 5 care moments`}>
            {[0, 1, 2, 3, 4].map((index) => <span key={index} className={index < state.careDays ? "remembered" : ""} />)}
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
          <div className="inspector-label"><span>Animation</span><output>{currentMotion} · {frame ? `${frame.frame + 1}/${frame.frameCount}` : "—"}</output></div>
          <div className="motion-grid">
            {MOTIONS.map((motion) => (
              <button key={motion.id} type="button" className={currentMotion === motion.id ? "active" : ""} onClick={() => preview(motion.id)}>
                {motion.label}
              </button>
            ))}
          </div>
          <div className="transport-row">
            <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Play" : "Pause"}</button>
            <button type="button" onClick={() => { setPaused(true); setManualElapsed((value) => value + 160); }}>Step frame</button>
          </div>
        </section>

        <section className="inspector-section anatomy-section">
          <div className="inspector-label"><span>Anatomy</span><button type="button" className="text-control" onClick={() => setShowRig((value) => !value)}>{showRig ? "Hide rig" : "Show rig"}</button></div>
          <div className="layer-list" aria-label="Independently animated Pet layers">
            {["Tail", "Body", "Feet", "Head", "Ears", "Face", "Eyes", "Markings"].map((layer) => <span key={layer}>{layer}</span>)}
          </div>
        </section>

        <section className="inspector-section">
          <div className="inspector-label"><span>Form</span><output>{currentStage}</output></div>
          <div className="segmented-control">
            <button type="button" className={currentStage === "young" ? "active" : ""} onClick={() => setPreviewStage("young")}>Young</button>
            <button type="button" className={currentStage === "evolved" ? "active" : ""} onClick={() => setPreviewStage("evolved")}>Evolved</button>
          </div>
        </section>

        <section className="inspector-section">
          <div className="inspector-label"><span>Palette</span><output>{state.palette}</output></div>
          <div className="palette-picker" aria-label="Pet palette">
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
