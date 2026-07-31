import type {
  PetAnimationFrame,
  PetAnimationManifest,
  PetMotionRole,
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
const BLINK_MASKS = [
  { shape: "ellipse" as const, x: 25, y: 47, width: 21, height: 25 },
  { shape: "ellipse" as const, x: 49, y: 45, width: 24, height: 27 },
];

function blinkFrame(
  duration: number,
  layer?: { column: number; x: number; y: number },
  events?: string[],
  role: PetMotionRole = "inbetween",
): PetAnimationFrame {
  return frame(0, 1, duration, {
    events,
    role,
    layers: layer ? [{
      cell: { column: layer.column, row: 1 },
      offset: { x: layer.x, y: layer.y },
      masks: BLINK_MASKS,
    }] : [],
  });
}

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
        blinkFrame(1100, undefined, undefined, "hold"),
        blinkFrame(28, { column: 1, x: -1, y: -2 }, ["blink-start"], "key"),
        blinkFrame(32, { column: 2, x: 1, y: -7 }),
        blinkFrame(48, { column: 3, x: 3, y: -11 }, ["eyes-closed"], "accent"),
        blinkFrame(36, { column: 5, x: 1, y: -8 }),
        blinkFrame(40, { column: 6, x: -1, y: -1 }, undefined, "recovery"),
        blinkFrame(80, undefined, ["blink-open"], "recovery"),
        blinkFrame(1400, undefined, undefined, "hold"),
      ],
    },
    greet: {
      loop: false,
      frames: [
        frame(0, 2, 280, { events: ["notice"], role: "hold" }),
        frame(1, 2, 90, { events: ["anticipate"], role: "key", shadow: { width: 72, opacity: 0.24 } }),
        frame(2, 2, 70, { role: "inbetween", shadow: { width: 78, opacity: 0.25 } }),
        frame(3, 2, 60, { contact: "airborne", transform: { x: 0, y: -10 }, events: ["airborne"], role: "inbetween", shadow: { width: 42, opacity: 0.14 } }),
        frame(4, 2, 130, { contact: "airborne", transform: { x: 0, y: -18 }, events: ["apex", "chirp"], role: "accent", shadow: { width: 28, opacity: 0.1 } }),
        frame(5, 2, 65, { contact: "airborne", transform: { x: 0, y: -9 }, role: "inbetween", shadow: { width: 40, opacity: 0.14 } }),
        frame(6, 2, 90, { events: ["land"], role: "recovery", shadow: { width: 82, opacity: 0.27 } }),
        frame(7, 2, 420, { events: ["settle"], role: "hold" }),
      ],
    },
    care: {
      loop: false,
      frames: [
        frame(0, 3, 260, { events: ["notice-care"], role: "hold" }),
        frame(1, 3, 90, { role: "key" }),
        frame(2, 3, 70, { role: "inbetween", shadow: { width: 72, opacity: 0.23 } }),
        frame(3, 3, 110, { events: ["nibble"], role: "accent" }),
        frame(4, 3, 70, { events: ["nibble"], role: "inbetween" }),
        frame(5, 3, 160, { events: ["chew"], role: "accent" }),
        frame(6, 3, 220, { events: ["content"], role: "recovery" }),
        frame(7, 3, 420, { events: ["settle"], role: "hold" }),
      ],
    },
    discover: {
      loop: false,
      frames: [
        frame(0, 4, 260, { role: "hold" }),
        frame(1, 4, 70, { events: ["ears-lead"], role: "key" }),
        frame(2, 4, 70, { events: ["eyes-follow"], role: "inbetween" }),
        frame(3, 4, 110, { events: ["head-turn"], role: "key" }),
        frame(4, 4, 80, { events: ["lean"], role: "inbetween" }),
        frame(5, 4, 240, { events: ["inspect"], role: "accent" }),
        frame(6, 4, 100, { role: "recovery" }),
        frame(7, 4, 380, { events: ["settle"], role: "hold" }),
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
        frame(0, 6, 260, { events: ["brace"], role: "hold" }),
        frame(1, 6, 90, { events: ["anticipate"], role: "key", shadow: { width: 72, opacity: 0.24 } }),
        frame(2, 6, 70, { role: "inbetween", shadow: { width: 78, opacity: 0.26 } }),
        frame(3, 6, 60, { contact: "airborne", transform: { x: 0, y: -8 }, events: ["rise"], role: "inbetween", shadow: { width: 44, opacity: 0.14 } }),
        frame(4, 6, 180, { contact: "airborne", transform: { x: 0, y: -16 }, events: ["open"], role: "accent", shadow: { width: 30, opacity: 0.1 } }),
        frame(5, 6, 65, { contact: "airborne", transform: { x: 0, y: -8 }, role: "inbetween", shadow: { width: 42, opacity: 0.14 } }),
        frame(6, 6, 100, { events: ["land"], role: "recovery", shadow: { width: 86, opacity: 0.28 } }),
        frame(7, 6, 480, { events: ["proud"], role: "hold" }),
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
