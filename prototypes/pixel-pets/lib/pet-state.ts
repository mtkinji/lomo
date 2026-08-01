export type PetKind =
  | "leafling"
  | "ripplefin"
  | "glowmoth"
  | "pebbleback"
  | "cloudwing";

export type PetPalette = "moss" | "lagoon" | "ember" | "clay" | "sky";
export type MeaningfulAction = "todo" | "focus" | "play";
export type PetStage = "baby" | "young" | "guardian";
export type PetReaction =
  | "idle"
  | "greet"
  | "eat"
  | "discover"
  | "sleep"
  | "evolve";

export interface PetState {
  kind: PetKind;
  name: string;
  palette: PetPalette;
  prototypeDay: number;
  careDays: number;
  caredPrototypeDay: number | null;
  careAvailable: boolean;
  pendingSource: MeaningfulAction | null;
  stage: PetStage;
  stageDebutPending: boolean;
  reaction: PetReaction;
  lastReceipt: string;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export type PrototypeDayPhase =
  | "choose-action"
  | "care-ready"
  | "care-settling"
  | "day-complete";

export function resolvePrototypeDayPhase(state: PetState): PrototypeDayPhase {
  if (state.careAvailable) return "care-ready";
  if (state.caredPrototypeDay !== state.prototypeDay) return "choose-action";
  return state.reaction === "idle" ? "day-complete" : "care-settling";
}

export function resolveCareWorldTiming(reaction: PetReaction): "now" | "after-reaction" {
  return reaction === "evolve" ? "after-reaction" : "now";
}

export function createPetState(
  kind: PetKind,
  name: string,
  palette: PetPalette,
): PetState {
  return {
    kind,
    name: name.trim() || "Pip",
    palette,
    prototypeDay: 1,
    careDays: 0,
    caredPrototypeDay: null,
    careAvailable: false,
    pendingSource: null,
    stage: "baby",
    stageDebutPending: false,
    reaction: "greet",
    lastReceipt: "A new little life has arrived.",
    soundEnabled: true,
    reducedMotion: false,
  };
}

export function completeMeaningfulAction(
  state: PetState,
  source: MeaningfulAction,
): PetState {
  if (state.careAvailable || state.caredPrototypeDay === state.prototypeDay) {
    const noticedReceipt: Record<MeaningfulAction, string> = {
      focus: `${state.name} noticed that Focus session too.`,
      todo: `${state.name} noticed that To-do too.`,
      play: `${state.name} noticed you playing together too.`,
    };
    return {
      ...state,
      reaction: "discover",
      lastReceipt: noticedReceipt[source],
    };
  }

  const availableReceipt: Record<MeaningfulAction, string> = {
    focus: "A Focus session made one care moment available.",
    todo: "A completed To-do made one care moment available.",
    play: "Playing together made one care moment available.",
  };
  return {
    ...state,
    careAvailable: true,
    pendingSource: source,
    reaction: "discover",
    lastReceipt: availableReceipt[source],
  };
}

export function giveCare(state: PetState): PetState {
  if (!state.careAvailable) return state;

  const careDays = state.careDays + 1;
  const stage: PetStage = careDays >= 8
    ? "guardian"
    : careDays >= 3
      ? "young"
      : "baby";
  const evolvedNow = stage !== state.stage;

  return {
    ...state,
    careDays,
    caredPrototypeDay: state.prototypeDay,
    careAvailable: false,
    pendingSource: null,
    stage,
    stageDebutPending: evolvedNow || state.stageDebutPending,
    reaction: evolvedNow ? "evolve" : "eat",
    lastReceipt: evolvedNow
      ? stage === "guardian"
        ? `${state.name} grew into a Guardian Leafling.`
        : `${state.name} grew into a young Leafling.`
      : `${state.name} is cozy and cared for today.`,
  };
}

export function consumeStageDebut(state: PetState): PetState {
  if (!state.stageDebutPending) return state;
  return { ...state, stageDebutPending: false };
}

export function isStageDebutReady(
  state: PetState,
  world: {
    daylightPhase: string;
    action: string;
    visitorActive: boolean;
    focusActive: boolean;
  },
): boolean {
  return state.stageDebutPending
    && state.caredPrototypeDay !== null
    && state.prototypeDay > state.caredPrototypeDay
    && world.daylightPhase === "day"
    && world.action === "idle"
    && !world.visitorActive
    && !world.focusActive;
}

export function advancePrototypeDay(state: PetState): PetState {
  return {
    ...state,
    prototypeDay: state.prototypeDay + 1,
    careAvailable: false,
    pendingSource: null,
    reaction: "greet",
    lastReceipt: `A new morning for ${state.name}. Nothing was lost overnight.`,
  };
}

export function withReaction(
  state: PetState,
  reaction: PetReaction,
  receipt = state.lastReceipt,
): PetState {
  return { ...state, reaction, lastReceipt: receipt };
}
