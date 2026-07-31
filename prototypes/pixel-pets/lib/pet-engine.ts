import type { PetStage } from "./pet-state";

export const ENGINE_SCENE = { width: 160, height: 240 } as const;

export type EngineMotion =
  | "idle"
  | "blink"
  | "greet"
  | "care"
  | "discover"
  | "sleep"
  | "evolve";

export type LayerId =
  | "tail"
  | "body"
  | "feet"
  | "head"
  | "ears"
  | "face"
  | "eyes"
  | "markings";

export interface LayerPose {
  x: number;
  y: number;
  frame: number;
}

export interface AnimationSnapshot {
  motion: EngineMotion;
  frame: number;
  frameCount: number;
  progress: number;
  layers: Record<LayerId, LayerPose>;
}

export interface AtlasChannel {
  id: LayerId;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * One authored character atlas is the visual source of truth. Channels describe
 * the places an animator may redraw between frames; they do not assemble the Pet
 * from geometric primitives at runtime.
 */
export const LEAFLING_ATLAS = {
  src: "/leafling-idle-strip.png",
  frameWidth: 112,
  frameHeight: 112,
  frameCount: 4,
  stages: {
    young: { width: 104, height: 104 },
    evolved: { width: 124, height: 124 },
  } satisfies Record<PetStage, { width: number; height: number }>,
  channels: [
    { id: "tail", bounds: { x: 76, y: 43, width: 34, height: 57 } },
    { id: "body", bounds: { x: 28, y: 52, width: 60, height: 55 } },
    { id: "feet", bounds: { x: 33, y: 94, width: 51, height: 14 } },
    { id: "head", bounds: { x: 22, y: 24, width: 70, height: 65 } },
    { id: "ears", bounds: { x: 17, y: 4, width: 84, height: 52 } },
    { id: "face", bounds: { x: 31, y: 42, width: 52, height: 39 } },
    { id: "eyes", bounds: { x: 39, y: 49, width: 35, height: 15 } },
    { id: "markings", bounds: { x: 39, y: 27, width: 37, height: 72 } },
  ] satisfies AtlasChannel[],
} as const;

interface MotionFrame {
  duration: number;
  layers?: Partial<Record<LayerId, Partial<LayerPose>>>;
}

const MOTIONS: Record<EngineMotion, { loop: boolean; frames: MotionFrame[] }> = {
  idle: {
    loop: true,
    frames: [
      { duration: 520 },
      { duration: 520, layers: { body: { y: -1 }, head: { y: -1 }, ears: { y: -1 } } },
      { duration: 140, layers: { eyes: { frame: 1 } } },
      { duration: 520 },
    ],
  },
  blink: {
    loop: true,
    frames: [{ duration: 180 }, { duration: 150, layers: { eyes: { frame: 1 } } }, { duration: 260 }],
  },
  greet: {
    loop: false,
    frames: [
      { duration: 120 },
      { duration: 120, layers: { body: { y: -4 }, head: { y: -5 }, ears: { y: -7 }, tail: { x: 2, y: -2 }, eyes: { frame: 2 } } },
      { duration: 120, layers: { body: { y: -7 }, head: { y: -8 }, ears: { y: -10 }, tail: { x: -2, y: -4 }, eyes: { frame: 2 } } },
      { duration: 140, layers: { body: { y: -2 }, head: { y: -3 }, ears: { y: -4 }, tail: { x: 2 }, eyes: { frame: 2 } } },
      { duration: 260 },
    ],
  },
  care: {
    loop: false,
    frames: [
      { duration: 180, layers: { head: { y: 2 }, face: { y: 2 }, eyes: { y: 2 } } },
      { duration: 160, layers: { head: { y: 5 }, face: { y: 5 }, eyes: { y: 5, frame: 1 }, ears: { y: 3 } } },
      { duration: 160, layers: { head: { y: 3 }, face: { y: 3 }, eyes: { y: 3 } } },
      { duration: 180, layers: { head: { y: 5 }, face: { y: 5 }, eyes: { y: 5, frame: 1 }, ears: { y: 3 } } },
      { duration: 300, layers: { tail: { x: 3 }, eyes: { frame: 2 } } },
    ],
  },
  discover: {
    loop: false,
    frames: [
      { duration: 220, layers: { eyes: { frame: 2 } } },
      { duration: 180, layers: { head: { x: 2, y: -2 }, face: { x: 2, y: -2 }, eyes: { x: 2, y: -2, frame: 2 }, ears: { x: 1, y: -3 } } },
      { duration: 180, layers: { head: { x: -2, y: -2 }, face: { x: -2, y: -2 }, eyes: { x: -2, y: -2, frame: 2 }, ears: { x: -1, y: -3 } } },
      { duration: 320, layers: { tail: { x: 3 }, eyes: { frame: 2 } } },
    ],
  },
  sleep: {
    loop: true,
    frames: [
      { duration: 700, layers: { body: { y: 4 }, head: { y: 7 }, face: { y: 7 }, eyes: { y: 7, frame: 1 }, ears: { y: 6 }, tail: { y: 3 } } },
      { duration: 700, layers: { body: { y: 5 }, head: { y: 8 }, face: { y: 8 }, eyes: { y: 8, frame: 1 }, ears: { y: 7 }, tail: { y: 4 } } },
    ],
  },
  evolve: {
    loop: false,
    frames: [
      { duration: 160, layers: { eyes: { frame: 1 } } },
      { duration: 160, layers: { body: { y: -3 }, head: { y: -4 }, ears: { y: -5 }, markings: { y: -5 } } },
      { duration: 160, layers: { body: { y: 2 }, head: { y: 2 }, ears: { y: 2 }, markings: { y: 2 } } },
      { duration: 160, layers: { body: { y: -5 }, head: { y: -6 }, ears: { y: -8 }, markings: { y: -8 }, eyes: { frame: 2 } } },
      { duration: 360, layers: { tail: { x: 4 }, eyes: { frame: 2 } } },
    ],
  },
};

const LAYER_IDS: LayerId[] = ["tail", "body", "feet", "head", "ears", "face", "eyes", "markings"];

const SPRITE_FRAMES: Record<EngineMotion, number[]> = {
  idle: [0, 1, 2, 0],
  blink: [0, 2, 0],
  greet: [0, 1, 3, 1, 0],
  care: [3, 2, 0, 2, 3],
  discover: [0, 3, 1, 3],
  sleep: [2, 2],
  evolve: [0, 1, 2, 3, 3],
};

export function animationFrameAt(
  motion: EngineMotion,
  elapsedMs: number,
  reducedMotion: boolean,
): AnimationSnapshot {
  const clip = MOTIONS[motion];
  const total = clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
  const playhead = clip.loop
    ? Math.max(0, elapsedMs) % total
    : Math.min(Math.max(0, elapsedMs), total - 1);

  let frameIndex = 0;
  let cursor = 0;
  for (let index = 0; index < clip.frames.length; index += 1) {
    cursor += clip.frames[index].duration;
    if (playhead < cursor) {
      frameIndex = index;
      break;
    }
  }

  const frame = clip.frames[frameIndex];
  const layers = Object.fromEntries(
    LAYER_IDS.map((id) => {
      const pose = frame.layers?.[id] ?? {};
      return [id, {
        x: reducedMotion ? 0 : Math.round(pose.x ?? 0),
        y: reducedMotion ? 0 : Math.round(pose.y ?? 0),
        frame: Math.round(pose.frame ?? 0),
      }];
    }),
  ) as Record<LayerId, LayerPose>;

  return {
    motion,
    frame: frameIndex,
    frameCount: clip.frames.length,
    progress: total === 0 ? 0 : playhead / total,
    layers,
  };
}

export function spriteFrameForSnapshot(snapshot: AnimationSnapshot): number {
  return SPRITE_FRAMES[snapshot.motion][snapshot.frame] ?? 0;
}
