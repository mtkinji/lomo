import type { PetStage } from "./pet-state";
import { PET_WORLD } from "./pet-world.ts";

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

export interface EvolutionAtmosphere {
  cameraPush: number;
  cameraCentering: number;
  lightOpacity: number;
  canopyImpulse: number;
  groundWake: number;
  wakeProgress: number;
  wakeRadius: number;
}

export interface EvolutionCameraFrame {
  cameraX: number;
  zoom: number;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function rangeProgress(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start));
}

function pulseBetween(value: number, start: number, end: number) {
  if (value <= start || value >= end) return 0;
  return Math.sin(rangeProgress(value, start, end) * Math.PI);
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

export function resolveEvolutionAtmosphere(
  reportedProgress: number,
  stage: PetStage,
  reducedMotion: boolean,
): EvolutionAtmosphere {
  const progress = clamp01(reportedProgress);
  const strength = stage === "guardian" ? 1 : stage === "young" ? 0.62 : 0.38;

  if (reducedMotion) {
    const quietArrival = progress > 0.14 && progress < 0.9;
    return {
      cameraPush: 0,
      cameraCentering: 0,
      lightOpacity: quietArrival ? strength * 0.16 : 0,
      canopyImpulse: 0,
      groundWake: 0,
      wakeProgress: 0,
      wakeRadius: 0,
    };
  }

  const gathering = pulseBetween(progress, 0.04, 0.9);
  const arriving = pulseBetween(progress, 0.62, 0.98);
  const wakeProgress = arriving > 0 ? rangeProgress(progress, 0.62, 0.98) : 0;
  const groundWake = arriving * (stage === "guardian" ? 0.95 : stage === "young" ? 0.26 : 0.12);

  return {
    cameraPush: gathering * (0.09 + strength * 0.18),
    cameraCentering: gathering * 0.86,
    lightOpacity: Math.max(gathering * 0.3, arriving * 0.22) * strength,
    canopyImpulse: (gathering * 2.4 + arriving * (1.4 + strength * 4.6)) * strength,
    groundWake,
    wakeProgress,
    wakeRadius: groundWake > 0
      ? Math.round((stage === "guardian" ? 92 : stage === "young" ? 54 : 36) * wakeProgress)
      : 0,
  };
}

export function resolveEvolutionCameraFrame(
  cameraX: number,
  petX: number,
  worldZoom: number,
  atmosphere: EvolutionAtmosphere,
): EvolutionCameraFrame {
  const zoom = Math.min(PET_WORLD.maxZoom, Math.max(worldZoom, 1 + atmosphere.cameraPush));
  const desiredCameraX = cameraX + (petX - cameraX) * atmosphere.cameraCentering;
  const halfView = PET_WORLD.viewportWidth / (2 * zoom);
  return {
    cameraX: Math.min(PET_WORLD.width - halfView, Math.max(halfView, desiredCameraX)),
    zoom,
  };
}
