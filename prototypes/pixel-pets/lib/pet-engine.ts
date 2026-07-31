export const ENGINE_SCENE = { width: 160, height: 240, groundY: 176 } as const;

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
