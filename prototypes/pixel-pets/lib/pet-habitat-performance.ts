import type { PetWeather } from "./pet-world.ts";

export type HabitatMaterial = "warm" | "wind" | "wet";
export type HabitatDrawingRole = "hold" | "gather" | "accent" | "recovery";

export interface HabitatPerformanceFrame {
  duration: number;
  role: HabitatDrawingRole;
  grassLean: number;
  canopyLead: number;
  canopyFollow: number;
  canopyDrop: number;
  vineLag: number;
  dapple: number;
  drip: number;
  looseLeaf: number;
}

export interface HabitatPerformanceClip {
  frames: HabitatPerformanceFrame[];
  reducedMotionFrame: number;
}

export interface HabitatPerformanceSnapshot {
  material: HabitatMaterial;
  frame: number;
  role: HabitatDrawingRole;
  rootShift: 0;
  trunkRotation: 0;
  grassLean: number;
  canopyLead: number;
  canopyFollow: number;
  canopyDrop: number;
  vineLag: number;
  dapple: number;
  drip: number;
  looseLeaf: number;
}

export const HABITAT_PERFORMANCE_CLIPS = {
  sunny: {
    reducedMotionFrame: 0,
    frames: [
      { duration: 520, role: "hold", grassLean: 0, canopyLead: 0, canopyFollow: 0, canopyDrop: 0, vineLag: 0, dapple: 0.34, drip: 0, looseLeaf: 0 },
      { duration: 210, role: "gather", grassLean: 0.35, canopyLead: 0.3, canopyFollow: 0.12, canopyDrop: 0, vineLag: -0.1, dapple: 0.66, drip: 0, looseLeaf: 0 },
      { duration: 125, role: "accent", grassLean: 0.6, canopyLead: 0.55, canopyFollow: 0.28, canopyDrop: 0, vineLag: -0.18, dapple: 0.9, drip: 0, looseLeaf: 0 },
      { duration: 390, role: "recovery", grassLean: -0.18, canopyLead: -0.2, canopyFollow: 0.18, canopyDrop: 0, vineLag: 0.3, dapple: 0.5, drip: 0, looseLeaf: 0 },
    ],
  },
  breeze: {
    reducedMotionFrame: 0,
    frames: [
      { duration: 210, role: "hold", grassLean: 0.6, canopyLead: 0.3, canopyFollow: 0.1, canopyDrop: 0, vineLag: -0.2, dapple: 0.22, drip: 0, looseLeaf: 0 },
      { duration: 100, role: "gather", grassLean: 4.4, canopyLead: 1.2, canopyFollow: 0.45, canopyDrop: 0, vineLag: -0.8, dapple: 0.28, drip: 0, looseLeaf: 0 },
      { duration: 65, role: "accent", grassLean: 6.8, canopyLead: 4.8, canopyFollow: 2.2, canopyDrop: -0.25, vineLag: -1.4, dapple: 0.32, drip: 0, looseLeaf: 1 },
      { duration: 145, role: "recovery", grassLean: -1.8, canopyLead: 1.4, canopyFollow: 3.1, canopyDrop: 0, vineLag: -2.8, dapple: 0.2, drip: 0, looseLeaf: 0.32 },
      { duration: 240, role: "hold", grassLean: -0.4, canopyLead: -0.6, canopyFollow: 0.8, canopyDrop: 0, vineLag: 1.4, dapple: 0.18, drip: 0, looseLeaf: 0 },
      { duration: 170, role: "recovery", grassLean: 0.3, canopyLead: 0, canopyFollow: -0.35, canopyDrop: 0, vineLag: 0.5, dapple: 0.2, drip: 0, looseLeaf: 0 },
    ],
  },
  rain: {
    reducedMotionFrame: 0,
    frames: [
      { duration: 230, role: "hold", grassLean: 0.3, canopyLead: 0.15, canopyFollow: 0, canopyDrop: 1.4, vineLag: -0.1, dapple: 0.04, drip: 0.28, looseLeaf: 0 },
      { duration: 90, role: "gather", grassLean: 2.1, canopyLead: 0.8, canopyFollow: 0.25, canopyDrop: 1.8, vineLag: -0.5, dapple: 0.03, drip: 0.56, looseLeaf: 0 },
      { duration: 70, role: "accent", grassLean: 3.2, canopyLead: 2.3, canopyFollow: 1.1, canopyDrop: 2.5, vineLag: -0.9, dapple: 0.02, drip: 1, looseLeaf: 0.18 },
      { duration: 180, role: "recovery", grassLean: -0.7, canopyLead: 0.65, canopyFollow: 1.6, canopyDrop: 2, vineLag: -1.7, dapple: 0.03, drip: 0.7, looseLeaf: 0 },
      { duration: 310, role: "hold", grassLean: -0.2, canopyLead: -0.35, canopyFollow: 0.4, canopyDrop: 1.6, vineLag: 0.8, dapple: 0.04, drip: 0.4, looseLeaf: 0 },
      { duration: 145, role: "accent", grassLean: 1.2, canopyLead: 0.45, canopyFollow: -0.2, canopyDrop: 2.2, vineLag: 0.2, dapple: 0.02, drip: 0.86, looseLeaf: 0 },
    ],
  },
} satisfies Record<PetWeather, HabitatPerformanceClip>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function resolveHabitatPerformanceIntensity(
  weatherIntensity: number,
  focusHush: number,
) {
  const weather = clamp(weatherIntensity, 0, 1);
  const hush = clamp(focusHush, 0, 1);
  return weather * (1 - hush * 0.82);
}

function resolveFrame(clip: HabitatPerformanceClip, elapsedMs: number) {
  const duration = clip.frames.reduce((total, frame) => total + frame.duration, 0);
  let elapsed = ((elapsedMs % duration) + duration) % duration;
  for (let index = 0; index < clip.frames.length; index += 1) {
    const frame = clip.frames[index];
    if (elapsed < frame.duration) return { frame, index };
    elapsed -= frame.duration;
  }
  return { frame: clip.frames[0], index: 0 };
}

export function resolveHabitatPerformance(
  weather: PetWeather,
  intensity: number,
  elapsedMs: number,
  reducedMotion: boolean,
): HabitatPerformanceSnapshot {
  const clip = HABITAT_PERFORMANCE_CLIPS[weather];
  const resolved = reducedMotion
    ? { frame: clip.frames[clip.reducedMotionFrame], index: clip.reducedMotionFrame }
    : resolveFrame(clip, elapsedMs);
  const strength = reducedMotion ? 0 : clamp(intensity, 0, 1);
  const frame = resolved.frame;

  return {
    material: weather === "rain" ? "wet" : weather === "breeze" ? "wind" : "warm",
    frame: resolved.index,
    role: frame.role,
    rootShift: 0,
    trunkRotation: 0,
    grassLean: frame.grassLean * strength,
    canopyLead: frame.canopyLead * strength,
    canopyFollow: frame.canopyFollow * strength,
    canopyDrop: frame.canopyDrop * strength,
    vineLag: frame.vineLag * strength,
    dapple: reducedMotion ? frame.dapple * clamp(intensity, 0, 1) : frame.dapple * strength,
    drip: reducedMotion ? 0 : frame.drip * strength,
    looseLeaf: reducedMotion ? 0 : frame.looseLeaf * strength,
  };
}
