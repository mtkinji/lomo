export type PetKind =
  | "leafling"
  | "ripplefin"
  | "glowmoth"
  | "pebbleback"
  | "cloudwing";

export type PetPalette = "moss" | "lagoon" | "ember" | "clay" | "sky";
export type MeaningfulAction = "todo" | "focus";
export type PetStage = "young" | "evolved";
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
  reaction: PetReaction;
  lastReceipt: string;
  soundEnabled: boolean;
  reducedMotion: boolean;
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
    stage: "young",
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
    return {
      ...state,
      reaction: "discover",
      lastReceipt:
        source === "focus"
          ? `${state.name} noticed that Focus session too.`
          : `${state.name} noticed that To-do too.`,
    };
  }

  return {
    ...state,
    careAvailable: true,
    pendingSource: source,
    reaction: "discover",
    lastReceipt:
      source === "focus"
        ? "A Focus session made one care moment available."
        : "A completed To-do made one care moment available.",
  };
}

export function giveCare(state: PetState): PetState {
  if (!state.careAvailable) return state;

  const careDays = state.careDays + 1;
  const evolvedNow = state.stage === "young" && careDays >= 5;

  return {
    ...state,
    careDays,
    caredPrototypeDay: state.prototypeDay,
    careAvailable: false,
    pendingSource: null,
    stage: evolvedNow ? "evolved" : state.stage,
    reaction: evolvedNow ? "evolve" : "eat",
    lastReceipt: evolvedNow
      ? `${state.name} grew into a new form.`
      : `${state.name} is cozy and cared for today.`,
  };
}

export function advancePrototypeDay(state: PetState): PetState {
  return {
    ...state,
    prototypeDay: state.prototypeDay + 1,
    careAvailable: false,
    pendingSource: null,
    reaction: "sleep",
    lastReceipt: `A quiet new day for ${state.name}. Nothing was lost.`,
  };
}

export function withReaction(
  state: PetState,
  reaction: PetReaction,
  receipt = state.lastReceipt,
): PetState {
  return { ...state, reaction, lastReceipt: receipt };
}
