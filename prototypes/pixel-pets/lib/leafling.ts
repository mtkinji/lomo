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

const GROUND_ANCHOR = { x: 80, y: 120 };
const BLINK_MASKS = [
  { shape: "ellipse" as const, x: 41, y: 47, width: 21, height: 25 },
  { shape: "ellipse" as const, x: 65, y: 45, width: 24, height: 27 },
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

function youngWeatherClips() {
  return {
    "weather-notice": {
      loop: false,
      frames: [
        frame(0, 4, 360, { events: ["sky-still"], role: "hold" }),
        frame(1, 4, 80, { events: ["ears-read-air"], role: "key" }),
        frame(2, 4, 90, { events: ["eyes-lift"], role: "inbetween" }),
        frame(3, 4, 240, { events: ["weather-understood"], role: "accent" }),
        frame(0, 4, 430, { events: ["ready"], role: "recovery" }),
      ],
    },
    "wind-brace": {
      loop: false,
      frames: [
        frame(0, 10, 220, { events: ["gust-heard"], role: "hold" }),
        frame(1, 10, 90, { events: ["lower-weight"], role: "key" }),
        frame(2, 10, 560, { events: ["brace"], role: "accent" }),
        frame(1, 10, 130, { events: ["leaf-rebound"], role: "inbetween" }),
        frame(0, 0, 420, { events: ["grounded-recovery"], role: "recovery" }),
      ],
    },
    "rain-flinch": {
      loop: false,
      frames: [
        frame(0, 4, 250, { events: ["first-drop"], role: "hold" }),
        frame(1, 2, 70, { events: ["tuck"], role: "key" }),
        frame(2, 2, 90, { events: ["compress"], role: "inbetween" }),
        frame(6, 2, 80, { events: ["shake-off"], role: "accent" }),
        frame(0, 0, 320, { events: ["find-cover"], role: "recovery" }),
      ],
    },
    "sun-bask": {
      loop: true,
      frames: [
        frame(2, 0, 260, { events: ["warmth-found"], role: "key" }),
        frame(3, 0, 90, { events: ["eyes-close"], role: "inbetween" }),
        frame(4, 0, 520, { events: ["bask-inhale"], role: "accent" }),
        frame(5, 0, 340, { events: ["bask-exhale"], role: "recovery" }),
        frame(4, 0, 460, { events: ["content"], role: "hold" }),
      ],
    },
  };
}

function stageSunBaskClip(row: number) {
  if (row === 0) {
    return {
      loop: true,
      loopFrom: 4,
      frames: [
        stageFrame(0, row, 280, { events: ["warmth-found"], role: "hold" }),
        stageFrame(2, row, 90, { events: ["eyes-close"], role: "key" }),
        stageFrame(5, row, 180, { contact: "resting", events: ["lower"], role: "inbetween" }),
        stageFrame(6, row, 240, { contact: "resting", events: ["curl-warm"], role: "recovery" }),
        stageFrame(7, row, 560, { contact: "resting", events: ["bask-inhale"], role: "accent" }),
        stageFrame(7, row, 640, { contact: "resting", events: ["bask-exhale"], role: "hold" }),
      ],
    };
  }

  return {
    loop: true,
    frames: [
      stageFrame(0, row, 320, { events: ["warmth-found"], role: "hold" }),
      stageFrame(3, row, 120, { events: ["face-lift"], role: "key" }),
      stageFrame(2, row, 680, { events: ["bask-inhale"], role: "accent" }),
      stageFrame(3, row, 220, { events: ["bask-exhale"], role: "recovery" }),
      stageFrame(2, row, 580, { events: ["content"], role: "hold" }),
    ],
  };
}

function stageWeatherClips(row: number, pounceRow: number) {
  return {
    "weather-notice": {
      loop: false,
      frames: [
        stageFrame(0, row, 390, { events: ["sky-still"], role: "hold" }),
        stageFrame(3, row, 90, { events: ["ears-read-air"], role: "key" }),
        stageFrame(3, row, 250, { events: ["weather-understood"], role: "accent" }),
        stageFrame(0, row, 470, { events: ["ready"], role: "recovery" }),
      ],
    },
    "wind-brace": {
      loop: false,
      frames: [
        stageFrame(0, pounceRow, 230, { events: ["gust-heard"], role: "hold" }),
        stageFrame(1, pounceRow, 80, { events: ["lower-weight"], role: "key" }),
        stageFrame(2, pounceRow, row === 0 ? 420 : 660, { events: ["brace"], role: "accent" }),
        stageFrame(1, pounceRow, row === 0 ? 95 : 160, { events: ["leaf-rebound"], role: "inbetween" }),
        stageFrame(0, row, row === 0 ? 320 : 520, { events: ["grounded-recovery"], role: "recovery" }),
      ],
    },
    "rain-flinch": {
      loop: false,
      frames: [
        stageFrame(3, row, 240, { events: ["first-drop"], role: "hold" }),
        stageFrame(1, pounceRow, 70, { events: ["tuck"], role: "key" }),
        stageFrame(2, pounceRow, 90, { events: ["compress"], role: "inbetween" }),
        stageFrame(3, row, 80, { events: ["shake-off"], role: "accent" }),
        stageFrame(0, row, 340, { events: ["find-cover"], role: "recovery" }),
      ],
    },
    "sun-bask": stageSunBaskClip(row),
  };
}

export const LEAFLING_MANIFEST = {
  atlas: {
    src: "/leafling-motion-atlas-v5.png",
    frameWidth: 160,
    frameHeight: 128,
    columns: 8,
    rows: 12,
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
    affection: {
      loop: false,
      frames: [
        frame(0, 4, 240, { events: ["contact-noticed"], role: "hold" }),
        frame(4, 4, 90, { events: ["lean-to-touch"], role: "key" }),
        frame(6, 3, 130, { events: ["nuzzle"], role: "inbetween" }),
        frame(6, 3, 360, { events: ["content"], role: "accent" }),
        frame(7, 3, 120, { events: ["follow-through"], role: "inbetween" }),
        frame(0, 0, 380, { events: ["settle"], role: "recovery" }),
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
    walk: {
      loop: true,
      frames: gaitFrames(7, "walk"),
    },
    run: {
      loop: true,
      frames: gaitFrames(8, "run"),
    },
    jump: {
      loop: false,
      frames: interactionFrames(9, "jump"),
    },
    pounce: {
      loop: false,
      frames: interactionFrames(10, "pounce"),
    },
    rollover: {
      loop: false,
      frames: interactionFrames(11, "rollover"),
    },
    ...youngWeatherClips(),
  },
} satisfies PetAnimationManifest;

function stageFrame(
  column: number,
  row: number,
  duration: number,
  options: Partial<Omit<PetAnimationFrame, "cell" | "duration" | "anchor">> = {},
): PetAnimationFrame {
  return frame(column, row, duration, options);
}

function gaitFrames(row: number, motion: "walk" | "run"): PetAnimationFrame[] {
  const durations = motion === "walk"
    ? [120, 90, 100, 105, 120, 90, 100, 105]
    : [70, 45, 65, 55, 70, 50, 65, 55];
  const airborne = motion === "run" ? new Set([1, 2, 5, 6]) : new Set<number>();
  const events = motion === "walk"
    ? [["step-left"], [], ["pass"], [], ["step-right"], [], ["pass"], []]
    : [["push"], ["flight"], ["reach"], ["contact"], ["push"], ["flight"], ["reach"], ["contact"]];

  return durations.map((duration, column) => frame(column, row, duration, {
    contact: airborne.has(column) ? "airborne" : "planted",
    events: events[column],
    role: column === 0 || column === 4 ? "key" : column === 3 || column === 7 ? "accent" : "inbetween",
    shadow: airborne.has(column)
      ? { width: motion === "run" ? 38 : 56, opacity: 0.12 }
      : { width: motion === "run" ? 64 : 58, opacity: 0.2 },
  }));
}

function interactionFrames(row: number, motion: "jump" | "pounce" | "rollover"): PetAnimationFrame[] {
  const durations = {
    jump: [150, 70, 55, 60, 140, 60, 85, 220],
    pounce: [150, 80, 60, 55, 80, 85, 100, 110],
    rollover: [160, 100, 90, 140, 130, 100, 110, 370],
  }[motion];
  const airborne = motion === "jump" ? new Set([2, 3, 4, 5]) : motion === "pounce" ? new Set([3, 4]) : new Set<number>();
  const resting = motion === "rollover" ? new Set([1, 2, 3, 4, 5, 6]) : new Set<number>();
  const events = {
    jump: [["notice-high"], ["coil"], ["takeoff"], ["rise"], ["apex", "chirp"], ["descend"], ["land"], ["settle"]],
    pounce: [["acquire"], ["lower"], ["coil"], ["launch"], ["reach"], ["contact"], ["inspect"], ["rebound"]],
    rollover: [["invite"], ["lower"], ["shoulder-turn"], ["back-roll"], ["belly-up"], ["other-side"], ["uncurl"], ["proud"]],
  }[motion];

  return durations.map((duration, column) => frame(column, row, duration, {
    contact: airborne.has(column) ? "airborne" : resting.has(column) ? "resting" : "planted",
    events: events[column],
    role: column === 0 ? "hold" : column === 1 || column === 2 ? "key" : column === 4 ? "accent" : column >= 6 ? "recovery" : "inbetween",
    shadow: airborne.has(column)
      ? { width: motion === "pounce" ? 34 : 28, opacity: 0.1 }
      : resting.has(column)
        ? { width: 88, opacity: 0.24 }
        : { width: 68, opacity: 0.2 },
  }));
}

function aerialFrames(row: number): PetAnimationFrame[] {
  const durations = [180, 70, 55, 65, 75, 150, 110, 260];
  const events = ["sightline", "coil", "launch", "rise", "bank", "reach", "land", "settle"];
  const lifts = [0, 0, -10, -28, -38, -45, 0, 0];
  const airborne = new Set([2, 3, 4, 5]);

  return durations.map((duration, column) => frame(column, row, duration, {
    contact: airborne.has(column) ? "airborne" : "planted",
    events: [events[column]],
    role: column === 0
      ? "hold"
      : column === 1 || column === 2
        ? "key"
        : column === 5
          ? "accent"
          : column >= 6
            ? "recovery"
            : "inbetween",
    transform: { x: 0, y: lifts[column] },
    shadow: airborne.has(column)
      ? { width: column === 5 ? 24 : 32, opacity: column === 5 ? 0.08 : 0.1 }
      : { width: column === 6 ? 82 : 68, opacity: column === 6 ? 0.24 : 0.2 },
  }));
}

function createStageManifest(
  row: number,
  walkRow: number,
  runRow: number,
  jumpRow: number,
  pounceRow: number,
  rolloverRow: number,
  aerialRow?: number,
): PetAnimationManifest {
  const clips = {
    idle: {
      loop: true,
      frames: [
        stageFrame(0, row, 720, { role: "hold" }),
        stageFrame(1, row, 150, { events: ["inhale"], role: "key" }),
        stageFrame(0, row, 520, { events: ["exhale"], role: "recovery" }),
        stageFrame(3, row, 260, { events: ["attend"], role: "accent" }),
        stageFrame(0, row, 760, { role: "hold" }),
      ],
    },
    blink: {
      loop: true,
      frames: [
        stageFrame(0, row, 1200, { role: "hold" }),
        stageFrame(2, row, 34, { events: ["blink-start", "eyes-closed"], role: "accent" }),
        stageFrame(0, row, 66, { events: ["blink-open"], role: "recovery" }),
        stageFrame(0, row, 1450, { role: "hold" }),
      ],
    },
    greet: {
      loop: false,
      frames: [
        stageFrame(0, row, 260, { events: ["notice"], role: "hold" }),
        stageFrame(3, row, 90, { events: ["anticipate"], role: "key" }),
        stageFrame(4, row, 75, { contact: "airborne", transform: { x: 0, y: -9 }, events: ["airborne"], role: "inbetween", shadow: { width: 38, opacity: 0.13 } }),
        stageFrame(4, row, 145, { contact: "airborne", transform: { x: 0, y: -17 }, events: ["apex", "chirp"], role: "accent", shadow: { width: 26, opacity: 0.09 } }),
        stageFrame(4, row, 70, { contact: "airborne", transform: { x: 0, y: -7 }, role: "inbetween", shadow: { width: 40, opacity: 0.14 } }),
        stageFrame(0, row, 110, { events: ["land"], role: "recovery" }),
        stageFrame(0, row, 420, { events: ["settle"], role: "hold" }),
      ],
    },
    affection: {
      loop: false,
      frames: [
        stageFrame(0, row, 260, { events: ["contact-noticed"], role: "hold" }),
        stageFrame(3, row, 90, { events: ["lean-to-touch"], role: "key" }),
        stageFrame(5, row, 130, { events: ["nuzzle"], role: "inbetween" }),
        stageFrame(4, row, 360, { events: ["content"], role: "accent" }),
        stageFrame(5, row, 100, { events: ["follow-through"], role: "inbetween" }),
        stageFrame(0, row, 380, { events: ["settle"], role: "recovery" }),
      ],
    },
    care: {
      loop: false,
      frames: [
        stageFrame(0, row, 260, { events: ["notice-care"], role: "hold" }),
        stageFrame(5, row, 130, { events: ["nuzzle"], role: "key" }),
        stageFrame(4, row, 180, { events: ["content"], role: "accent" }),
        stageFrame(0, row, 380, { events: ["settle"], role: "recovery" }),
      ],
    },
    discover: {
      loop: false,
      frames: [
        stageFrame(0, row, 260, { role: "hold" }),
        stageFrame(3, row, 110, { events: ["ears-lead", "eyes-follow"], role: "key" }),
        stageFrame(3, row, 260, { events: ["inspect"], role: "accent" }),
        stageFrame(0, row, 360, { events: ["settle"], role: "recovery" }),
      ],
    },
    sleep: {
      loop: true,
      loopFrom: 3,
      frames: [
        stageFrame(0, row, 260, { events: ["drowsy"], role: "hold" }),
        stageFrame(5, row, 220, { contact: "resting", events: ["lower"], role: "key" }),
        stageFrame(6, row, 280, { contact: "resting", events: ["curl"], role: "inbetween" }),
        stageFrame(7, row, 560, { contact: "resting", events: ["asleep", "sleep-inhale"], role: "accent" }),
        stageFrame(7, row, 620, { contact: "resting", events: ["sleep-exhale"], role: "hold" }),
      ],
    },
    evolve: {
      loop: false,
      frames: [
        stageFrame(0, row, 240, { events: ["arrive"], role: "hold" }),
        stageFrame(3, row, 100, { events: ["recognize"], role: "key" }),
        stageFrame(4, row, 170, { contact: "airborne", transform: { x: 0, y: -13 }, events: ["open"], role: "accent", shadow: { width: 30, opacity: 0.1 } }),
        stageFrame(0, row, 120, { events: ["land"], role: "recovery" }),
        stageFrame(0, row, 520, { events: ["proud"], role: "hold" }),
      ],
    },
    walk: {
      loop: true,
      frames: gaitFrames(walkRow, "walk"),
    },
    run: {
      loop: true,
      frames: gaitFrames(runRow, "run"),
    },
    jump: {
      loop: false,
      frames: interactionFrames(jumpRow, "jump"),
    },
    pounce: {
      loop: false,
      frames: interactionFrames(pounceRow, "pounce"),
    },
    rollover: {
      loop: false,
      frames: interactionFrames(rolloverRow, "rollover"),
    },
    ...stageWeatherClips(row, pounceRow),
  };
  if (aerialRow !== undefined) {
    Object.assign(clips, {
      aerial: {
        loop: false,
        frames: aerialFrames(aerialRow),
      },
    });
  }

  return {
    atlas: {
      src: aerialRow === undefined ? "/leafling-stage-atlas-v3.png" : "/leafling-stage-atlas-v4.png",
      frameWidth: 160,
      frameHeight: 128,
      columns: 8,
      rows: aerialRow === undefined ? 12 : 13,
    },
    fallbackClip: "idle",
    clips,
  };
}

export const LEAFLING_STAGE_MANIFESTS = {
  baby: createStageManifest(0, 2, 3, 6, 7, 8),
  young: LEAFLING_MANIFEST,
  guardian: createStageManifest(1, 4, 5, 9, 10, 11, 12),
} satisfies Record<PetStage, PetAnimationManifest>;

export function leaflingManifestForStage(stage: PetStage): PetAnimationManifest {
  return LEAFLING_STAGE_MANIFESTS[stage];
}

export const LEAFLING_PRESENTATION = {
  stages: {
    baby: { width: 38, height: 38 },
    young: { width: 46, height: 46 },
    guardian: { width: 62, height: 62 },
  } satisfies Record<PetStage, { width: number; height: number }>,
  channels: [
    { id: "tail", bounds: { x: 102, y: 48, width: 38, height: 68 } },
    { id: "body", bounds: { x: 48, y: 60, width: 68, height: 60 } },
    { id: "feet", bounds: { x: 54, y: 105, width: 56, height: 15 } },
    { id: "head", bounds: { x: 41, y: 25, width: 80, height: 74 } },
    { id: "ears", bounds: { x: 34, y: 4, width: 96, height: 60 } },
    { id: "face", bounds: { x: 52, y: 46, width: 58, height: 45 } },
    { id: "eyes", bounds: { x: 60, y: 54, width: 40, height: 17 } },
    { id: "markings", bounds: { x: 60, y: 30, width: 44, height: 84 } },
  ] satisfies LeaflingAuthoringChannel[],
} as const;
