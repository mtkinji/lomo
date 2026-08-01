import type { MeaningfulAction, PetStage } from "./pet-state";
import { ENGINE_SCENE } from "./pet-engine.ts";
import {
  catchWindLeaf,
  createWindLeaf,
  dragWindLeaf,
  grabWindLeaf,
  releaseWindLeaf,
  resolveWindLeafFlightProfile,
  stepWindLeaf,
  type WindLeafPoint,
  type WindLeafState,
} from "./pet-plaything.ts";

export const PET_WORLD = {
  width: 480,
  viewportWidth: 160,
  minX: 24,
  maxX: 456,
  minZoom: 1,
  maxZoom: 2.25,
  jumpDuration: 850,
  pounceDuration: 720,
  aerialPounceDuration: 965,
  rolloverDuration: 1200,
  treeShelterX: 112,
  sunPatchX: 366,
  sunBaskDuration: 5600,
  weatherArrivalDuration: 1200,
  windBraceDuration: 1680,
  windLeafInvitationDuration: 800,
  rainFlinchDuration: 920,
  bloomOpenDuration: 900,
  bloomNoticeDuration: 900,
  bloomAdmireDuration: 1400,
  memoryNoticeDuration: 720,
  memoryHoldDuration: 2200,
  treeRestDuration: 4800,
  bloomApproachDistance: 12,
  maxBlooms: 4,
  cameraLookAhead: 14,
  userCameraHoldDuration: 6000,
  cameraPushDuration: 900,
  cameraReleaseDuration: 1500,
  maxWeatherSway: 2.2,
  leafCatchDuration: 1280,
  handArrivalDistance: 16,
  handRunDistance: 72,
  handFoundDuration: 920,
} as const;

export type PetWeather = "sunny" | "breeze" | "rain";
export type PetWeatherPhase = "arriving" | "settled";
export type PetCameraShot = "establishing" | "follow" | "reaction" | "intimate" | "focus" | "action-wide" | "reduced-motion" | "user";
export type PetWorldAction = "idle" | "greet" | "track" | "hand-track" | "hand-walk" | "hand-run" | "hand-found" | "leaf-invite" | "leaf-track" | "seek-leaf" | "leaf-pounce" | "leaf-aerial" | "leaf-catch" | "weather-notice" | "wind-brace" | "rain-flinch" | "bloom-notice" | "seek-bloom" | "admire-bloom" | "memory-notice" | "seek-memory" | "remember" | "seek-rest" | "rest" | "walk" | "run" | "jump" | "pounce" | "aerial-pounce" | "rollover" | "seek-shelter" | "shelter" | "seek-sun" | "bask" | "seek-shade" | "shade" | "focus";
export type WorldVisitorKind = "crawler" | "firefly" | "sky-moth";
export type WorldHandPhase = "quiet" | "held" | "released";

export interface WorldPoint {
  x: number;
  y: number;
}

export type PetWorldIntent =
  | { kind: "greet"; worldX: number }
  | { kind: "move"; worldX: number }
  | { kind: "jump"; worldX: number }
  | { kind: "rollover"; worldX: number };

export interface WorldVisitor {
  active: boolean;
  kind: WorldVisitorKind;
  x: number;
  y: number;
  originY: number;
  direction: -1 | 1;
  ageMs: number;
  engaged: boolean;
  engagedAgeMs: number;
  launchX: number;
}

export interface WorldBloom {
  id: number;
  x: number;
  growth: number;
  source: MeaningfulAction;
}

export interface WorldHandGuide {
  phase: WorldHandPhase;
  x: number;
  y: number;
  ageMs: number;
}

export interface PetWorldMemory {
  version: 1;
  blooms: WorldBloom[];
}

export interface PetWorldState {
  petX: number;
  cameraX: number;
  zoom: number;
  cameraShot: PetCameraShot;
  cameraControlRemainingMs: number;
  facing: -1 | 1;
  action: PetWorldAction;
  actionElapsed: number;
  targetX: number | null;
  poseY: number;
  rotation: number;
  weather: PetWeather;
  weatherPhase: PetWeatherPhase;
  weatherIntensity: number;
  weatherElapsed: number;
  weatherSway: number;
  focus: {
    active: boolean;
    durationMs: number;
    elapsedMs: number;
    remainingMs: number;
    completed: boolean;
  };
  visitor: WorldVisitor;
  hand: WorldHandGuide;
  playLeaf: WindLeafState;
  blooms: WorldBloom[];
}

const VISITOR_BEHAVIOR = {
  crawler: {
    y: 188,
    speed: 0.011,
    engageDistance: 15,
    attentionDistance: 76,
    lead: 4,
    launchAt: 290,
    landAt: 510,
    action: "pounce" as const,
  },
  firefly: {
    y: 158,
    speed: 0.026,
    engageDistance: 22,
    attentionDistance: 108,
    lead: 22,
    launchAt: 290,
    landAt: 510,
    action: "pounce" as const,
  },
  "sky-moth": {
    y: 112,
    speed: 0.034,
    engageDistance: 34,
    attentionDistance: 138,
    lead: 38,
    launchAt: 250,
    landAt: 595,
    action: "aerial-pounce" as const,
  },
} satisfies Record<WorldVisitorKind, {
  y: number;
  speed: number;
  engageDistance: number;
  attentionDistance: number;
  lead: number;
  launchAt: number;
  landAt: number;
  action: "pounce" | "aerial-pounce";
}>;

const VISITOR_FOR_STAGE: Record<PetStage, WorldVisitorKind> = {
  baby: "crawler",
  young: "firefly",
  guardian: "sky-moth",
};

function quietWorldHand(): WorldHandGuide {
  return { phase: "quiet", x: PET_WORLD.width / 2, y: 112, ageMs: 0 };
}

export function createPetWorldState(): PetWorldState {
  return {
    petX: PET_WORLD.width / 2,
    cameraX: PET_WORLD.width / 2,
    zoom: 1,
    cameraShot: "establishing",
    cameraControlRemainingMs: 0,
    facing: 1,
    action: "idle",
    actionElapsed: 0,
    targetX: null,
    poseY: 0,
    rotation: 0,
    weather: "sunny",
    weatherPhase: "settled",
    weatherIntensity: 1,
    weatherElapsed: 0,
    weatherSway: 0,
    focus: { active: false, durationMs: 0, elapsedMs: 0, remainingMs: 0, completed: false },
    visitor: {
      active: false,
      kind: "firefly",
      x: 0,
      y: VISITOR_BEHAVIOR.firefly.y,
      originY: VISITOR_BEHAVIOR.firefly.y,
      direction: 1,
      ageMs: 0,
      engaged: false,
      engagedAgeMs: 0,
      launchX: PET_WORLD.width / 2,
    },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
    blooms: [],
  };
}

export function setWorldWeather(state: PetWorldState, weather: PetWeather): PetWorldState {
  return {
    ...state,
    weather,
    weatherPhase: "arriving",
    weatherIntensity: 0,
    weatherElapsed: 0,
    weatherSway: 0,
    action: "weather-notice",
    actionElapsed: 0,
    targetX: null,
    facing: weather === "rain"
      ? faceToward(state.petX, PET_WORLD.treeShelterX, state.facing)
      : weather === "sunny"
        ? faceToward(state.petX, PET_WORLD.sunPatchX, state.facing)
        : state.facing,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

export function nextWeatherKind(weather: PetWeather): PetWeather {
  if (weather === "sunny") return "breeze";
  if (weather === "breeze") return "rain";
  return "sunny";
}

export function beginCompanionFocus(state: PetWorldState, durationMs = 60000): PetWorldState {
  const duration = Math.max(1, durationMs);
  return {
    ...state,
    action: "seek-shelter",
    actionElapsed: 0,
    targetX: PET_WORLD.treeShelterX,
    facing: PET_WORLD.treeShelterX < state.petX ? -1 : 1,
    focus: { active: true, durationMs: duration, elapsedMs: 0, remainingMs: duration, completed: false },
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

export function plantLifeEcho(
  state: PetWorldState,
  source: MeaningfulAction,
  requestedX?: number,
): PetWorldState {
  const nextId = state.blooms.reduce((highest, bloom) => Math.max(highest, bloom.id), 0) + 1;
  const placement = {
    todo: { anchor: state.petX, offsets: [56, -70, 92, -96] },
    focus: { anchor: PET_WORLD.treeShelterX, offsets: [-24, 22, -38, 36] },
    play: { anchor: state.petX, offsets: [72, -78, 98, -104] },
  } satisfies Record<MeaningfulAction, { anchor: number; offsets: readonly number[] }>;
  const sourcePlacement = placement[source];
  const x = clampWorldX(requestedX ?? sourcePlacement.anchor + sourcePlacement.offsets[(nextId - 1) % sourcePlacement.offsets.length]);
  const bloom: WorldBloom = { id: nextId, x, growth: 0, source };

  return {
    ...state,
    action: "bloom-notice",
    actionElapsed: 0,
    targetX: x,
    facing: faceToward(state.petX, x, state.facing),
    poseY: 0,
    rotation: 0,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
    blooms: [...state.blooms, bloom].slice(-PET_WORLD.maxBlooms),
  };
}

export function plantProgressBloom(state: PetWorldState, requestedX?: number): PetWorldState {
  return plantLifeEcho(state, "todo", requestedX);
}

export function beginMemoryVisit(state: PetWorldState, requestedX: number): PetWorldState {
  if (state.blooms.length === 0) return state;
  const bloom = state.blooms.reduce((nearest, candidate) => (
    Math.abs(candidate.x - requestedX) < Math.abs(nearest.x - requestedX) ? candidate : nearest
  ));
  const facing = faceToward(state.petX, bloom.x, state.facing);
  const approachX = clampWorldX(bloom.x - facing * PET_WORLD.bloomApproachDistance);
  return {
    ...state,
    action: "memory-notice",
    actionElapsed: 0,
    targetX: approachX,
    facing,
    poseY: 0,
    rotation: 0,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

export function beginTreeRest(state: PetWorldState): PetWorldState {
  return {
    ...state,
    action: "seek-rest",
    actionElapsed: 0,
    targetX: PET_WORLD.treeShelterX,
    facing: faceToward(state.petX, PET_WORLD.treeShelterX, state.facing),
    poseY: 0,
    rotation: 0,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function restorePetWorldMemory(state: PetWorldState, value: unknown): PetWorldState {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.blooms)) {
    return { ...state, blooms: [] };
  }

  const seenIds = new Set<number>();
  const blooms: WorldBloom[] = [];
  for (const candidate of value.blooms) {
    if (!isRecord(candidate)) continue;
    const id = candidate.id;
    const x = candidate.x;
    if (!Number.isInteger(id) || (id as number) <= 0 || seenIds.has(id as number)) continue;
    if (
      typeof x !== "number"
      || !Number.isFinite(x)
      || (candidate.source !== "todo" && candidate.source !== "focus" && candidate.source !== "play")
    ) continue;
    seenIds.add(id as number);
    blooms.push({ id: id as number, x: clampWorldX(Math.round(x)), growth: 1, source: candidate.source });
  }

  return { ...state, blooms: blooms.slice(-PET_WORLD.maxBlooms) };
}

export function serializePetWorldMemory(state: PetWorldState): PetWorldMemory {
  const blooms = restorePetWorldMemory(createPetWorldState(), {
    version: 1,
    blooms: state.blooms,
  }).blooms;
  return { version: 1, blooms };
}

export function resolveFocusAtmosphere(
  focus: PetWorldState["focus"],
  reducedMotion: boolean,
) {
  if (!focus.active) return { hush: 0, breath: 0 };
  if (reducedMotion) return { hush: 1, breath: 0.5 };
  const hush = clamp(focus.elapsedMs / 1800, 0, 1);
  const breath = 0.5 + Math.sin((focus.elapsedMs / 5200) * Math.PI * 2 - Math.PI / 2) * 0.5;
  return { hush, breath: clamp(breath, 0, 1) };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampWorldX(value: number) {
  return clamp(value, PET_WORLD.minX, PET_WORLD.maxX);
}

function clampCameraX(value: number, zoom: number) {
  const halfView = PET_WORLD.viewportWidth / (2 * zoom);
  return clamp(value, halfView, PET_WORLD.width - halfView);
}

export function resolveCameraTargetX(state: PetWorldState) {
  if (state.hand.phase !== "quiet" && state.action.startsWith("hand-")) {
    return clampCameraX((state.petX + state.hand.x) / 2, state.zoom);
  }
  if (
    state.playLeaf.phase !== "perched"
    && (
      state.action === "leaf-track"
      || state.action === "leaf-invite"
      || state.action === "seek-leaf"
      || state.action === "leaf-pounce"
      || state.action === "leaf-aerial"
      || state.action === "leaf-catch"
    )
  ) {
    const leafX = state.targetX ?? state.playLeaf.x;
    return clampCameraX((state.petX + leafX) / 2, state.zoom);
  }
  if (
    state.visitor.active
    && (state.action === "track" || state.action === "pounce" || state.action === "aerial-pounce")
  ) {
    return clampCameraX((state.petX + state.visitor.x) / 2, state.zoom);
  }
  const directed = state.action === "walk"
    || state.action === "run"
    || state.action === "seek-shelter"
    || state.action === "seek-sun"
    || state.action === "seek-shade"
    || state.action === "seek-bloom"
    || state.action === "seek-memory"
    || state.action === "seek-rest"
    || state.action === "seek-leaf";
  const lookAhead = directed ? PET_WORLD.cameraLookAhead * state.facing : 0;
  return clampCameraX(state.petX + lookAhead, state.zoom);
}

export function resolveCinematicShot(
  state: PetWorldState,
  reducedMotion: boolean,
): { id: Exclude<PetCameraShot, "user">; zoom: number } {
  if (reducedMotion) return { id: "reduced-motion", zoom: 1 };
  if (state.focus.active || state.action === "focus") return { id: "focus", zoom: 1.35 };
  if (state.action === "aerial-pounce" || state.action === "pounce" || state.action === "jump" || state.action === "leaf-pounce" || state.action === "leaf-aerial") {
    return { id: "action-wide", zoom: 1 };
  }
  if (
    state.action === "rest"
    || state.action === "remember"
    || state.action === "admire-bloom"
    || state.action === "shelter"
    || state.action === "shade"
    || state.action === "bask"
    || state.action === "leaf-catch"
    || state.action === "hand-found"
  ) {
    return { id: "intimate", zoom: 1.45 };
  }
  if (
    state.action === "greet"
    || state.action === "track"
    || state.action === "hand-track"
    || state.action === "leaf-invite"
    || state.action === "leaf-track"
    || state.action === "weather-notice"
    || state.action === "wind-brace"
    || state.action === "rain-flinch"
    || state.action === "bloom-notice"
    || state.action === "memory-notice"
  ) {
    return { id: "reaction", zoom: 1.28 };
  }
  if (state.targetX !== null || state.action === "walk" || state.action === "run") {
    return { id: "follow", zoom: 1.08 };
  }
  return { id: "establishing", zoom: 1 };
}

export function setWorldZoom(state: PetWorldState, zoom: number): PetWorldState {
  const nextZoom = clamp(zoom, PET_WORLD.minZoom, PET_WORLD.maxZoom);
  return {
    ...state,
    zoom: nextZoom,
    cameraX: clampCameraX(state.cameraX, nextZoom),
    cameraShot: "user",
    cameraControlRemainingMs: PET_WORLD.userCameraHoldDuration,
  };
}

export function resolveTapIntent(state: PetWorldState, point: WorldPoint): PetWorldIntent {
  const worldX = Math.round(state.cameraX + (point.x - PET_WORLD.viewportWidth / 2) / state.zoom);
  if (point.y < 122) return { kind: "jump", worldX: clampWorldX(worldX) };
  if (Math.abs(worldX - state.petX) <= 18) return { kind: "greet", worldX: state.petX };
  return { kind: "move", worldX: clampWorldX(worldX) };
}

export function screenPointToWorldPoint(state: PetWorldState, point: WorldPoint): WorldPoint {
  return {
    x: state.cameraX + (point.x - PET_WORLD.viewportWidth / 2) / state.zoom,
    y: ENGINE_SCENE.groundY + (point.y - ENGINE_SCENE.groundY) / state.zoom,
  };
}

function actionForHandDistance(distance: number): PetWorldAction {
  if (distance <= PET_WORLD.handArrivalDistance) return "hand-track";
  if (distance >= PET_WORLD.handRunDistance) return "hand-run";
  return "hand-walk";
}

function handGuideIsRefused(state: PetWorldState) {
  if (state.focus.active) return true;
  return state.weather === "rain"
    && state.weatherPhase === "settled"
    && (state.action === "rain-flinch" || state.action === "seek-shelter" || state.action === "shelter");
}

export function guideWorldWithHand(
  state: PetWorldState,
  point: WorldPoint,
): PetWorldState {
  if (handGuideIsRefused(state)) return state;
  const hand: WorldHandGuide = {
    phase: "held",
    x: clampWorldX(point.x),
    y: clamp(point.y, 38, ENGINE_SCENE.groundY - 8),
    ageMs: state.hand.phase === "quiet" ? 0 : state.hand.ageMs,
  };
  const distance = Math.abs(hand.x - state.petX);
  const action = actionForHandDistance(distance);
  return {
    ...state,
    action,
    actionElapsed: state.action === action ? state.actionElapsed : 0,
    targetX: action === "hand-track" ? null : hand.x,
    facing: faceToward(state.petX, hand.x, state.facing),
    poseY: 0,
    rotation: 0,
    hand,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    playLeaf: createWindLeaf(),
  };
}

export function releaseWorldHandGuide(state: PetWorldState): PetWorldState {
  if (state.hand.phase !== "held") return state;
  const distance = Math.abs(state.hand.x - state.petX);
  const action = distance <= PET_WORLD.handArrivalDistance
    ? "hand-found"
    : actionForHandDistance(distance);
  return {
    ...state,
    action,
    actionElapsed: 0,
    targetX: action === "hand-found" ? null : state.hand.x,
    facing: faceToward(state.petX, state.hand.x, state.facing),
    poseY: 0,
    rotation: 0,
    hand: { ...state.hand, phase: "released", ageMs: 0 },
  };
}

export function cancelWorldHandGuide(state: PetWorldState): PetWorldState {
  if (state.hand.phase === "quiet") return state;
  const handOwnedAction = state.action.startsWith("hand-");
  return {
    ...state,
    action: handOwnedAction ? "idle" : state.action,
    actionElapsed: handOwnedAction ? 0 : state.actionElapsed,
    targetX: handOwnedAction ? null : state.targetX,
    poseY: handOwnedAction ? 0 : state.poseY,
    rotation: handOwnedAction ? 0 : state.rotation,
    hand: quietWorldHand(),
  };
}

export function grabWorldWindLeaf(
  state: PetWorldState,
  point: WindLeafPoint,
  stage: PetStage,
): PetWorldState {
  if (state.focus.active) return state;
  const playLeaf = grabWindLeaf(state.playLeaf, point, stage);
  return {
    ...state,
    action: "leaf-track",
    actionElapsed: 0,
    targetX: null,
    facing: faceToward(state.petX, playLeaf.x, state.facing),
    poseY: 0,
    rotation: 0,
    hand: quietWorldHand(),
    playLeaf,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
  };
}

export function beginWindLeafInvitation(
  state: PetWorldState,
  stage: PetStage,
  reducedMotion: boolean,
): PetWorldState {
  const perched = createWindLeaf();
  const held = grabWindLeaf(perched, { x: perched.x, y: perched.y }, stage);
  const direction = Math.abs(state.weatherSway) < 0.12 ? 1 : Math.sign(state.weatherSway);
  const lift = stage === "baby" ? 0.01 : stage === "young" ? -0.11 : -0.14;
  const playLeaf = releaseWindLeaf(
    held,
    { x: direction * 0.055, y: lift },
    reducedMotion,
    resolveWindLeafFlightProfile(state.weather, state.weatherSway, state.weatherIntensity),
  );
  return {
    ...state,
    action: "leaf-invite",
    actionElapsed: 0,
    targetX: null,
    facing: faceToward(state.petX, playLeaf.x, state.facing),
    poseY: 0,
    rotation: 0,
    hand: quietWorldHand(),
    playLeaf,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
  };
}

export function dragWorldWindLeaf(state: PetWorldState, point: WindLeafPoint): PetWorldState {
  if (state.playLeaf.phase !== "held" || state.focus.active) return state;
  const playLeaf = dragWindLeaf(state.playLeaf, point);
  return {
    ...state,
    action: "leaf-track",
    targetX: null,
    facing: faceToward(state.petX, playLeaf.x, state.facing),
    poseY: 0,
    rotation: 0,
    playLeaf,
  };
}

export function tossWorldWindLeaf(
  state: PetWorldState,
  velocity: WindLeafPoint,
  reducedMotion: boolean,
): PetWorldState {
  if (state.playLeaf.phase !== "held" || state.focus.active) return state;
  const playLeaf = releaseWindLeaf(
    state.playLeaf,
    velocity,
    reducedMotion,
    resolveWindLeafFlightProfile(state.weather, state.weatherSway, state.weatherIntensity),
  );
  const commitsLow = playLeaf.mode === "leap" && playLeaf.y >= 128;
  const commitsHigh = playLeaf.mode === "aerial" && playLeaf.y < 176;
  const action: PetWorldAction = commitsHigh
    ? "leaf-aerial"
    : commitsLow
      ? "leaf-pounce"
      : "leaf-track";
  const targetX = action === "leaf-pounce" || action === "leaf-aerial" ? playLeaf.catchX : null;
  return {
    ...state,
    action,
    actionElapsed: 0,
    targetX,
    facing: faceToward(state.petX, targetX ?? playLeaf.x, state.facing),
    poseY: 0,
    rotation: 0,
    playLeaf,
  };
}

export function applyWorldIntent(state: PetWorldState, intent: PetWorldIntent): PetWorldState {
  const facing = intent.worldX < state.petX ? -1 : 1;
  if (intent.kind === "move") {
    return { ...state, facing, action: "walk", actionElapsed: 0, targetX: clampWorldX(intent.worldX), poseY: 0, rotation: 0, hand: quietWorldHand(), playLeaf: createWindLeaf() };
  }

  return {
    ...state,
    facing,
    action: intent.kind,
    actionElapsed: 0,
    targetX: intent.kind === "jump" ? clampWorldX(intent.worldX) : null,
    poseY: 0,
    rotation: 0,
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

export function spawnVisitor(
  state: PetWorldState,
  stage: PetStage,
  visitor: { x?: number; y?: number; direction?: -1 | 1 } = {},
): PetWorldState {
  const kind = VISITOR_FOR_STAGE[stage];
  const behavior = VISITOR_BEHAVIOR[kind];
  const direction = visitor.direction ?? (state.petX > PET_WORLD.width / 2 ? -1 : 1);
  const x = visitor.x ?? (direction === 1 ? state.cameraX - 94 / state.zoom : state.cameraX + 94 / state.zoom);
  const y = visitor.y ?? behavior.y;
  return {
    ...state,
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
    visitor: {
      active: true,
      kind,
      x: clampWorldX(x),
      y,
      originY: y,
      direction,
      ageMs: 0,
      engaged: false,
      engagedAgeMs: 0,
      launchX: state.petX,
    },
  };
}

export function beginSharedPlayEcho(state: PetWorldState, stage: PetStage): PetWorldState {
  const world = spawnVisitor(setWorldWeather(plantLifeEcho(state, "play"), "breeze"), stage);
  return { ...world, action: "track", actionElapsed: 0, targetX: null };
}

function finishAction(state: PetWorldState): PetWorldState {
  return { ...state, action: "idle", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 };
}

function moveToward(value: number, target: number, distance: number) {
  if (Math.abs(target - value) <= distance) return target;
  return value + Math.sign(target - value) * distance;
}

function faceToward(value: number, target: number, fallback: -1 | 1): -1 | 1 {
  if (Math.abs(target - value) < 0.5) return fallback;
  return target < value ? -1 : 1;
}

function resolveVisitorIntercept(
  petX: number,
  visitor: WorldVisitor,
  lead: number,
) {
  const currentDelta = visitor.x - petX;
  const predicted = clampWorldX(visitor.x + visitor.direction * lead);
  const predictedDelta = predicted - petX;
  // Lead a moving visitor only while the lead remains on the side the Pet can
  // currently see. Predicting through the Pet makes the launch face away from
  // the visible visitor and reads as a backward jump.
  if (currentDelta !== 0 && predictedDelta * currentDelta <= 0) {
    return clampWorldX(visitor.x);
  }
  return predicted;
}

function resolveCommittedVisitorX(state: PetWorldState, elapsedMs: number) {
  const behavior = VISITOR_BEHAVIOR[state.visitor.kind];
  const targetX = state.targetX ?? state.visitor.x;
  const progress = clamp(
    (elapsedMs - behavior.launchAt) / (behavior.landAt - behavior.launchAt),
    0,
    1,
  );
  const easedProgress = 1 - (1 - progress) ** 2;
  return state.visitor.launchX + (targetX - state.visitor.launchX) * easedProgress;
}

function finishVisitorAction(state: PetWorldState): PetWorldState {
  return finishAction({
    ...state,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
  });
}

export function stepPetWorld(
  state: PetWorldState,
  elapsedMs: number,
  reducedMotion: boolean,
  stage: PetStage = "young",
): PetWorldState {
  const dt = Math.max(0, elapsedMs);
  const weatherElapsed = state.weatherElapsed + dt;
  const arrivingWeather = state.weatherPhase === "arriving";
  const weatherIntensity = arrivingWeather
    ? reducedMotion
      ? 1
      : clamp(weatherElapsed / PET_WORLD.weatherArrivalDuration, 0, 1)
    : state.weatherIntensity;
  const weatherPhase: PetWeatherPhase = weatherIntensity >= 1 ? "settled" : state.weatherPhase;
  const weatherResponseStarted = arrivingWeather && weatherPhase === "settled" && !state.focus.active;
  const focusAtFrame = state.focus.active
    ? {
        ...state.focus,
        elapsedMs: Math.min(state.focus.durationMs, state.focus.elapsedMs + dt),
        remainingMs: Math.max(0, state.focus.remainingMs - dt),
      }
    : state.focus;
  const focusAtmosphere = resolveFocusAtmosphere(focusAtFrame, reducedMotion);
  const rawWeatherSway = state.weather === "breeze"
    ? Math.sin(weatherElapsed / 230) * PET_WORLD.maxWeatherSway * weatherIntensity
    : state.weather === "rain"
      ? Math.sin(weatherElapsed / 170) * 0.7 * weatherIntensity
      : 0;
  const weatherSway = rawWeatherSway * (1 - focusAtmosphere.hush * 0.82);
  let next: PetWorldState = {
    ...state,
    actionElapsed: state.actionElapsed + dt,
    cameraControlRemainingMs: Math.max(0, state.cameraControlRemainingMs - dt),
    weatherPhase,
    weatherIntensity,
    weatherElapsed,
    weatherSway: reducedMotion ? 0 : weatherSway,
    hand: state.hand.phase === "quiet"
      ? state.hand
      : { ...state.hand, ageMs: state.hand.ageMs + dt },
    playLeaf: stepWindLeaf(state.playLeaf, dt),
    blooms: state.blooms.map((bloom) => ({
      ...bloom,
      growth: reducedMotion ? 1 : clamp(bloom.growth + dt / PET_WORLD.bloomOpenDuration, 0, 1),
    })),
  };

  if (next.cameraControlRemainingMs > 0 && state.cameraShot === "user") {
    next.cameraShot = "user";
  } else if (reducedMotion) {
    const shot = resolveCinematicShot(next, true);
    next.cameraShot = shot.id;
    next.zoom = shot.zoom;
  }

  if (weatherResponseStarted) {
    if (state.weather === "rain") {
      next = {
        ...next,
        action: "rain-flinch",
        actionElapsed: 0,
        targetX: PET_WORLD.treeShelterX,
        facing: faceToward(state.petX, PET_WORLD.treeShelterX, state.facing),
      };
    } else if (state.weather === "sunny") {
      next = {
        ...next,
        action: "seek-sun",
        actionElapsed: 0,
        targetX: PET_WORLD.sunPatchX,
        facing: faceToward(state.petX, PET_WORLD.sunPatchX, state.facing),
      };
    } else {
      next = {
        ...next,
        action: "wind-brace",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
  }

  if (state.focus.active) {
    const remainingMs = Math.max(0, state.focus.remainingMs - dt);
    const elapsedMs = Math.min(state.focus.durationMs, state.focus.elapsedMs + dt);
    next.focus = {
      active: remainingMs > 0,
      durationMs: state.focus.durationMs,
      elapsedMs,
      remainingMs,
      completed: remainingMs === 0,
    };
    if (remainingMs === 0) {
      next = {
        ...next,
        action: "greet",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
  }

  if (state.visitor.active) {
    const behavior = VISITOR_BEHAVIOR[state.visitor.kind];
    const ageMs = state.visitor.ageMs + dt;
    const engagedAgeMs = state.visitor.engaged ? state.visitor.engagedAgeMs + dt : 0;
    const escapeMultiplier = state.visitor.engaged ? 1.32 : 1;
    const rawX = state.visitor.x + state.visitor.direction * dt * behavior.speed * escapeMultiplier;
    const x = state.visitor.engaged ? clampWorldX(rawX) : rawX;
    const insideWorldExit = x > PET_WORLD.minX - 10 && x < PET_WORLD.maxX + 10;
    const active = ageMs < 9000 && (state.visitor.engaged || insideWorldExit);
    const baseY = state.visitor.kind === "crawler"
      ? state.visitor.originY + (Math.floor(ageMs / 150) % 2)
      : state.visitor.kind === "firefly"
        ? state.visitor.originY + Math.sin(ageMs / 150) * 7 + Math.sin(ageMs / 53) * 2
        : state.visitor.originY + Math.sin(ageMs / 210) * 11 + Math.sin(ageMs / 81) * 3;
    const escapeLift = state.visitor.engaged && state.visitor.kind !== "crawler"
      ? Math.min(22, engagedAgeMs * 0.032)
      : 0;
    next.visitor = {
      ...state.visitor,
      active,
      ageMs,
      engagedAgeMs,
      x,
      y: baseY - escapeLift,
    };
  }

  if (reducedMotion) {
    if (state.action === "hand-track") {
      if (next.hand.phase === "released") {
        return { ...next, action: "hand-found", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 };
      }
      return { ...next, facing: faceToward(state.petX, next.hand.x, state.facing), poseY: 0, rotation: 0 };
    }
    if (state.action === "hand-walk" || state.action === "hand-run") {
      return {
        ...next,
        petX: next.hand.x,
        cameraX: clampCameraX(next.hand.x, next.zoom),
        action: next.hand.phase === "held" ? "hand-track" : "hand-found",
        actionElapsed: 0,
        targetX: null,
        facing: faceToward(state.petX, next.hand.x, state.facing),
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "hand-found") {
      if (next.actionElapsed >= Math.min(300, PET_WORLD.handFoundDuration)) {
        return finishAction({ ...next, hand: quietWorldHand() });
      }
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "leaf-invite") {
      if (next.actionElapsed < Math.min(300, PET_WORLD.windLeafInvitationDuration)) {
        return { ...next, facing: faceToward(state.petX, next.playLeaf.x, state.facing), poseY: 0, rotation: 0 };
      }
      const catchX = next.playLeaf.catchX;
      return {
        ...next,
        petX: catchX,
        cameraX: clampCameraX(catchX, next.zoom),
        action: "leaf-catch",
        actionElapsed: 0,
        targetX: null,
        facing: faceToward(state.petX, catchX, state.facing),
        poseY: 0,
        rotation: 0,
        playLeaf: catchWindLeaf(next.playLeaf),
      };
    }
    if (
      state.action === "leaf-track"
      || state.action === "seek-leaf"
      || state.action === "leaf-pounce"
      || state.action === "leaf-aerial"
    ) {
      const catchX = next.playLeaf.catchX;
      return {
        ...next,
        petX: catchX,
        cameraX: clampCameraX(catchX, next.zoom),
        action: "leaf-catch",
        actionElapsed: 0,
        targetX: null,
        facing: faceToward(state.petX, catchX, state.facing),
        poseY: 0,
        rotation: 0,
        playLeaf: catchWindLeaf(next.playLeaf),
      };
    }
    if (state.action === "leaf-catch") {
      if (next.actionElapsed >= PET_WORLD.leafCatchDuration) {
        return finishAction({ ...next, playLeaf: createWindLeaf() });
      }
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "bloom-notice" || state.action === "seek-bloom") {
      return {
        ...next,
        action: "admire-bloom",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "admire-bloom") {
      if (next.actionElapsed >= Math.min(300, PET_WORLD.bloomAdmireDuration)) return finishAction(next);
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "memory-notice" || state.action === "seek-memory") {
      return {
        ...next,
        action: "remember",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "remember") {
      if (next.actionElapsed >= Math.min(500, PET_WORLD.memoryHoldDuration)) return finishAction(next);
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "seek-rest") {
      return {
        ...next,
        petX: PET_WORLD.treeShelterX,
        cameraX: clampCameraX(PET_WORLD.treeShelterX, next.zoom),
        action: "rest",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "rest") {
      if (next.actionElapsed >= Math.min(900, PET_WORLD.treeRestDuration)) return finishAction(next);
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (weatherResponseStarted && state.weather === "rain") {
      return {
        ...next,
        petX: PET_WORLD.treeShelterX,
        cameraX: clampCameraX(PET_WORLD.treeShelterX, next.zoom),
        action: "shelter",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (weatherResponseStarted && state.weather === "sunny") {
      return {
        ...next,
        petX: PET_WORLD.sunPatchX,
        cameraX: clampCameraX(PET_WORLD.sunPatchX, next.zoom),
        action: "bask",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (weatherResponseStarted) return { ...next, poseY: 0, rotation: 0 };
    if (state.action === "seek-shelter") {
      return {
        ...next,
        petX: PET_WORLD.treeShelterX,
        cameraX: clampCameraX(PET_WORLD.treeShelterX, next.zoom),
        action: state.focus.active ? "focus" : "shelter",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "seek-sun") {
      return {
        ...next,
        petX: PET_WORLD.sunPatchX,
        cameraX: clampCameraX(PET_WORLD.sunPatchX, next.zoom),
        action: "bask",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "bask") {
      if (next.actionElapsed >= PET_WORLD.sunBaskDuration) {
        return {
          ...next,
          petX: PET_WORLD.treeShelterX,
          cameraX: clampCameraX(PET_WORLD.treeShelterX, next.zoom),
          action: "shade",
          actionElapsed: 0,
          targetX: null,
          poseY: 0,
          rotation: 0,
        };
      }
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "seek-shade") {
      return {
        ...next,
        petX: PET_WORLD.treeShelterX,
        cameraX: clampCameraX(PET_WORLD.treeShelterX, next.zoom),
        action: "shade",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "focus" || state.action === "shelter" || state.action === "shade") {
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (next.actionElapsed >= Math.min(300, PET_WORLD.rolloverDuration)) return finishAction({ ...next, poseY: 0, rotation: 0 });
    return { ...next, poseY: 0, rotation: 0 };
  }

  if (weatherResponseStarted) {
    next.poseY = 0;
    next.rotation = 0;
  } else if (state.action === "hand-track") {
    next.facing = faceToward(state.petX, next.hand.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.hand.phase === "released") {
      next.action = "hand-found";
      next.actionElapsed = 0;
      next.targetX = null;
    }
  } else if (state.action === "hand-walk" || state.action === "hand-run") {
    const distance = next.hand.x - state.petX;
    const remaining = Math.abs(distance);
    next.facing = faceToward(state.petX, next.hand.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (remaining <= PET_WORLD.handArrivalDistance) {
      next.petX = next.hand.x;
      next.targetX = null;
      next.action = next.hand.phase === "held" ? "hand-track" : "hand-found";
      next.actionElapsed = 0;
    } else {
      next.action = actionForHandDistance(remaining);
      next.targetX = next.hand.x;
      const speed = next.action === "hand-run" ? 0.052 : 0.03;
      next.petX = moveToward(state.petX, next.hand.x, dt * speed);
    }
  } else if (state.action === "hand-found") {
    next.facing = faceToward(state.petX, next.hand.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= PET_WORLD.handFoundDuration) {
      next = finishAction({ ...next, hand: quietWorldHand() });
    }
  } else if (state.action === "leaf-invite") {
    next.facing = faceToward(state.petX, next.playLeaf.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.playLeaf.phase === "landed" || next.actionElapsed >= PET_WORLD.windLeafInvitationDuration) {
      next.action = "leaf-track";
      next.actionElapsed = 0;
    }
  } else if (state.action === "leaf-track") {
    const leaf = next.playLeaf;
    next.facing = faceToward(state.petX, leaf.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (leaf.phase === "flying" && leaf.mode === "leap" && leaf.y >= 128) {
      next.action = "leaf-pounce";
      next.actionElapsed = 0;
      next.targetX = leaf.catchX;
      next.facing = faceToward(state.petX, leaf.catchX, state.facing);
    } else if (leaf.phase === "flying" && leaf.mode === "aerial" && leaf.y < 176) {
      next.action = "leaf-aerial";
      next.actionElapsed = 0;
      next.targetX = leaf.catchX;
      next.facing = faceToward(state.petX, leaf.catchX, state.facing);
    } else if (leaf.phase === "landed") {
      next.action = "seek-leaf";
      next.actionElapsed = 0;
      next.targetX = leaf.catchX;
      next.facing = faceToward(state.petX, leaf.catchX, state.facing);
    }
  } else if (state.action === "leaf-pounce" || state.action === "leaf-aerial") {
    const duration = state.action === "leaf-aerial" ? PET_WORLD.aerialPounceDuration : PET_WORLD.pounceDuration;
    if (next.actionElapsed >= duration) {
      next = {
        ...next,
        action: "leaf-catch",
        actionElapsed: 0,
        targetX: null,
        petX: state.targetX ?? next.playLeaf.catchX,
        poseY: 0,
        rotation: 0,
        playLeaf: catchWindLeaf(next.playLeaf),
      };
    } else {
      const targetX = state.targetX ?? next.playLeaf.catchX;
      next.petX = moveToward(state.petX, targetX, dt * (state.action === "leaf-aerial" ? 0.042 : 0.05));
      next.facing = faceToward(state.petX, targetX, state.facing);
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "leaf-catch") {
    if (next.actionElapsed >= PET_WORLD.leafCatchDuration) {
      next = finishAction({ ...next, playLeaf: createWindLeaf() });
    } else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "bloom-notice") {
    if (next.actionElapsed >= PET_WORLD.bloomNoticeDuration) {
      const bloomX = state.targetX ?? state.petX;
      const approachX = clampWorldX(bloomX - faceToward(state.petX, bloomX, state.facing) * PET_WORLD.bloomApproachDistance);
      next = {
        ...next,
        action: "seek-bloom",
        actionElapsed: 0,
        targetX: approachX,
        facing: faceToward(state.petX, bloomX, state.facing),
        poseY: 0,
        rotation: 0,
      };
    } else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "admire-bloom") {
    if (next.actionElapsed >= PET_WORLD.bloomAdmireDuration) next = finishAction(next);
    else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "memory-notice") {
    if (next.actionElapsed >= PET_WORLD.memoryNoticeDuration) {
      next = { ...next, action: "seek-memory", actionElapsed: 0, poseY: 0, rotation: 0 };
    } else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "remember") {
    if (next.actionElapsed >= PET_WORLD.memoryHoldDuration) next = finishAction(next);
    else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "rest") {
    if (next.actionElapsed >= PET_WORLD.treeRestDuration) next = finishAction(next);
    else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "bask" && state.weather === "sunny" && next.actionElapsed >= PET_WORLD.sunBaskDuration) {
    next = {
      ...next,
      action: "seek-shade",
      actionElapsed: 0,
      targetX: PET_WORLD.treeShelterX,
      facing: PET_WORLD.treeShelterX < state.petX ? -1 : 1,
      poseY: 0,
      rotation: 0,
    };
  } else if (state.action === "wind-brace") {
    if (next.actionElapsed >= PET_WORLD.windBraceDuration) {
      next = !next.visitor.active && !next.focus.active && next.playLeaf.phase === "perched"
        ? beginWindLeafInvitation(next, stage, reducedMotion)
        : finishAction(next);
    } else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "rain-flinch") {
    if (next.actionElapsed >= PET_WORLD.rainFlinchDuration) {
      next = {
        ...next,
        action: "seek-shelter",
        actionElapsed: 0,
        targetX: PET_WORLD.treeShelterX,
        facing: faceToward(state.petX, PET_WORLD.treeShelterX, state.facing),
        poseY: 0,
        rotation: 0,
      };
    } else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "rollover") {
    if (next.actionElapsed >= PET_WORLD.rolloverDuration) next = finishAction(next);
    else {
      next.rotation = 0;
      next.poseY = 0;
    }
  } else if (state.action === "jump") {
    if (next.actionElapsed >= PET_WORLD.jumpDuration) next = finishAction(next);
    else {
      next.poseY = 0;
      if (state.targetX !== null) next.petX = moveToward(state.petX, state.targetX, dt * 0.018);
    }
  } else if (state.action === "pounce") {
    if (next.actionElapsed >= PET_WORLD.pounceDuration) {
      next = finishVisitorAction({
        ...next,
        petX: state.targetX ?? next.petX,
        facing: state.visitor.direction,
      });
    }
    else {
      next.petX = resolveCommittedVisitorX(state, next.actionElapsed);
      next.facing = state.visitor.direction;
      next.poseY = 0;
    }
  } else if (state.action === "aerial-pounce") {
    if (next.actionElapsed >= PET_WORLD.aerialPounceDuration) {
      next = finishVisitorAction({
        ...next,
        petX: state.targetX ?? next.petX,
        facing: state.visitor.direction,
      });
    }
    else {
      next.petX = resolveCommittedVisitorX(state, next.actionElapsed);
      next.facing = state.visitor.direction;
      next.poseY = 0;
    }
  } else if (state.targetX !== null) {
    const distance = state.targetX - state.petX;
    if (Math.abs(distance) <= 2) {
      if (state.action === "seek-shelter") {
        next = {
          ...next,
          petX: state.targetX,
          targetX: null,
          action: state.focus.active ? "focus" : "shelter",
          actionElapsed: 0,
          poseY: 0,
          rotation: 0,
        };
      } else if (state.action === "seek-sun") {
        next = { ...next, petX: state.targetX, targetX: null, action: "bask", actionElapsed: 0, poseY: 0 };
      } else if (state.action === "seek-shade") {
        next = { ...next, petX: state.targetX, targetX: null, action: "shade", actionElapsed: 0, poseY: 0 };
      } else if (state.action === "seek-bloom") {
        const bloomX = next.blooms.at(-1)?.x ?? state.targetX;
        next = {
          ...next,
          petX: state.targetX,
          targetX: null,
          action: "admire-bloom",
          actionElapsed: 0,
          facing: faceToward(state.targetX, bloomX, state.facing),
          poseY: 0,
          rotation: 0,
        };
      } else if (state.action === "seek-memory") {
        const bloom = next.blooms.reduce<WorldBloom | null>((nearest, candidate) => {
          if (!nearest) return candidate;
          return Math.abs(candidate.x - state.targetX!) < Math.abs(nearest.x - state.targetX!)
            ? candidate
            : nearest;
        }, null);
        next = {
          ...next,
          petX: state.targetX,
          targetX: null,
          action: "remember",
          actionElapsed: 0,
          facing: bloom ? faceToward(state.targetX, bloom.x, state.facing) : state.facing,
          poseY: 0,
          rotation: 0,
        };
      } else if (state.action === "seek-rest") {
        next = {
          ...next,
          petX: state.targetX,
          targetX: null,
          action: "rest",
          actionElapsed: 0,
          poseY: 0,
          rotation: 0,
        };
      } else if (state.action === "seek-leaf") {
        next = {
          ...next,
          petX: state.targetX,
          targetX: state.targetX,
          action: "leaf-pounce",
          actionElapsed: 0,
          facing: faceToward(state.petX, state.targetX, state.facing),
          poseY: 0,
          rotation: 0,
        };
      } else next = finishAction({ ...next, petX: state.targetX });
    }
    else {
      const directedWalk = state.action === "seek-shelter" || state.action === "seek-sun" || state.action === "seek-shade" || state.action === "seek-bloom" || state.action === "seek-memory" || state.action === "seek-rest" || state.action === "seek-leaf";
      const running = !directedWalk && Math.abs(distance) > 52;
      const speed = running ? 0.052 : directedWalk ? 0.032 : 0.024;
      next.petX = moveToward(state.petX, state.targetX, dt * speed);
      next.facing = distance < 0 ? -1 : 1;
      if (!directedWalk) next.action = running ? "run" : "walk";
      next.poseY = 0;
    }
  } else if (state.action === "shelter" || state.action === "focus" || state.action === "bask" || state.action === "shade" || state.action === "rest") {
    next.poseY = 0;
    next.rotation = 0;
  } else if (next.visitor.active && !next.visitor.engaged) {
    const behavior = VISITOR_BEHAVIOR[next.visitor.kind];
    const visitorDistance = next.visitor.x - state.petX;
    const interceptX = resolveVisitorIntercept(state.petX, next.visitor, behavior.lead);
    next.facing = faceToward(state.petX, interceptX, state.facing);
    if (Math.abs(visitorDistance) <= behavior.engageDistance) {
      next.action = behavior.action;
      next.actionElapsed = 0;
      next.targetX = interceptX;
      next.visitor = {
        ...next.visitor,
        direction: next.facing,
        engaged: true,
        engagedAgeMs: 0,
        launchX: state.petX,
      };
    } else if (Math.abs(visitorDistance) <= behavior.attentionDistance) {
      next.action = "track";
      if (state.action !== "track") next.actionElapsed = 0;
    }
  } else if (state.action === "greet" || state.action === "track" || state.action === "weather-notice") {
    const weatherStillArriving = state.action === "weather-notice" && next.weatherPhase === "arriving";
    if (!weatherStillArriving && next.actionElapsed > 900) next = finishAction(next);
  }

  if (next.cameraControlRemainingMs <= 0 || state.cameraShot !== "user") {
    const shot = resolveCinematicShot(next, false);
    const duration = shot.zoom > state.zoom ? PET_WORLD.cameraPushDuration : PET_WORLD.cameraReleaseDuration;
    const progress = Math.min(1, dt / duration);
    next.zoom = clamp(state.zoom + (shot.zoom - state.zoom) * progress, PET_WORLD.minZoom, PET_WORLD.maxZoom);
    next.cameraShot = shot.id;
  }

  const desiredCamera = resolveCameraTargetX(next);
  const follow = Math.min(1, dt / 280);
  let cameraX = clampCameraX(state.cameraX + (desiredCamera - state.cameraX) * follow, next.zoom);
  const petDelta = next.petX - state.petX;
  const screenDelta = (next.petX - cameraX) - (state.petX - state.cameraX);
  // A camera catching a slower gait must never turn forward travel into a
  // screen-space moonwalk. Let the habitat scroll while the Pet holds position.
  if (petDelta !== 0 && screenDelta * Math.sign(petDelta) < 0) {
    cameraX = clampCameraX(next.petX - (state.petX - state.cameraX), next.zoom);
  }
  next.cameraX = cameraX;
  return next;
}

export function clipForWorldAction(action: PetWorldAction): "idle" | "greet" | "discover" | "care" | "sleep" | "walk" | "run" | "jump" | "pounce" | "aerial" | "rollover" | "weather-notice" | "wind-brace" | "rain-flinch" | "sun-bask" {
  if (action === "walk" || action === "run") return action;
  if (action === "hand-walk") return "walk";
  if (action === "hand-run") return "run";
  if (action === "seek-shelter" || action === "seek-sun" || action === "seek-shade" || action === "seek-bloom" || action === "seek-memory" || action === "seek-rest" || action === "seek-leaf") return "walk";
  if (action === "bloom-notice" || action === "memory-notice") return "discover";
  if (action === "admire-bloom" || action === "remember" || action === "leaf-catch") return "care";
  if (action === "bask") return "sun-bask";
  if (action === "aerial-pounce" || action === "leaf-aerial") return "aerial";
  if (action === "leaf-pounce") return "pounce";
  if (action === "jump" || action === "pounce" || action === "rollover") return action;
  if (action === "greet" || action === "hand-found") return "greet";
  if (action === "track" || action === "hand-track" || action === "leaf-invite" || action === "leaf-track") return "discover";
  if (action === "weather-notice") return "weather-notice";
  if (action === "wind-brace") return "wind-brace";
  if (action === "rain-flinch") return "rain-flinch";
  if (action === "shelter" || action === "shade" || action === "focus" || action === "rest") return "sleep";
  return "idle";
}
