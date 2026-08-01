import type { PetStage } from "./pet-state";

export type EvolutionPhase = "recognize" | "gather" | "handoff" | "arrive";

export interface EvolutionComposition {
  phase: EvolutionPhase;
  previousOpacity: number;
  currentOpacity: number;
  previousScale: number;
  currentScale: number;
  currentYOffset: number;
  motesOpacity: number;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function rangeProgress(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start));
}

function phaseFor(progress: number): EvolutionPhase {
  if (progress < 0.18) return "recognize";
  if (progress < 0.42) return "gather";
  if (progress < 0.72) return "handoff";
  return "arrive";
}

export function previousStageFor(stage: PetStage): PetStage | null {
  if (stage === "young") return "baby";
  if (stage === "guardian") return "young";
  return null;
}

export function resolveEvolutionComposition(
  reportedProgress: number,
  reducedMotion: boolean,
): EvolutionComposition {
  const progress = clamp01(reportedProgress);
  const phase = phaseFor(progress);

  if (reducedMotion) {
    const handoff = rangeProgress(progress, 0.44, 0.6);
    return {
      phase,
      previousOpacity: 1 - handoff,
      currentOpacity: handoff,
      previousScale: 1,
      currentScale: 1,
      currentYOffset: 0,
      motesOpacity: 0,
    };
  }

  const previousExit = rangeProgress(progress, 0.38, 0.64);
  const currentArrival = rangeProgress(progress, 0.42, 0.78);
  const settle = rangeProgress(progress, 0.42, 0.82);
  const currentYOffset = Math.round((1 - settle) * 7);
  const motesIn = rangeProgress(progress, 0.1, 0.26);
  const motesOut = 1 - rangeProgress(progress, 0.72, 0.94);

  return {
    phase,
    previousOpacity: 1 - previousExit,
    currentOpacity: currentArrival,
    previousScale: 1 - previousExit * 0.06,
    currentScale: 0.78 + settle * 0.22,
    currentYOffset: currentYOffset === 0 ? 0 : -currentYOffset,
    motesOpacity: Math.min(motesIn, motesOut),
  };
}
