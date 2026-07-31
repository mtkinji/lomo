export const ENGINE_SCENE = { width: 160, height: 240 } as const;

export type EngineMotion =
  | "idle"
  | "blink"
  | "greet"
  | "care"
  | "discover"
  | "sleep"
  | "evolve";

export type AuthoredClip = "idle" | "greet";

export const MOTION_CLIPS: Record<EngineMotion, AuthoredClip> = {
  idle: "idle",
  blink: "idle",
  greet: "greet",
  care: "greet",
  discover: "greet",
  sleep: "idle",
  evolve: "greet",
};

export function clipForMotion(motion: EngineMotion): AuthoredClip {
  return MOTION_CLIPS[motion];
}
