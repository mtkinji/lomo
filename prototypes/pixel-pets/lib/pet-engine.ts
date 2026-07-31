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

export type PetColor =
  | "outline"
  | "deep"
  | "main"
  | "mid"
  | "light"
  | "leaf"
  | "leafLight"
  | "cream"
  | "cheek"
  | "white";

export interface PixelRun {
  x: number;
  y: number;
  width: number;
  height?: number;
  color: PetColor;
}

export interface RigLayer {
  id: LayerId;
  anchor: { x: number; y: number };
  pixels: PixelRun[];
  evolvedPixels?: PixelRun[];
  variants?: PixelRun[][];
}

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

const run = (
  x: number,
  y: number,
  width: number,
  color: PetColor,
  height = 1,
): PixelRun => ({ x, y, width, height, color });

function roundedRows(
  widths: number[],
  centerX: number,
  startY: number,
  color: PetColor,
): PixelRun[] {
  return widths.map((width, index) =>
    run(Math.round(centerX - width / 2), startY + index, width, color),
  );
}

const youngBody = [
  ...roundedRows([22, 28, 32, 36, 38, 40, 40, 40, 38, 36, 32, 28, 22], 28, 27, "outline"),
  ...roundedRows([20, 26, 30, 32, 34, 36, 36, 34, 32, 28, 22], 28, 29, "main"),
  run(17, 30, 12, "light", 2),
  run(36, 35, 7, "deep", 4),
  run(20, 40, 18, "mid", 2),
];

const evolvedBody = [
  ...roundedRows([28, 36, 42, 46, 48, 50, 50, 50, 48, 44, 40, 34, 28], 30, 29, "outline"),
  ...roundedRows([26, 34, 40, 42, 44, 46, 46, 44, 42, 38, 32], 30, 31, "main"),
  run(15, 33, 16, "light", 3),
  run(42, 38, 8, "deep", 5),
  run(20, 44, 22, "mid", 2),
];

const youngHead = [
  ...roundedRows([24, 32, 38, 42, 44, 44, 44, 44, 42, 40, 36, 30, 22], 28, 10, "outline"),
  ...roundedRows([22, 30, 36, 38, 40, 40, 40, 38, 36, 32, 26], 28, 12, "main"),
  run(14, 14, 15, "light", 3),
  run(37, 17, 7, "deep", 5),
];

const evolvedHead = [
  ...roundedRows([30, 40, 46, 50, 52, 52, 52, 52, 50, 48, 44, 38, 30], 30, 8, "outline"),
  ...roundedRows([28, 38, 44, 46, 48, 48, 48, 46, 44, 40, 34], 30, 10, "main"),
  run(11, 12, 19, "light", 3),
  run(43, 15, 8, "deep", 6),
];

const openEyes = [
  run(19, 21, 6, "outline", 7),
  run(36, 21, 6, "outline", 7),
  run(21, 22, 2, "white", 2),
  run(38, 22, 2, "white", 2),
];

const blinkEyes = [run(19, 25, 6, "outline", 2), run(36, 25, 6, "outline", 2)];
const lookEyes = [
  run(19, 21, 6, "outline", 7),
  run(36, 21, 6, "outline", 7),
  run(22, 22, 2, "white", 2),
  run(39, 22, 2, "white", 2),
];

export const LEAFLING_RIG = {
  young: { bounds: { width: 50, height: 52 } },
  evolved: { bounds: { width: 60, height: 64 } },
  layers: [
    {
      id: "tail",
      anchor: { x: 36, y: 28 },
      pixels: [
        run(0, 13, 17, "outline", 5), run(11, 8, 14, "outline", 7), run(19, 1, 10, "outline", 9),
        run(2, 14, 14, "leaf", 3), run(12, 10, 12, "leaf", 4), run(20, 3, 7, "leafLight", 5),
      ],
      evolvedPixels: [
        run(0, 18, 22, "outline", 6), run(15, 10, 18, "outline", 10), run(27, 0, 14, "outline", 13),
        run(2, 20, 18, "leaf", 3), run(16, 12, 15, "leaf", 6), run(29, 2, 10, "leafLight", 8),
      ],
    },
    { id: "body", anchor: { x: 0, y: 0 }, pixels: youngBody, evolvedPixels: evolvedBody },
    {
      id: "feet",
      anchor: { x: 0, y: 43 },
      pixels: [run(5, 0, 13, "outline", 5), run(31, 0, 13, "outline", 5), run(7, 1, 10, "deep", 3), run(33, 1, 10, "deep", 3)],
      evolvedPixels: [run(3, 0, 16, "outline", 6), run(37, 0, 16, "outline", 6), run(6, 1, 12, "deep", 4), run(39, 1, 12, "deep", 4)],
    },
    { id: "head", anchor: { x: 0, y: 0 }, pixels: youngHead, evolvedPixels: evolvedHead },
    {
      id: "ears",
      anchor: { x: 0, y: 0 },
      pixels: [
        run(5, 8, 12, "outline", 5), run(8, 3, 12, "outline", 5), run(12, 0, 8, "outline", 5),
        run(37, 8, 12, "outline", 5), run(34, 3, 12, "outline", 5), run(34, 0, 8, "outline", 5),
        run(8, 8, 10, "leaf", 3), run(11, 4, 8, "leafLight", 3), run(37, 8, 9, "leaf", 3), run(35, 4, 8, "leafLight", 3),
      ],
      evolvedPixels: [
        run(0, 12, 18, "outline", 6), run(5, 5, 17, "outline", 7), run(12, 0, 11, "outline", 7),
        run(42, 12, 18, "outline", 6), run(38, 5, 17, "outline", 7), run(37, 0, 11, "outline", 7),
        run(3, 13, 14, "leaf", 3), run(8, 7, 12, "leafLight", 4), run(43, 13, 14, "leaf", 3), run(40, 7, 12, "leafLight", 4),
      ],
    },
    {
      id: "face",
      anchor: { x: 0, y: 0 },
      pixels: [run(17, 29, 24, "cream", 8), run(20, 31, 18, "light", 5), run(27, 34, 5, "outline", 2), run(13, 30, 4, "cheek", 3), run(41, 30, 4, "cheek", 3)],
      evolvedPixels: [run(17, 29, 28, "cream", 9), run(21, 31, 20, "light", 6), run(29, 35, 5, "outline", 2), run(12, 31, 5, "cheek", 3), run(45, 31, 5, "cheek", 3)],
    },
    { id: "eyes", anchor: { x: 0, y: 0 }, pixels: openEyes, variants: [openEyes, blinkEyes, lookEyes] },
    {
      id: "markings",
      anchor: { x: 0, y: 0 },
      pixels: [run(26, 4, 4, "leafLight", 5), run(23, 7, 10, "leaf", 3), run(27, 1, 3, "outline", 3)],
      evolvedPixels: [run(28, 1, 5, "leafLight", 7), run(23, 6, 15, "leaf", 4), run(29, 0, 3, "outline", 4), run(17, 8, 5, "leafLight", 4), run(39, 8, 5, "leafLight", 4)],
    },
  ] satisfies RigLayer[],
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

export function pixelsForLayer(layer: RigLayer, stage: PetStage, variant: number): PixelRun[] {
  if (layer.id === "eyes" && layer.variants?.[variant]) return layer.variants[variant];
  if (stage === "evolved" && layer.evolvedPixels) return layer.evolvedPixels;
  return layer.pixels;
}
