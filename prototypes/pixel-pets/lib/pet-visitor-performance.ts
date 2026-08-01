import type { PetWeather, WorldVisitor, WorldVisitorKind } from "./pet-world.ts";

export type VisitorDrawingRole = "hold" | "inbetween" | "accent" | "recovery";
export type VisitorContact = "planted" | "airborne";
export type VisitorMaterial = "warm" | "wind" | "wet";

export interface VisitorPerformanceFrame {
  duration: number;
  role: VisitorDrawingRole;
  wingPhase: number;
  legPhase: -1 | 0 | 1;
  shellShift: -1 | 0 | 1;
  antennaLift: number;
  bodyDrop: number;
  dust: number;
}

export interface VisitorPerformanceClip {
  frames: VisitorPerformanceFrame[];
  reducedMotionFrame: number;
}

export interface VisitorPerformanceSnapshot {
  kind: WorldVisitorKind;
  frame: number;
  role: VisitorDrawingRole;
  contact: VisitorContact;
  material: VisitorMaterial;
  wingPhase: number;
  legPhase: -1 | 0 | 1;
  shellShift: -1 | 0 | 1;
  antennaLift: number;
  bodyDrop: number;
  rigDrop: number;
  glow: number;
  bank: number;
  escapeEnergy: number;
  dust: number;
}

export const VISITOR_PERFORMANCE_CLIPS = {
  crawler: {
    reducedMotionFrame: 0,
    frames: [
      { duration: 180, role: "hold", wingPhase: 0, legPhase: -1, shellShift: 0, antennaLift: 0.35, bodyDrop: 0, dust: 0 },
      { duration: 70, role: "accent", wingPhase: 0, legPhase: 1, shellShift: 1, antennaLift: 1, bodyDrop: -1, dust: 1 },
      { duration: 110, role: "inbetween", wingPhase: 0, legPhase: 0, shellShift: 0, antennaLift: 0.62, bodyDrop: 0, dust: 0.2 },
      { duration: 170, role: "hold", wingPhase: 0, legPhase: 1, shellShift: -1, antennaLift: 0.42, bodyDrop: 0, dust: 0 },
      { duration: 65, role: "accent", wingPhase: 0, legPhase: -1, shellShift: 1, antennaLift: 0.94, bodyDrop: -1, dust: 1 },
      { duration: 125, role: "recovery", wingPhase: 0, legPhase: 0, shellShift: 0, antennaLift: 0.7, bodyDrop: 0, dust: 0.15 },
    ],
  },
  firefly: {
    reducedMotionFrame: 0,
    frames: [
      { duration: 125, role: "hold", wingPhase: -0.72, legPhase: 0, shellShift: 0, antennaLift: 0.55, bodyDrop: 0, dust: 0 },
      { duration: 45, role: "accent", wingPhase: 1, legPhase: 0, shellShift: 0, antennaLift: 0.9, bodyDrop: -1, dust: 0 },
      { duration: 70, role: "inbetween", wingPhase: 0.28, legPhase: 0, shellShift: 0, antennaLift: 0.72, bodyDrop: 0, dust: 0 },
      { duration: 160, role: "hold", wingPhase: -0.42, legPhase: 0, shellShift: 0, antennaLift: 0.48, bodyDrop: 1, dust: 0 },
      { duration: 50, role: "accent", wingPhase: 0.9, legPhase: 0, shellShift: 0, antennaLift: 0.86, bodyDrop: 0, dust: 0 },
      { duration: 90, role: "recovery", wingPhase: 0.08, legPhase: 0, shellShift: 0, antennaLift: 0.64, bodyDrop: 0, dust: 0 },
    ],
  },
  "sky-moth": {
    reducedMotionFrame: 0,
    frames: [
      { duration: 185, role: "hold", wingPhase: -0.78, legPhase: 0, shellShift: 0, antennaLift: 0.62, bodyDrop: 0, dust: 0 },
      { duration: 55, role: "accent", wingPhase: 1, legPhase: 0, shellShift: 0, antennaLift: 1, bodyDrop: -1, dust: 0 },
      { duration: 85, role: "inbetween", wingPhase: 0.45, legPhase: 0, shellShift: 0, antennaLift: 0.8, bodyDrop: -1, dust: 0 },
      { duration: 170, role: "hold", wingPhase: -0.52, legPhase: 0, shellShift: 0, antennaLift: 0.58, bodyDrop: 1, dust: 0 },
      { duration: 60, role: "accent", wingPhase: 0.92, legPhase: 0, shellShift: 0, antennaLift: 0.94, bodyDrop: 0, dust: 0 },
      { duration: 105, role: "recovery", wingPhase: 0.12, legPhase: 0, shellShift: 0, antennaLift: 0.72, bodyDrop: 0, dust: 0 },
    ],
  },
} satisfies Record<WorldVisitorKind, VisitorPerformanceClip>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveFrame(clip: VisitorPerformanceClip, ageMs: number) {
  const duration = clip.frames.reduce((total, frame) => total + frame.duration, 0);
  let elapsed = ((ageMs % duration) + duration) % duration;
  for (let index = 0; index < clip.frames.length; index += 1) {
    const frame = clip.frames[index];
    if (elapsed < frame.duration) return { frame, index };
    elapsed -= frame.duration;
  }
  return { frame: clip.frames[0], index: 0 };
}

export function resolveVisitorPerformance(
  visitor: WorldVisitor,
  weather: PetWeather,
  reducedMotion: boolean,
): VisitorPerformanceSnapshot {
  const clip = VISITOR_PERFORMANCE_CLIPS[visitor.kind];
  const resolved = reducedMotion
    ? { frame: clip.frames[clip.reducedMotionFrame], index: clip.reducedMotionFrame }
    : resolveFrame(clip, visitor.ageMs);
  const escapeEnergy = visitor.engaged
    ? reducedMotion ? 1 : clamp(0.18 + visitor.engagedAgeMs / 420, 0.18, 1)
    : 0;
  const material: VisitorMaterial = weather === "rain" ? "wet" : weather === "breeze" ? "wind" : "warm";
  const weatherWingEffort = weather === "breeze" ? 1.12 : weather === "rain" ? 0.78 : 1;
  const fireflyBreath = 0.57 + Math.sin((visitor.ageMs / 940) * Math.PI * 2) * 0.12;
  const weatherGlow = weather === "sunny" ? 0.08 : weather === "rain" ? -0.14 : 0;
  const glow = visitor.kind === "firefly"
    ? clamp(reducedMotion ? 0.56 + weatherGlow : fireflyBreath + weatherGlow, 0.24, 0.82)
    : visitor.kind === "sky-moth" ? 0.12 : 0;
  const bank = visitor.kind === "sky-moth" && visitor.engaged
    ? visitor.direction * (reducedMotion ? 4 : 2 + escapeEnergy * 7)
    : 0;

  return {
    kind: visitor.kind,
    frame: resolved.index,
    role: resolved.frame.role,
    contact: visitor.kind === "crawler" ? "planted" : "airborne",
    material,
    wingPhase: reducedMotion ? resolved.frame.wingPhase : clamp(resolved.frame.wingPhase * weatherWingEffort, -1, 1),
    legPhase: resolved.frame.legPhase,
    shellShift: resolved.frame.shellShift,
    antennaLift: resolved.frame.antennaLift,
    bodyDrop: visitor.kind === "crawler" ? resolved.frame.bodyDrop : 0,
    rigDrop: visitor.kind === "crawler"
      ? 0
      : resolved.frame.bodyDrop + (weather === "rain" ? 2 : 0),
    glow,
    bank,
    escapeEnergy,
    dust: reducedMotion || visitor.kind !== "crawler" ? 0 : resolved.frame.dust * escapeEnergy,
  };
}
