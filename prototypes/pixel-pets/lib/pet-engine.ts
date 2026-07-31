import type { PetGroundContact } from "./pet-runtime";

export const ENGINE_SCENE = { width: 160, height: 240, groundY: 208 } as const;

export interface PetGroundCue {
  width: number;
  height: 1;
  yOffset: 1;
  opacity: number;
}

export function resolveGroundCue(
  contact: PetGroundContact,
  authoredWidth: number,
  authoredOpacity: number,
  scale: number,
): PetGroundCue {
  const widthFactor = contact === "resting" ? 0.34 : contact === "airborne" ? 0.42 : 0.18;
  const opacityCap = contact === "resting" ? 0.16 : 0.14;

  return {
    width: Math.max(4, Math.round(authoredWidth * scale * widthFactor)),
    height: 1,
    yOffset: 1,
    opacity: Math.min(authoredOpacity, opacityCap),
  };
}

export type EngineMotion =
  | "idle"
  | "blink"
  | "greet"
  | "care"
  | "discover"
  | "sleep"
  | "evolve";

export type AuthoredClip = EngineMotion;

export const MOTION_CLIPS: Record<EngineMotion, AuthoredClip> = {
  idle: "idle",
  blink: "blink",
  greet: "greet",
  care: "care",
  discover: "discover",
  sleep: "sleep",
  evolve: "evolve",
};

export function clipForMotion(motion: EngineMotion): AuthoredClip {
  return MOTION_CLIPS[motion];
}
