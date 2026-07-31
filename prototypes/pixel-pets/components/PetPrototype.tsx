"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelPet } from "./PixelPet";
import {
  advancePrototypeDay,
  completeMeaningfulAction,
  createPetState,
  giveCare,
  type MeaningfulAction,
  type PetKind,
  type PetPalette,
  type PetReaction,
  type PetState,
  withReaction,
} from "@/lib/pet-state";

const STORAGE_KEY = "kwilt-pixel-pet-prototype-v1";

const PETS: Array<{
  kind: PetKind;
  name: string;
  nature: string;
  description: string;
  defaultName: string;
}> = [
  {
    kind: "leafling",
    name: "Leafling",
    nature: "Curious · grounded",
    description: "A mossy trail-finder who notices every new sprout.",
    defaultName: "Moss",
  },
  {
    kind: "ripplefin",
    name: "Ripplefin",
    nature: "Playful · easygoing",
    description: "A pond-skimmer who turns little moments into ripples.",
    defaultName: "Bloop",
  },
  {
    kind: "glowmoth",
    name: "Glowmoth",
    nature: "Gentle · observant",
    description: "A quiet lantern who finds light in ordinary days.",
    defaultName: "Luma",
  },
  {
    kind: "pebbleback",
    name: "Pebbleback",
    nature: "Patient · dependable",
    description: "A sturdy wanderer who knows growth can take its time.",
    defaultName: "Pip",
  },
  {
    kind: "cloudwing",
    name: "Cloudwing",
    nature: "Brave · buoyant",
    description: "A pocket-sized flyer always ready for the next breeze.",
    defaultName: "Wisp",
  },
];

const PALETTES: Array<{ id: PetPalette; label: string }> = [
  { id: "moss", label: "Moss" },
  { id: "lagoon", label: "Lagoon" },
  { id: "ember", label: "Ember" },
  { id: "clay", label: "Clay" },
  { id: "sky", label: "Sky" },
];

const FREQUENCIES: Record<PetKind, number> = {
  leafling: 392,
  ripplefin: 294,
  glowmoth: 523,
  pebbleback: 220,
  cloudwing: 659,
};

function playPetSound(kind: PetKind, reaction: PetReaction, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const base = FREQUENCIES[kind];
  const offsets: Record<PetReaction, number> = {
    idle: 0,
    greet: 80,
    eat: -30,
    discover: 130,
    sleep: -90,
    evolve: 260,
  };

  oscillator.type = kind === "pebbleback" ? "triangle" : kind === "glowmoth" ? "sine" : "square";
  oscillator.frequency.setValueAtTime(base + offsets[reaction], context.currentTime);
  if (reaction === "evolve") {
    oscillator.frequency.exponentialRampToValueAtTime(base * 2, context.currentTime + 0.42);
  } else {
    oscillator.frequency.setValueAtTime(base + offsets[reaction] + 45, context.currentTime + 0.08);
  }
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (reaction === "evolve" ? 0.58 : 0.22));
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (reaction === "evolve" ? 0.6 : 0.24));
  oscillator.addEventListener("ended", () => void context.close());
}

function nudge() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(18);
  }
}

export function PetPrototype() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PetState | null>(null);
  const [selectedKind, setSelectedKind] = useState<PetKind>("leafling");
  const [petName, setPetName] = useState("Moss");
  const [palette, setPalette] = useState<PetPalette>("moss");
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
    if (!hydrated) return;
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [hydrated, state]);

  useEffect(() => {
    return () => {
      if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    };
  }, []);

  const petDefinition = useMemo(
    () => PETS.find((pet) => pet.kind === (state?.kind ?? selectedKind)) ?? PETS[0],
    [selectedKind, state?.kind],
  );

  function settleReaction(delay = 1200) {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => {
      setState((current) => (current ? withReaction(current, "idle") : current));
    }, delay);
  }

  function hatch() {
    const next = createPetState(selectedKind, petName, palette);
    setState(next);
    playPetSound(next.kind, "greet", next.soundEnabled);
    nudge();
    settleReaction();
  }

  function react(reaction: PetReaction, receipt?: string) {
    if (!state) return;
    const next = withReaction(state, reaction, receipt);
    setState(next);
    playPetSound(next.kind, reaction, next.soundEnabled);
    nudge();
    settleReaction(reaction === "evolve" ? 2200 : 1200);
  }

  function complete(source: MeaningfulAction) {
    if (!state) return;
    const next = completeMeaningfulAction(state, source);
    setState(next);
    playPetSound(next.kind, "discover", next.soundEnabled);
    nudge();
    settleReaction();
  }

  function care() {
    if (!state) return;
    const next = giveCare(state);
    setState(next);
    playPetSound(next.kind, next.reaction, next.soundEnabled);
    nudge();
    settleReaction(next.reaction === "evolve" ? 2400 : 1500);
  }

  function advanceDay() {
    if (!state) return;
    const next = advancePrototypeDay(state);
    setState(next);
    playPetSound(next.kind, "sleep", next.soundEnabled);
    settleReaction();
  }

  function switchPet() {
    if (!state) return;
    setSelectedKind(state.kind);
    setPetName(state.name);
    setPalette(state.palette);
    setState(null);
  }

  if (!hydrated) {
    return (
      <main className="prototype-shell loading-shell" aria-live="polite">
        <span className="loading-pixel" />
        <p>Waking up a little world…</p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="prototype-shell selection-shell">
        <header className="lab-header">
          <span className="eyebrow">Kwilt Lab · Pixel Pet prototype</span>
          <h1>Who will grow beside you?</h1>
          <p>Choose the tiny creature you’d like to care for. No choice changes the rules—only the personality.</p>
        </header>

        <section className="pet-picker" aria-label="Choose a Pixel Pet">
          {PETS.map((pet) => {
            const selected = selectedKind === pet.kind;
            return (
              <button
                key={pet.kind}
                type="button"
                className={`pet-choice ${selected ? "selected" : ""}`}
                aria-pressed={selected}
                onClick={() => {
                  setSelectedKind(pet.kind);
                  setPetName(pet.defaultName);
                }}
              >
                <span className="choice-stage" data-palette={palette}>
                  <PixelPet kind={pet.kind} stage="young" compact label={pet.name} />
                </span>
                <strong>{pet.name}</strong>
                <small>{pet.nature}</small>
              </button>
            );
          })}
        </section>

        <section className="adoption-card">
          <div className="selected-pet-copy">
            <span>{petDefinition.name}</span>
            <p>{petDefinition.description}</p>
          </div>

          <label className="name-field">
            <span>Name your Pet</span>
            <input
              value={petName}
              maxLength={14}
              onChange={(event) => setPetName(event.target.value)}
              placeholder={petDefinition.defaultName}
            />
          </label>

          <fieldset className="palette-picker">
            <legend>Choose its little world</legend>
            <div>
              {PALETTES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`palette-dot palette-${option.id} ${palette === option.id ? "selected" : ""}`}
                  aria-label={option.label}
                  aria-pressed={palette === option.id}
                  onClick={() => setPalette(option.id)}
                />
              ))}
            </div>
          </fieldset>

          <button className="primary-button" type="button" onClick={hatch}>
            Meet {petName.trim() || petDefinition.defaultName}
          </button>
        </section>
      </main>
    );
  }

  const momentsToGrow = Math.max(0, 5 - state.careDays);
  const dayHasCare = state.caredPrototypeDay === state.prototypeDay;

  return (
    <main className="prototype-shell habitat-shell" data-palette={state.palette}>
      <div className="prototype-context">
        <span className="eyebrow">Kwilt Lab · Live prototype</span>
        <h1>A little life shaped by showing up.</h1>
        <p>
          This world responds to meaningful moments. It never gets sick, sad, or smaller when life gets quiet.
        </p>
      </div>

      <section className="pet-device" aria-label={`${state.name}'s little world`}>
        <header className="device-header">
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

        <div className={`habitat reaction-${state.reaction}`}>
          <span className="habitat-sun" />
          <span className="habitat-cloud cloud-one" />
          <span className="habitat-cloud cloud-two" />
          <span className="habitat-plant plant-one" />
          <span className="habitat-plant plant-two" />
          <span className="habitat-rock" />
          <span className="habitat-ground" />
          <span className="reaction-mark" aria-hidden="true">
            {state.reaction === "sleep" ? "z" : state.reaction === "discover" ? "!" : state.reaction === "evolve" ? "✦" : "♥"}
          </span>
          <PixelPet
            kind={state.kind}
            stage={state.stage}
            reaction={state.reaction}
            reducedMotion={state.reducedMotion}
            onInteract={() => react("greet", `${state.name} is glad you stopped by.`)}
            label={`Pet ${state.name}`}
          />
        </div>

        <div className="pet-message" aria-live="polite">
          <span className={`receipt-icon ${state.careAvailable ? "ready" : ""}`} aria-hidden="true">
            {state.careAvailable ? "✦" : "·"}
          </span>
          <div>
            <strong>
              {state.careAvailable
                ? "A care moment is ready"
                : dayHasCare
                  ? "Cozy and cared for"
                  : "Quietly keeping you company"}
            </strong>
            <p>{state.lastReceipt}</p>
          </div>
        </div>

        {state.careAvailable ? (
          <button className="care-button" type="button" onClick={care}>
            <span className="pixel-berry" aria-hidden="true" />
            Give today’s care
          </button>
        ) : (
          <div className="action-pair" aria-label="Simulate a meaningful Kwilt action">
            <button type="button" onClick={() => complete("todo")}>
              <span aria-hidden="true">✓</span>
              Complete a To-do
            </button>
            <button type="button" onClick={() => complete("focus")}>
              <span aria-hidden="true">◎</span>
              Finish Focus
            </button>
          </div>
        )}

        <div className="growth-memory">
          <div className="memory-copy">
            <span>{state.stage === "evolved" ? "First evolution reached" : "Growing together"}</span>
            <small>
              {state.stage === "evolved"
                ? `${state.careDays} care moments remembered`
                : `${momentsToGrow} ${momentsToGrow === 1 ? "moment" : "moments"} until something new`}
            </small>
          </div>
          <div className="memory-dots" aria-label={`${Math.min(state.careDays, 5)} of 5 care moments`}>
            {[0, 1, 2, 3, 4].map((index) => (
              <span key={index} className={index < state.careDays ? "remembered" : ""} />
            ))}
          </div>
        </div>
      </section>

      <details className="prototype-controls">
        <summary>Prototype controls</summary>
        <p>These shortcuts compress time for testing. They are not part of the future Pet experience.</p>
        <div className="control-grid">
          <button type="button" onClick={advanceDay}>Advance one day</button>
          <button type="button" onClick={() => react("discover", `${state.name} found a tiny keepsake.`)}>Replay discovery</button>
          <button type="button" onClick={() => react("sleep", `${state.name} found a comfortable place to rest.`)}>Try sleep</button>
          <button type="button" onClick={() => setState({ ...state, reducedMotion: !state.reducedMotion })}>
            {state.reducedMotion ? "Enable motion" : "Reduce motion"}
          </button>
          <button type="button" onClick={switchPet}>Switch Pet</button>
          <button type="button" className="danger-control" onClick={() => setState(createPetState(state.kind, state.name, state.palette))}>
            Reset this Pet
          </button>
        </div>
      </details>
    </main>
  );
}
