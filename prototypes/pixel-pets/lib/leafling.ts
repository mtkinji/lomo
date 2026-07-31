import type {
  PetAnimationFrame,
  PetAnimationManifest,
} from "./pet-runtime";
import type { PetStage } from "./pet-state";

export type LeaflingChannelId =
  | "tail"
  | "body"
  | "feet"
  | "head"
  | "ears"
  | "face"
  | "eyes"
  | "markings";

export interface LeaflingAuthoringChannel {
  id: LeaflingChannelId;
  bounds: { x: number; y: number; width: number; height: number };
}

const GROUND_ANCHOR = { x: 64, y: 120 };

function frame(
  column: number,
  row: number,
  duration: number,
  options: Partial<Omit<PetAnimationFrame, "cell" | "duration" | "anchor">> = {},
): PetAnimationFrame {
  return {
    cell: { column, row },
    duration,
    anchor: GROUND_ANCHOR,
    contact: "planted",
    ...options,
  };
}

export const LEAFLING_MANIFEST = {
  atlas: {
    src: "/leafling-motion-atlas-v3.png",
    frameWidth: 128,
    frameHeight: 128,
    columns: 8,
    rows: 7,
  },
  fallbackClip: "idle",
  clips: {
    idle: {
      loop: true,
      frames: [
        frame(0, 0, 420),
        frame(1, 0, 180, { events: ["inhale"] }),
        frame(2, 0, 220, { events: ["attend"] }),
        frame(3, 0, 110, { events: ["blink"] }),
        frame(4, 0, 180, { events: ["exhale"] }),
        frame(5, 0, 220),
        frame(6, 0, 220),
        frame(7, 0, 420),
      ],
    },
    blink: {
      loop: true,
      frames: [
        frame(0, 1, 360),
        frame(1, 1, 80),
        frame(2, 1, 70),
        frame(3, 1, 100, { events: ["eyes-closed"] }),
        frame(4, 1, 90),
        frame(5, 1, 80),
        frame(6, 1, 140, { events: ["ear-rebound"] }),
        frame(7, 1, 360),
      ],
    },
    greet: {
      loop: false,
      frames: [
        frame(0, 2, 180, { events: ["notice"] }),
        frame(1, 2, 140, { events: ["anticipate"], shadow: { width: 72, opacity: 0.24 } }),
        frame(2, 2, 130, { shadow: { width: 78, opacity: 0.25 } }),
        frame(3, 2, 120, { contact: "airborne", transform: { x: 0, y: -10 }, events: ["airborne"], shadow: { width: 42, opacity: 0.14 } }),
        frame(4, 2, 150, { contact: "airborne", transform: { x: 0, y: -18 }, events: ["apex", "chirp"], shadow: { width: 28, opacity: 0.1 } }),
        frame(5, 2, 130, { contact: "airborne", transform: { x: 0, y: -9 }, shadow: { width: 40, opacity: 0.14 } }),
        frame(6, 2, 160, { events: ["land"], shadow: { width: 82, opacity: 0.27 } }),
        frame(7, 2, 340, { events: ["settle"] }),
      ],
    },
    care: {
      loop: false,
      frames: [
        frame(0, 3, 180, { events: ["notice-care"] }),
        frame(1, 3, 140),
        frame(2, 3, 160, { shadow: { width: 72, opacity: 0.23 } }),
        frame(3, 3, 150, { events: ["nibble"] }),
        frame(4, 3, 150, { events: ["nibble"] }),
        frame(5, 3, 180, { events: ["chew"] }),
        frame(6, 3, 190, { events: ["content"] }),
        frame(7, 3, 320, { events: ["settle"] }),
      ],
    },
    discover: {
      loop: false,
      frames: [
        frame(0, 4, 180),
        frame(1, 4, 120, { events: ["ears-lead"] }),
        frame(2, 4, 130, { events: ["eyes-follow"] }),
        frame(3, 4, 150, { events: ["head-turn"] }),
        frame(4, 4, 160, { events: ["lean"] }),
        frame(5, 4, 180, { events: ["inspect"] }),
        frame(6, 4, 180),
        frame(7, 4, 320, { events: ["settle"] }),
      ],
    },
    sleep: {
      loop: true,
      loopFrom: 4,
      frames: [
        frame(0, 5, 220, { events: ["drowsy"] }),
        frame(1, 5, 220, { contact: "resting", shadow: { width: 72, opacity: 0.23 } }),
        frame(2, 5, 240, { contact: "resting", shadow: { width: 82, opacity: 0.24 } }),
        frame(3, 5, 260, { contact: "resting", events: ["curl"], shadow: { width: 88, opacity: 0.25 } }),
        frame(4, 5, 420, { contact: "resting", events: ["asleep"], shadow: { width: 92, opacity: 0.25 } }),
        frame(5, 5, 480, { contact: "resting", events: ["sleep-inhale"], shadow: { width: 94, opacity: 0.25 } }),
        frame(6, 5, 480, { contact: "resting", events: ["sleep-exhale"], shadow: { width: 90, opacity: 0.24 } }),
        frame(7, 5, 420, { contact: "resting", shadow: { width: 92, opacity: 0.25 } }),
      ],
    },
    evolve: {
      loop: false,
      frames: [
        frame(0, 6, 180, { events: ["brace"] }),
        frame(1, 6, 160, { events: ["anticipate"], shadow: { width: 72, opacity: 0.24 } }),
        frame(2, 6, 160, { shadow: { width: 78, opacity: 0.26 } }),
        frame(3, 6, 140, { contact: "airborne", transform: { x: 0, y: -8 }, events: ["rise"], shadow: { width: 44, opacity: 0.14 } }),
        frame(4, 6, 170, { contact: "airborne", transform: { x: 0, y: -16 }, events: ["open"], shadow: { width: 30, opacity: 0.1 } }),
        frame(5, 6, 140, { contact: "airborne", transform: { x: 0, y: -8 }, shadow: { width: 42, opacity: 0.14 } }),
        frame(6, 6, 180, { events: ["land"], shadow: { width: 86, opacity: 0.28 } }),
        frame(7, 6, 420, { events: ["proud"] }),
      ],
    },
  },
} satisfies PetAnimationManifest;

export const LEAFLING_PRESENTATION = {
  stages: {
    young: { width: 44, height: 44 },
    evolved: { width: 52, height: 52 },
  } satisfies Record<PetStage, { width: number; height: number }>,
  channels: [
    { id: "tail", bounds: { x: 86, y: 48, width: 38, height: 68 } },
    { id: "body", bounds: { x: 32, y: 60, width: 68, height: 60 } },
    { id: "feet", bounds: { x: 38, y: 105, width: 56, height: 15 } },
    { id: "head", bounds: { x: 25, y: 25, width: 80, height: 74 } },
    { id: "ears", bounds: { x: 18, y: 4, width: 96, height: 60 } },
    { id: "face", bounds: { x: 36, y: 46, width: 58, height: 45 } },
    { id: "eyes", bounds: { x: 44, y: 54, width: 40, height: 17 } },
    { id: "markings", bounds: { x: 44, y: 30, width: 44, height: 84 } },
  ] satisfies LeaflingAuthoringChannel[],
} as const;
