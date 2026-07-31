import type { PetAnimationManifest } from "./pet-runtime";
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

export const LEAFLING_MANIFEST = {
  atlas: {
    src: "/leafling-atlas.png",
    frameWidth: 112,
    frameHeight: 112,
    columns: 8,
    rows: 2,
  },
  fallbackClip: "idle",
  clips: {
    idle: {
      loop: true,
      frames: [
        { cell: { column: 0, row: 0 }, duration: 420 },
        { cell: { column: 1, row: 0 }, duration: 260, transform: { x: 0, y: -1 } },
        { cell: { column: 2, row: 0 }, duration: 220 },
        { cell: { column: 3, row: 0 }, duration: 120, events: ["blink"] },
        { cell: { column: 4, row: 0 }, duration: 260, transform: { x: 0, y: 1 } },
        { cell: { column: 5, row: 0 }, duration: 460 },
      ],
    },
    greet: {
      loop: false,
      frames: [
        { cell: { column: 0, row: 1 }, duration: 120 },
        { cell: { column: 1, row: 1 }, duration: 110, events: ["notice"] },
        { cell: { column: 2, row: 1 }, duration: 120, transform: { x: 0, y: 2 } },
        { cell: { column: 3, row: 1 }, duration: 110, transform: { x: 0, y: -5 } },
        { cell: { column: 4, row: 1 }, duration: 130, events: ["chirp"], transform: { x: 0, y: -8 } },
        { cell: { column: 5, row: 1 }, duration: 130, transform: { x: 0, y: 2 } },
        { cell: { column: 6, row: 1 }, duration: 180, events: ["settle"] },
        { cell: { column: 7, row: 1 }, duration: 260 },
      ],
    },
  },
} satisfies PetAnimationManifest;

export const LEAFLING_PRESENTATION = {
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
  ] satisfies LeaflingAuthoringChannel[],
} as const;
