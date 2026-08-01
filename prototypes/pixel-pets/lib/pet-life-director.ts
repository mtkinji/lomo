import type { PetStage } from "./pet-state";
import type { PetWeather, PetWeatherPhase, PetWorldAction } from "./pet-world";

export const LIVING_DAY = {
  initialQuietMs: 3200,
  quietBetweenEpisodesMs: 6800,
  minX: 24,
  maxX: 456,
  roamDistance: {
    baby: 44,
    young: 76,
    guardian: 110,
  },
} as const;

export type LivingDayEpisode = "wind-play" | "roam" | "visit-bloom" | "tree-rest" | "visitor" | "weather";

export type LivingDayCommand =
  | { kind: "wind-play" }
  | { kind: "roam"; targetX: number }
  | { kind: "visit-bloom"; bloomX: number }
  | { kind: "tree-rest" }
  | { kind: "visitor" }
  | { kind: "weather" };

export interface LivingDayDirectorState {
  activeEpisode: LivingDayEpisode | null;
  episodeIndex: number;
  quietElapsedMs: number;
}

export interface LivingDayObservation {
  stage: PetStage;
  petX: number;
  bloomXs: number[];
  action: PetWorldAction;
  focusActive: boolean;
  visitorActive: boolean;
  weather: PetWeather;
  weatherPhase: PetWeatherPhase;
  ceremonyActive: boolean;
}

export interface LivingDayStep {
  state: LivingDayDirectorState;
  command: LivingDayCommand | null;
}

export function createLivingDayDirector(): LivingDayDirectorState {
  return { activeEpisode: null, episodeIndex: 0, quietElapsedMs: 0 };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function stableForAmbientDirection(observation: LivingDayObservation) {
  return !observation.focusActive
    && !observation.visitorActive
    && !observation.ceremonyActive
    && observation.weatherPhase === "settled"
    && ["idle", "shade", "shelter", "bask"].includes(observation.action);
}

function episodeIsComplete(
  episode: LivingDayEpisode,
  observation: LivingDayObservation,
) {
  if (episode === "visitor") {
    return !observation.visitorActive && observation.action === "idle";
  }
  if (episode === "weather") {
    return observation.weatherPhase === "settled"
      && ["idle", "shade", "shelter", "bask"].includes(observation.action);
  }
  return observation.action === "idle";
}

function roamCommand(
  observation: LivingDayObservation,
  episodeIndex: number,
): LivingDayCommand {
  const distance = LIVING_DAY.roamDistance[observation.stage];
  const preferredDirection = Math.floor(episodeIndex / 5) % 2 === 0 ? 1 : -1;
  const preferredX = observation.petX + distance * preferredDirection;
  const direction = preferredX > LIVING_DAY.maxX || preferredX < LIVING_DAY.minX
    ? -preferredDirection
    : preferredDirection;
  return {
    kind: "roam",
    targetX: clamp(observation.petX + distance * direction, LIVING_DAY.minX, LIVING_DAY.maxX),
  };
}

function commandForEpisode(
  observation: LivingDayObservation,
  episodeIndex: number,
): LivingDayCommand {
  if (observation.weather === "rain") return { kind: "weather" };
  if (episodeIndex === 0) return { kind: "wind-play" };
  const sequenceIndex = (episodeIndex - 1) % 5;
  if (sequenceIndex === 0) return roamCommand(observation, episodeIndex);
  if (sequenceIndex === 1) {
    if (observation.bloomXs.length > 0) {
      const bloomX = observation.bloomXs[episodeIndex % observation.bloomXs.length];
      return { kind: "visit-bloom", bloomX };
    }
    return { kind: "tree-rest" };
  }
  if (sequenceIndex === 2) {
    return observation.bloomXs.length > 0
      ? { kind: "tree-rest" }
      : roamCommand(observation, episodeIndex);
  }
  if (sequenceIndex === 3) return { kind: "visitor" };
  return { kind: "weather" };
}

export function interruptLivingDay(state: LivingDayDirectorState): LivingDayDirectorState {
  return {
    activeEpisode: null,
    episodeIndex: state.episodeIndex + (state.activeEpisode ? 1 : 0),
    quietElapsedMs: 0,
  };
}

export function stepLivingDayDirector(
  state: LivingDayDirectorState,
  observation: LivingDayObservation,
  elapsedMs: number,
): LivingDayStep {
  if (state.activeEpisode) {
    if (!episodeIsComplete(state.activeEpisode, observation)) {
      return { state, command: null };
    }
    return {
      state: {
        activeEpisode: null,
        episodeIndex: state.episodeIndex + 1,
        quietElapsedMs: 0,
      },
      command: null,
    };
  }

  if (!stableForAmbientDirection(observation)) {
    return {
      state: { ...state, quietElapsedMs: 0 },
      command: null,
    };
  }

  const quietElapsedMs = state.quietElapsedMs + Math.max(0, elapsedMs);
  const quietRequired = state.episodeIndex === 0
    ? LIVING_DAY.initialQuietMs
    : LIVING_DAY.quietBetweenEpisodesMs;
  if (quietElapsedMs < quietRequired) {
    return { state: { ...state, quietElapsedMs }, command: null };
  }

  const command = commandForEpisode(observation, state.episodeIndex);
  return {
    state: {
      ...state,
      activeEpisode: command.kind,
      quietElapsedMs,
    },
    command,
  };
}
