import type { MeaningfulAction, PetStage } from "./pet-state";
import { ENGINE_SCENE } from "./pet-engine.ts";
import {
  catchWindLeaf,
  carryWindLeaf,
  createWindLeaf,
  dragWindLeaf,
  grabWindLeaf,
  offerWindLeaf,
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
  affectionDuration: 1320,
  treeShelterX: 112,
  sunPatchX: 366,
  sunBaskDuration: 5600,
  weatherArrivalDuration: 1200,
  windBraceDuration: 1680,
  windLeafInvitationDuration: 7400,
  rainFlinchDuration: 920,
  bloomOpenDuration: 900,
  bloomNoticeDuration: 900,
  bloomAdmireDuration: 1400,
  memoryNoticeDuration: 720,
  memoryHoldDuration: 2200,
  treeRestDuration: 4800,
  goldenDuration: 3200,
  duskDuration: 3400,
  dawnDuration: 2200,
  twilightEchoGatherDuration: 760,
  twilightEchoFollowDuration: 3300,
  twilightEchoRestOffset: 20,
  puddleY: ENGINE_SCENE.groundY - 3,
  puddleNoticeDuration: 980,
  puddleSplashContactAt: 425,
  puddleSplashVisualEnd: 720,
  puddleSplashRecoveryHold: 120,
  puddleSplashDuration: 840,
  puddleInvitationDuration: 30000,
  puddleSpentDuration: 3200,
  puddleApproachDistance: 12,
  bloomApproachDistance: 12,
  maxBlooms: 4,
  cameraLookAhead: 14,
  userCameraHoldDuration: 6000,
  cameraPushDuration: 900,
  cameraReleaseDuration: 1500,
  maxWeatherSway: 2.2,
  visitorGroundY: ENGINE_SCENE.groundY - 6,
  leafCatchDuration: 1280,
  leafOfferDuration: 6200,
  leafReturnArrivalDistance: 4,
  handArrivalDistance: 16,
  handRunDistance: 72,
  handFoundDuration: 920,
  handBabyReachY: 176,
  handYoungReachY: 132,
  handPounceY: 160,
  handAerialY: 116,
  handPounceDuration: 720,
  // Sum of the Guardian aerial frames before the authored `land` drawing.
  handAerialContactAt: 595,
  handAerialDuration: 965,
  handNoticeDuration: 260,
  visitorTurnDuration: 290,
  visitorInvitationDuration: 3200,
  guardianWakeDuration: 1100,
  reunionNoticeDuration: 720,
  reunionGreetingDuration: 1280,
  reunionTargetX: 248,
  focusChoiceDuration: 4200,
  focusEdgePadding: 42,
  focusRainRadius: 34,
  focusHitTopY: ENGINE_SCENE.groundY - 42,
} as const;

export const RAIN_GUEST = {
  guestOffset: 72,
  guestY: ENGINE_SCENE.groundY - 32,
  shelteredX: PET_WORLD.treeShelterX + 16,
  shelteredY: ENGINE_SCENE.groundY - 17,
  hitRadiusX: 20,
  hitRadiusY: 18,
  approachDistance: 14,
  shoulderOffset: 7,
  shoulderY: ENGINE_SCENE.groundY - 34,
  noticeDuration: 920,
  waitDuration: 6000,
  contactDuration: 860,
} as const;

export const TREE_PLAY = {
  hitRadiusX: 82,
  hitTopY: 28,
  hitBottomY: ENGINE_SCENE.groundY + 4,
  landingHitTopY: ENGINE_SCENE.groundY - 38,
  landingHitBottomY: ENGINE_SCENE.height,
  noticeDuration: 520,
  rootX: 146,
  defaultLandingX: 166,
  rootHoldDuration: 1500,
  perchDecisionDuration: 8000,
  young: { perchX: 153, perchY: -76, landingReach: 56, launchDuration: 720, returnDuration: 850, arcLift: 8 },
  guardian: { perchX: 127, perchY: -108, landingReach: 124, launchDuration: 965, returnDuration: 965, arcLift: 22 },
} as const;

export type PetWeather = "sunny" | "breeze" | "rain";
export type PetWeatherPhase = "arriving" | "settled";
export type PetDaylightPhase = "day" | "golden" | "dusk" | "night" | "dawn";
export type PetCameraShot = "establishing" | "follow" | "reaction" | "intimate" | "focus" | "action-wide" | "reduced-motion" | "user";
export type PetWorldAction = "idle" | "greet" | "affection" | "reunion-notice" | "reunion-approach" | "reunion-greet" | "tree-notice" | "seek-tree" | "tree-root" | "tree-launch" | "tree-perch" | "tree-return" | "track" | "visitor-invite" | "visitor-turn" | "visitor-stalk" | "hand-track" | "hand-walk" | "hand-run" | "hand-pounce" | "hand-aerial" | "hand-found" | "guardian-land" | "leaf-invite" | "leaf-track" | "seek-leaf" | "leaf-pounce" | "leaf-aerial" | "leaf-catch" | "leaf-return" | "leaf-offer" | "weather-notice" | "wind-brace" | "rain-flinch" | "rain-guest-notice" | "rain-guest-wait" | "seek-rain-guest" | "rain-guest-carry" | "rain-guest-shelter" | "puddle-notice" | "puddle-invite" | "seek-puddle" | "puddle-splash" | "bloom-notice" | "seek-bloom" | "admire-bloom" | "memory-notice" | "seek-memory" | "remember" | "seek-rest" | "rest" | "night-rest" | "walk" | "run" | "jump" | "pounce" | "aerial-pounce" | "rollover" | "focus-invite" | "seek-focus" | "seek-shelter" | "shelter" | "seek-sun" | "bask" | "seek-shade" | "shade" | "focus";
export type CompanionFocusPhase = "quiet" | "choosing" | "settling" | "together" | "complete";
export type WorldVisitorKind = "crawler" | "firefly" | "sky-moth";
export type WorldHandPhase = "quiet" | "held" | "released";
export type AfterRainPhase = "quiet" | "shimmer" | "engaged" | "spent";
export type GuardianWakePhase = "quiet" | "gathering" | "released";
export type RainGuestPhase = "quiet" | "waiting" | "carried" | "sheltered";
export type TwilightEchoPhase = "quiet" | "gathering" | "following" | "settled";
export type TwilightEchoMaterial = "seed-light" | "still-light" | "paired-motes";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface AfterRainSplashPresentation {
  visible: boolean;
  animated: boolean;
  progress: number;
  lift: number;
  spread: number;
}

export interface AfterRainPlayProfile {
  clip: "care" | "pounce" | "aerial";
  contactAt: number;
  visualEnd: number;
  duration: number;
  baseSpread: number;
  maxSpread: number;
  droplets: number;
  releasesWake: boolean;
}

const AFTER_RAIN_PLAY: Record<PetStage, AfterRainPlayProfile> = {
  baby: {
    clip: "care",
    contactAt: 360,
    visualEnd: 680,
    duration: 950,
    baseSpread: 7,
    maxSpread: 16,
    droplets: 4,
    releasesWake: false,
  },
  young: {
    clip: "pounce",
    contactAt: PET_WORLD.puddleSplashContactAt,
    visualEnd: PET_WORLD.puddleSplashVisualEnd,
    duration: PET_WORLD.puddleSplashDuration,
    baseSpread: 11,
    maxSpread: 26,
    droplets: 10,
    releasesWake: false,
  },
  guardian: {
    clip: "aerial",
    contactAt: PET_WORLD.handAerialContactAt,
    visualEnd: 880,
    duration: PET_WORLD.aerialPounceDuration,
    baseSpread: 18,
    maxSpread: 42,
    droplets: 16,
    releasesWake: true,
  },
};

export function resolveAfterRainPlayProfile(stage: PetStage): AfterRainPlayProfile {
  return AFTER_RAIN_PLAY[stage];
}

export interface GuardianWakePresentation {
  visible: boolean;
  mode: GuardianWakePhase;
  centerX: number;
  facing: -1 | 1;
  progress: number;
  intensity: number;
  radius: number;
  lift: number;
  particles: boolean;
}

export type PetWorldIntent =
  | { kind: "greet"; worldX: number }
  | { kind: "affection"; worldX: number }
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
  sharedInvitation: boolean;
}

export interface WorldBloom {
  id: number;
  x: number;
  growth: number;
  source: MeaningfulAction;
}

export interface TwilightEchoPresentation {
  visible: boolean;
  animated: boolean;
  phase: TwilightEchoPhase;
  material: TwilightEchoMaterial | null;
  motes: Array<{ x: number; y: number; alpha: number; scale: number }>;
}

export const CARE_ECHO_TARGET = {
  anchorY: ENGINE_SCENE.groundY - 14,
  radiusX: 16,
  radiusY: 20,
} as const;

export interface WorldHandGuide {
  phase: WorldHandPhase;
  x: number;
  y: number;
  ageMs: number;
  acroUsed: boolean;
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
  weatherResponsePending: boolean;
  weatherIntensity: number;
  clearingRainIntensity: number;
  weatherElapsed: number;
  weatherSway: number;
  daylight: {
    phase: PetDaylightPhase;
    elapsedMs: number;
    eveningActive: boolean;
  };
  twilightEcho: {
    source: MeaningfulAction | null;
    originX: number;
    destinationX: number;
    elapsedMs: number;
  };
  afterRain: {
    phase: AfterRainPhase;
    x: number;
    elapsedMs: number;
  };
  guardianWake: {
    phase: GuardianWakePhase;
    x: number;
    elapsedMs: number;
    facing: -1 | 1;
  };
  rainGuest: {
    phase: RainGuestPhase;
    x: number;
    y: number;
    elapsedMs: number;
  };
  treePlay: {
    active: boolean;
    stage: PetStage;
    launchX: number;
    perchX: number;
    perchY: number;
    landingX: number;
  };
  focus: {
    active: boolean;
    phase: CompanionFocusPhase;
    anchorX: number;
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
    y: PET_WORLD.visitorGroundY,
    spawnOffset: 56,
    speed: 0.011,
    engageDistance: 15,
    attentionDistance: 76,
    noticeDuration: 420,
    lead: 4,
    launchAt: 290,
    landAt: 510,
    liftLandAt: 290,
    extraLift: 0,
    action: "visitor-stalk" as const,
  },
  firefly: {
    y: 158,
    spawnOffset: 62,
    speed: 0.026,
    engageDistance: 22,
    attentionDistance: 108,
    noticeDuration: 340,
    lead: 22,
    launchAt: 290,
    landAt: 510,
    liftLandAt: 425,
    extraLift: 10,
    action: "pounce" as const,
  },
  "sky-moth": {
    y: 98,
    spawnOffset: 68,
    speed: 0.034,
    engageDistance: 34,
    attentionDistance: 138,
    noticeDuration: 280,
    lead: 38,
    launchAt: 250,
    landAt: 595,
    liftLandAt: 595,
    extraLift: 30,
    action: "aerial-pounce" as const,
  },
} satisfies Record<WorldVisitorKind, {
  y: number;
  spawnOffset: number;
  speed: number;
  engageDistance: number;
  attentionDistance: number;
  noticeDuration: number;
  lead: number;
  launchAt: number;
  landAt: number;
  liftLandAt: number;
  extraLift: number;
  action: "visitor-stalk" | "pounce" | "aerial-pounce";
}>;

const VISITOR_FOR_STAGE: Record<PetStage, WorldVisitorKind> = {
  baby: "crawler",
  young: "firefly",
  guardian: "sky-moth",
};

const REUNION_FOR_STAGE: Record<PetStage, { startX: number; speed: number }> = {
  baby: { startX: 184, speed: 0.026 },
  young: { startX: 142, speed: 0.052 },
  guardian: { startX: 92, speed: 0.066 },
};

function quietWorldHand(): WorldHandGuide {
  return { phase: "quiet", x: PET_WORLD.width / 2, y: 112, ageMs: 0, acroUsed: false };
}

function quietAfterRain(x = PET_WORLD.sunPatchX - 48): PetWorldState["afterRain"] {
  return { phase: "quiet", x: clampWorldX(x), elapsedMs: 0 };
}

function quietGuardianWake(x = PET_WORLD.width / 2): PetWorldState["guardianWake"] {
  return { phase: "quiet", x: clampWorldX(x), elapsedMs: 0, facing: 1 };
}

function quietRainGuest(): PetWorldState["rainGuest"] {
  return { phase: "quiet", x: PET_WORLD.width / 2, y: RAIN_GUEST.guestY, elapsedMs: 0 };
}

function quietTwilightEcho(): PetWorldState["twilightEcho"] {
  return {
    source: null,
    originX: PET_WORLD.treeShelterX,
    destinationX: PET_WORLD.treeShelterX + PET_WORLD.twilightEchoRestOffset,
    elapsedMs: 0,
  };
}

function waitingRainGuest(petX: number): PetWorldState["rainGuest"] {
  const roomRight = PET_WORLD.maxX - petX;
  const roomLeft = petX - PET_WORLD.minX;
  const direction = petX >= PET_WORLD.treeShelterX && roomRight >= RAIN_GUEST.guestOffset
    ? 1
    : roomLeft >= RAIN_GUEST.guestOffset ? -1 : 1;
  return {
    phase: "waiting",
    x: clampWorldX(petX + direction * RAIN_GUEST.guestOffset),
    y: RAIN_GUEST.guestY,
    elapsedMs: 0,
  };
}

function carriedRainGuest(petX: number, facing: -1 | 1, elapsedMs = 0): PetWorldState["rainGuest"] {
  return {
    phase: "carried",
    x: clampWorldX(petX - facing * RAIN_GUEST.shoulderOffset),
    y: RAIN_GUEST.shoulderY,
    elapsedMs,
  };
}

function shelteredRainGuest(): PetWorldState["rainGuest"] {
  return {
    phase: "sheltered",
    x: RAIN_GUEST.shelteredX,
    y: RAIN_GUEST.shelteredY,
    elapsedMs: 0,
  };
}

function quietTreePlay(stage: PetStage = "young"): PetWorldState["treePlay"] {
  return {
    active: false,
    stage,
    launchX: PET_WORLD.width / 2,
    perchX: TREE_PLAY.young.perchX,
    perchY: 0,
    landingX: TREE_PLAY.defaultLandingX,
  };
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
    weatherResponsePending: false,
    weatherIntensity: 1,
    clearingRainIntensity: 0,
    weatherElapsed: 0,
    weatherSway: 0,
    daylight: { phase: "day", elapsedMs: 0, eveningActive: false },
    twilightEcho: quietTwilightEcho(),
    afterRain: quietAfterRain(),
    guardianWake: quietGuardianWake(),
    rainGuest: quietRainGuest(),
    treePlay: quietTreePlay(),
    focus: {
      active: false,
      phase: "quiet",
      anchorX: PET_WORLD.treeShelterX,
      durationMs: 0,
      elapsedMs: 0,
      remainingMs: 0,
      completed: false,
    },
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
      sharedInvitation: false,
    },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
    blooms: [],
  };
}

export function beginPetReunion(state: PetWorldState, stage: PetStage): PetWorldState {
  const profile = REUNION_FOR_STAGE[stage];
  return {
    ...state,
    petX: profile.startX,
    cameraX: clampCameraX(profile.startX, 1),
    zoom: 1,
    cameraShot: "establishing",
    cameraControlRemainingMs: 0,
    facing: 1,
    action: "reunion-notice",
    actionElapsed: 0,
    targetX: PET_WORLD.reunionTargetX,
    poseY: 0,
    rotation: 0,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    treePlay: quietTreePlay(stage),
    playLeaf: createWindLeaf(),
  };
}

export function setWorldWeather(state: PetWorldState, weather: PetWeather): PetWorldState {
  if (state.afterRain.phase === "engaged") return state;
  const rainIsClearing = state.weather === "rain"
    && state.weatherPhase === "settled"
    && weather === "sunny";
  const puddleX = clampWorldX(state.petX + (state.petX < PET_WORLD.width / 2 ? 66 : -66));
  return {
    ...state,
    weather,
    weatherPhase: "arriving",
    weatherResponsePending: true,
    weatherIntensity: 0,
    clearingRainIntensity: rainIsClearing ? state.weatherIntensity : 0,
    weatherElapsed: 0,
    weatherSway: 0,
    afterRain: rainIsClearing
      ? { phase: "shimmer", x: puddleX, elapsedMs: 0 }
      : weather === "rain" || weather === "breeze"
        ? quietAfterRain(puddleX)
        : state.afterRain,
    rainGuest: quietRainGuest(),
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

export function resolveRainGuestHit(state: PetWorldState, point: WorldPoint): boolean {
  return state.rainGuest.phase === "waiting"
    && (state.action === "rain-guest-notice" || state.action === "rain-guest-wait")
    && Math.abs(point.x - state.rainGuest.x) <= RAIN_GUEST.hitRadiusX
    && Math.abs(point.y - state.rainGuest.y) <= RAIN_GUEST.hitRadiusY;
}

export function beginRainGuestShelter(state: PetWorldState): PetWorldState {
  if (
    state.weather !== "rain"
    || state.weatherPhase !== "settled"
    || state.rainGuest.phase !== "waiting"
    || (state.action !== "rain-guest-notice" && state.action !== "rain-guest-wait")
    || state.focus.active
  ) return state;
  const facing = faceToward(state.petX, state.rainGuest.x, state.facing);
  return {
    ...state,
    action: "seek-rain-guest",
    actionElapsed: 0,
    targetX: clampWorldX(state.rainGuest.x - facing * RAIN_GUEST.approachDistance),
    facing,
    poseY: 0,
    rotation: 0,
    treePlay: quietTreePlay(),
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

export function resolveAfterRainHit(state: PetWorldState, point: WorldPoint): boolean {
  return state.afterRain.phase === "shimmer"
    && Math.abs(point.x - state.afterRain.x) <= 18
    && Math.abs(point.y - PET_WORLD.puddleY) <= 11;
}

export function beginAfterRainSplash(state: PetWorldState): PetWorldState {
  if (
    state.afterRain.phase !== "shimmer"
    || state.focus.active
    || state.daylight.eveningActive
  ) return state;
  const facing = faceToward(state.petX, state.afterRain.x, state.facing);
  return {
    ...state,
    action: "seek-puddle",
    actionElapsed: 0,
    targetX: clampWorldX(state.afterRain.x - facing * PET_WORLD.puddleApproachDistance),
    facing,
    poseY: 0,
    rotation: 0,
    weatherResponsePending: false,
    afterRain: { ...state.afterRain, phase: "engaged", elapsedMs: 0 },
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

export function resolveAfterRainSplashPresentation(
  state: PetWorldState,
  reducedMotion: boolean,
  stage: PetStage = "young",
): AfterRainSplashPresentation {
  const profile = resolveAfterRainPlayProfile(stage);
  if (state.action !== "puddle-splash") {
    return { visible: false, animated: false, progress: 0, lift: 0, spread: 0 };
  }
  if (reducedMotion) {
    return { visible: true, animated: false, progress: 0, lift: 0, spread: profile.baseSpread };
  }
  if (
    state.actionElapsed < profile.contactAt
    || state.actionElapsed >= profile.visualEnd
  ) {
    return { visible: false, animated: true, progress: 0, lift: 0, spread: 0 };
  }
  const progress = clamp(
    (state.actionElapsed - profile.contactAt)
      / (profile.visualEnd - profile.contactAt),
    0,
    1,
  );
  return {
    visible: true,
    animated: true,
    progress,
    lift: 1 - progress,
    spread: Math.round(profile.baseSpread + progress * (profile.maxSpread - profile.baseSpread)),
  };
}

export function resolveGuardianWakePresentation(
  state: PetWorldState,
  reducedMotion: boolean,
): GuardianWakePresentation {
  const wake = state.guardianWake;
  if (wake.phase === "quiet") {
    return {
      visible: false,
      mode: "quiet",
      centerX: wake.x,
      facing: wake.facing,
      progress: 0,
      intensity: 0,
      radius: 0,
      lift: 0,
      particles: false,
    };
  }
  if (reducedMotion) {
    return {
      visible: wake.phase === "released",
      mode: wake.phase,
      centerX: wake.x,
      facing: wake.facing,
      progress: 0,
      intensity: wake.phase === "released" ? 0.42 : 0,
      radius: wake.phase === "released" ? 30 : 0,
      lift: 0,
      particles: false,
    };
  }
  if (wake.phase === "gathering") {
    const rawProgress = clamp(wake.elapsedMs / PET_WORLD.handAerialContactAt, 0, 1);
    const progress = Math.floor(rawProgress * 8) / 8;
    return {
      visible: true,
      mode: "gathering",
      centerX: state.petX,
      facing: wake.facing,
      progress,
      intensity: 0.18 + Math.sin(progress * Math.PI) * 0.54,
      radius: Math.round(8 + progress * 15),
      lift: Math.sin(progress * Math.PI),
      particles: progress >= 0.25,
    };
  }
  const rawProgress = clamp(wake.elapsedMs / PET_WORLD.guardianWakeDuration, 0, 1);
  const progress = Math.floor(rawProgress * 10) / 10;
  return {
    visible: true,
    mode: "released",
    centerX: wake.x,
    facing: wake.facing,
    progress,
    intensity: 1 - progress,
    radius: Math.round(24 + (1 - (1 - progress) ** 2) * 76),
    lift: Math.sin(progress * Math.PI),
    particles: progress < 0.8,
  };
}

export function nextWeatherKind(weather: PetWeather): PetWeather {
  if (weather === "sunny") return "breeze";
  if (weather === "breeze") return "rain";
  return "sunny";
}

function canBeginWeatherResponse(state: PetWorldState) {
  return !state.focus.active
    && !state.visitor.active
    && state.hand.phase === "quiet"
    && state.playLeaf.phase === "perched"
    && ["idle", "greet", "track", "weather-notice"].includes(state.action);
}

export function beginCompanionFocus(state: PetWorldState, durationMs = 60000): PetWorldState {
  const duration = Math.max(1, durationMs);
  return {
    ...state,
    action: "focus-invite",
    actionElapsed: 0,
    targetX: null,
    focus: {
      active: true,
      phase: "choosing",
      anchorX: state.petX,
      durationMs: duration,
      elapsedMs: 0,
      remainingMs: duration,
      completed: false,
    },
    afterRain: quietAfterRain(state.afterRain.x),
    guardianWake: quietGuardianWake(state.petX),
    rainGuest: quietRainGuest(),
    treePlay: quietTreePlay(),
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
  };
}

function resolveCompanionFocusX(state: PetWorldState, requestedX: number) {
  if (state.weather === "rain") {
    return clamp(
      requestedX,
      PET_WORLD.treeShelterX - PET_WORLD.focusRainRadius,
      PET_WORLD.treeShelterX + PET_WORLD.focusRainRadius,
    );
  }
  return clamp(
    requestedX,
    PET_WORLD.minX + PET_WORLD.focusEdgePadding,
    PET_WORLD.maxX - PET_WORLD.focusEdgePadding,
  );
}

export function chooseCompanionFocusPlace(
  state: PetWorldState,
  requestedX: number,
): PetWorldState {
  if (!state.focus.active || state.focus.phase !== "choosing") return state;
  const anchorX = resolveCompanionFocusX(state, requestedX);
  return {
    ...state,
    action: "seek-focus",
    actionElapsed: 0,
    targetX: anchorX,
    facing: faceToward(state.petX, anchorX, state.facing),
    focus: { ...state.focus, phase: "settling", anchorX },
  };
}

export function resolveCompanionFocusPlaceHit(
  state: PetWorldState,
  point: WorldPoint,
): number | null {
  if (!state.focus.active || state.focus.phase !== "choosing") return null;
  if (point.y < PET_WORLD.focusHitTopY || point.y > ENGINE_SCENE.height) return null;
  return point.x;
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
    weatherResponsePending: false,
    targetX: x,
    facing: faceToward(state.petX, x, state.facing),
    poseY: 0,
    rotation: 0,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
    afterRain: quietAfterRain(state.afterRain.x),
    guardianWake: quietGuardianWake(state.petX),
    treePlay: quietTreePlay(),
    blooms: [...state.blooms, bloom].slice(-PET_WORLD.maxBlooms),
  };
}

export function plantProgressBloom(state: PetWorldState, requestedX?: number): PetWorldState {
  return plantLifeEcho(state, "todo", requestedX);
}

export function resolveCareEchoHit(
  state: PetWorldState,
  source: MeaningfulAction | null,
  point: WorldPoint,
): WorldBloom | null {
  if (!source) return null;
  const candidate = [...state.blooms]
    .reverse()
    .find((bloom) => bloom.source === source);
  if (!candidate) return null;
  if (Math.abs(point.x - candidate.x) > CARE_ECHO_TARGET.radiusX) return null;
  if (Math.abs(point.y - CARE_ECHO_TARGET.anchorY) > CARE_ECHO_TARGET.radiusY) return null;
  return candidate;
}

export function holdCareEcho(
  state: PetWorldState,
  source: MeaningfulAction | null,
): PetWorldState {
  if (!source) return state;
  const bloom = [...state.blooms]
    .reverse()
    .find((candidate) => candidate.source === source);
  if (!bloom) return state;
  const facing = faceToward(state.petX, bloom.x, state.facing);
  const petX = clampWorldX(bloom.x - facing * PET_WORLD.bloomApproachDistance);
  return {
    ...state,
    petX,
    facing: faceToward(petX, bloom.x, facing),
    action: "remember",
    actionElapsed: 0,
    targetX: null,
    poseY: 0,
    rotation: 0,
    weatherResponsePending: false,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    guardianWake: quietGuardianWake(petX),
    treePlay: quietTreePlay(),
    playLeaf: createWindLeaf(),
  };
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
    guardianWake: quietGuardianWake(state.petX),
    treePlay: quietTreePlay(),
    playLeaf: createWindLeaf(),
  };
}

export function resolveTreePlayHit(state: PetWorldState, point: WorldPoint) {
  return !treePlayIsRefused(state)
    && Math.abs(point.x - PET_WORLD.treeShelterX) <= TREE_PLAY.hitRadiusX
    && point.y >= TREE_PLAY.hitTopY
    && point.y <= TREE_PLAY.hitBottomY;
}

export function resolveTreeReturnHit(state: PetWorldState, point: WorldPoint) {
  return state.treePlay.active
    && state.action === "tree-perch"
    && point.y >= TREE_PLAY.landingHitTopY
    && point.y <= TREE_PLAY.landingHitBottomY;
}

function treePlayIsRefused(state: PetWorldState) {
  if (state.focus.active || state.daylight.eveningActive || state.afterRain.phase === "engaged" || state.rainGuest.phase !== "quiet") return true;
  return state.weather === "rain"
    && state.weatherPhase === "settled"
    && (state.action === "rain-flinch" || state.action === "seek-shelter" || state.action === "shelter");
}

export function beginTreePlay(state: PetWorldState, stage: PetStage): PetWorldState {
  if (treePlayIsRefused(state)) return state;
  const profile = stage === "guardian" ? TREE_PLAY.guardian : TREE_PLAY.young;
  return {
    ...state,
    action: "tree-notice",
    actionElapsed: 0,
    targetX: null,
    facing: faceToward(state.petX, PET_WORLD.treeShelterX, state.facing),
    poseY: 0,
    rotation: 0,
    weatherResponsePending: false,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    playLeaf: createWindLeaf(),
    guardianWake: quietGuardianWake(state.petX),
    treePlay: {
      active: true,
      stage,
      launchX: state.petX,
      perchX: profile.perchX,
      perchY: stage === "baby" ? 0 : profile.perchY,
      landingX: TREE_PLAY.defaultLandingX,
    },
  };
}

export function beginTreeReturn(state: PetWorldState, requestedX: number): PetWorldState {
  if (!state.treePlay.active || state.action !== "tree-perch" || state.treePlay.stage === "baby") return state;
  const profile = treePlayProfile(state.treePlay.stage);
  const landingX = clamp(
    clampWorldX(requestedX),
    Math.max(PET_WORLD.minX, state.treePlay.perchX - profile.landingReach),
    Math.min(PET_WORLD.maxX, state.treePlay.perchX + profile.landingReach),
  );
  return {
    ...state,
    action: "tree-return",
    actionElapsed: 0,
    targetX: landingX,
    facing: faceToward(state.treePlay.perchX, landingX, state.facing),
    treePlay: { ...state.treePlay, landingX },
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
    guardianWake: quietGuardianWake(state.petX),
    treePlay: quietTreePlay(),
    playLeaf: createWindLeaf(),
  };
}

export function beginPetEvening(
  state: PetWorldState,
  source: MeaningfulAction | null = null,
): PetWorldState {
  const matchingEcho = source
    ? [...state.blooms].reverse().find((bloom) => bloom.source === source) ?? null
    : null;
  return {
    ...beginTreeRest(state),
    weatherResponsePending: false,
    afterRain: quietAfterRain(state.afterRain.x),
    daylight: { phase: "golden", elapsedMs: 0, eveningActive: true },
    twilightEcho: matchingEcho
      ? {
          source,
          originX: matchingEcho.x,
          destinationX: PET_WORLD.treeShelterX + PET_WORLD.twilightEchoRestOffset,
          elapsedMs: 0,
        }
      : quietTwilightEcho(),
  };
}

export function beginPetMorning(state: PetWorldState): PetWorldState {
  return {
    ...state,
    action: "greet",
    actionElapsed: 0,
    targetX: null,
    poseY: 0,
    rotation: 0,
    weather: "sunny",
    weatherPhase: "settled",
    weatherResponsePending: false,
    weatherIntensity: 1,
    clearingRainIntensity: 0,
    weatherElapsed: 0,
    weatherSway: 0,
    daylight: { phase: "dawn", elapsedMs: 0, eveningActive: false },
    twilightEcho: quietTwilightEcho(),
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    hand: quietWorldHand(),
    guardianWake: quietGuardianWake(state.petX),
    playLeaf: createWindLeaf(),
  };
}

function stepDaylight(
  daylight: PetWorldState["daylight"],
  elapsedMs: number,
): PetWorldState["daylight"] {
  let phase = daylight.phase;
  let remaining = daylight.elapsedMs + elapsedMs;
  if (phase === "golden" && remaining >= PET_WORLD.goldenDuration) {
    remaining -= PET_WORLD.goldenDuration;
    phase = "dusk";
  }
  if (phase === "dusk" && remaining >= PET_WORLD.duskDuration) {
    remaining -= PET_WORLD.duskDuration;
    phase = "night";
  }
  if (phase === "dawn" && remaining >= PET_WORLD.dawnDuration) {
    remaining -= PET_WORLD.dawnDuration;
    phase = "day";
  }
  return { ...daylight, phase, elapsedMs: remaining };
}

export function resolveTwilightEchoPresentation(
  state: PetWorldState,
  reducedMotion = false,
): TwilightEchoPresentation {
  const source = state.twilightEcho.source;
  if (!source) return { visible: false, animated: false, phase: "quiet", material: null, motes: [] };

  const material: TwilightEchoMaterial = source === "todo"
    ? "seed-light"
    : source === "focus" ? "still-light" : "paired-motes";
  const moteCount = source === "play" ? 2 : 1;
  const elapsed = state.twilightEcho.elapsedMs;
  const followingAt = PET_WORLD.twilightEchoGatherDuration;
  const settledAt = followingAt + PET_WORLD.twilightEchoFollowDuration;
  const phase: TwilightEchoPhase = reducedMotion || elapsed >= settledAt
    ? "settled"
    : elapsed >= followingAt ? "following" : "gathering";
  const rawProgress = reducedMotion
    ? 1
    : clamp((elapsed - followingAt) / PET_WORLD.twilightEchoFollowDuration, 0, 1);
  const progress = 0.5 - Math.cos(rawProgress * Math.PI) / 2;
  const baseX = phase === "gathering"
    ? state.twilightEcho.originX
    : state.twilightEcho.originX
      + (state.twilightEcho.destinationX - state.twilightEcho.originX) * progress;
  const baseY = ENGINE_SCENE.groundY - 18 - (phase === "following" ? Math.sin(progress * Math.PI) * 28 : 0);
  const pulse = reducedMotion ? 0 : Math.sin(elapsed / (source === "focus" ? 420 : 230));
  const motes = Array.from({ length: moteCount }, (_, index) => {
    const pairSign = index === 0 ? -1 : 1;
    const weave = source === "play" && phase === "following"
      ? pairSign * (4 + Math.sin(elapsed / 180) * 3)
      : 0;
    const settledOffset = phase === "settled" && source === "play" ? pairSign * 6 : 0;
    return {
      x: clampWorldX(baseX + weave + settledOffset),
      y: baseY + (source === "play" ? pairSign * (2 + pulse * 2) : pulse * 1.5),
      alpha: phase === "gathering" ? 0.62 + clamp(elapsed / followingAt, 0, 1) * 0.28 : 0.9,
      scale: source === "focus" ? 1.15 : source === "todo" ? 0.92 : 0.78,
    };
  });

  return { visible: true, animated: !reducedMotion && phase !== "settled", phase, material, motes };
}

function stepAfterRain(
  afterRain: PetWorldState["afterRain"],
  elapsedMs: number,
): PetWorldState["afterRain"] {
  if (afterRain.phase === "quiet") return { ...afterRain, elapsedMs: 0 };
  const nextElapsed = afterRain.elapsedMs + elapsedMs;
  if (
    (afterRain.phase === "shimmer" && nextElapsed >= PET_WORLD.puddleInvitationDuration)
    || (afterRain.phase === "spent" && nextElapsed >= PET_WORLD.puddleSpentDuration)
  ) return quietAfterRain(afterRain.x);
  return { ...afterRain, elapsedMs: nextElapsed };
}

function stepGuardianWake(
  wake: PetWorldState["guardianWake"],
  elapsedMs: number,
  action: PetWorldAction,
): PetWorldState["guardianWake"] {
  if (wake.phase === "quiet") return { ...wake, elapsedMs: 0 };
  if (wake.phase === "gathering") {
    return action === "hand-aerial"
      ? { ...wake, elapsedMs: wake.elapsedMs + elapsedMs }
      : quietGuardianWake(wake.x);
  }
  const nextElapsed = wake.elapsedMs + elapsedMs;
  return nextElapsed >= PET_WORLD.guardianWakeDuration
    ? quietGuardianWake(wake.x)
    : { ...wake, elapsedMs: nextElapsed };
}

function stepRainGuest(
  guest: PetWorldState["rainGuest"],
  elapsedMs: number,
): PetWorldState["rainGuest"] {
  return guest.phase === "quiet"
    ? { ...guest, elapsedMs: 0 }
    : { ...guest, elapsedMs: guest.elapsedMs + elapsedMs };
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
  if (focus.phase === "choosing") return { hush: reducedMotion ? 0.35 : 0.18, breath: 0 };
  if (focus.phase === "settling") return { hush: reducedMotion ? 0.6 : 0.42, breath: 0 };
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
  if (state.treePlay?.active) {
    return clampCameraX((state.petX + PET_WORLD.treeShelterX) / 2, state.zoom);
  }
  if (
    state.rainGuest.phase !== "quiet"
    && (
      state.action === "rain-guest-notice"
      || state.action === "rain-guest-wait"
      || state.action === "seek-rain-guest"
      || state.action === "rain-guest-carry"
      || state.action === "rain-guest-shelter"
    )
  ) {
    return clampCameraX((state.petX + state.rainGuest.x) / 2, state.zoom);
  }
  if (
    state.afterRain.phase !== "quiet"
    && (
      state.action === "puddle-notice"
      || state.action === "puddle-invite"
      || state.action === "seek-puddle"
      || state.action === "puddle-splash"
    )
  ) {
    return clampCameraX((state.petX + state.afterRain.x) / 2, state.zoom);
  }
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
      || state.action === "leaf-return"
      || state.action === "leaf-offer"
    )
  ) {
    const leafX = state.action === "leaf-return" ? state.playLeaf.returnX : state.targetX ?? state.playLeaf.x;
    return clampCameraX((state.petX + leafX) / 2, state.zoom);
  }
  if (
    state.visitor.active
    && (state.action === "track" || state.action === "visitor-invite" || state.action === "visitor-turn" || state.action === "visitor-stalk" || state.action === "pounce" || state.action === "aerial-pounce")
  ) {
    const chaseX = state.visitor.engaged && state.targetX !== null
      ? state.targetX
      : state.visitor.x;
    return clampCameraX((state.petX + chaseX) / 2, state.zoom);
  }
  const directed = state.action === "walk"
    || state.action === "run"
    || state.action === "reunion-approach"
    || state.action === "seek-focus"
    || state.action === "seek-shelter"
    || state.action === "seek-rain-guest"
    || state.action === "seek-sun"
    || state.action === "seek-shade"
    || state.action === "seek-bloom"
    || state.action === "seek-memory"
    || state.action === "seek-rest"
    || state.action === "seek-leaf"
    || state.action === "leaf-return"
    || state.action === "seek-puddle"
    || state.action === "seek-tree";
  const lookAhead = directed ? PET_WORLD.cameraLookAhead * state.facing : 0;
  return clampCameraX(state.petX + lookAhead, state.zoom);
}

export function resolveCinematicShot(
  state: PetWorldState,
  reducedMotion: boolean,
): { id: Exclude<PetCameraShot, "user">; zoom: number } {
  if (reducedMotion) return { id: "reduced-motion", zoom: 1 };
  if (state.action === "focus") return { id: "focus", zoom: 1.35 };
  if (state.action === "focus-invite") return { id: "establishing", zoom: 1 };
  if (state.action === "leaf-invite" || state.action === "leaf-track") return { id: "action-wide", zoom: 1 };
  if (state.action === "tree-launch" || state.action === "tree-perch" || state.action === "tree-return" || state.action === "visitor-stalk" || state.action === "aerial-pounce" || state.action === "pounce" || state.action === "jump" || state.action === "leaf-pounce" || state.action === "leaf-aerial" || state.action === "hand-pounce" || state.action === "hand-aerial" || state.action === "guardian-land" || state.action === "puddle-splash") {
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
    || state.action === "leaf-offer"
    || state.action === "hand-found"
    || state.action === "affection"
    || state.action === "reunion-greet"
    || state.action === "tree-root"
    || state.action === "rain-guest-carry"
    || state.action === "rain-guest-shelter"
  ) {
    return { id: "intimate", zoom: 1.45 };
  }
  if (
    state.action === "greet"
    || state.action === "reunion-notice"
    || state.action === "track"
    || state.action === "visitor-invite"
    || state.action === "visitor-turn"
    || state.action === "hand-track"
    || state.action === "weather-notice"
    || state.action === "wind-brace"
    || state.action === "rain-flinch"
    || state.action === "rain-guest-notice"
    || state.action === "rain-guest-wait"
    || state.action === "bloom-notice"
    || state.action === "memory-notice"
    || state.action === "puddle-notice"
    || state.action === "puddle-invite"
    || state.action === "tree-notice"
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

function reachableHandY(stage: PetStage, y: number) {
  const minimum = stage === "baby"
    ? PET_WORLD.handBabyReachY
    : stage === "young"
      ? PET_WORLD.handYoungReachY
      : 38;
  return clamp(y, minimum, ENGINE_SCENE.groundY - 8);
}

function actionForHandGuide(
  stage: PetStage,
  hand: WorldHandGuide,
  distance: number,
): PetWorldAction {
  if (!hand.acroUsed) {
    if (stage === "guardian" && hand.y <= PET_WORLD.handAerialY) return "hand-aerial";
    if (stage !== "baby" && hand.y <= PET_WORLD.handPounceY) return "hand-pounce";
  }
  if (distance <= PET_WORLD.handArrivalDistance) return "hand-track";
  if (stage === "baby") return "hand-walk";
  if (distance >= PET_WORLD.handRunDistance) return "hand-run";
  return "hand-walk";
}

function handGuideIsRefused(state: PetWorldState) {
  if (state.focus.active || state.afterRain.phase === "engaged" || state.rainGuest.phase !== "quiet") return true;
  return state.weather === "rain"
    && state.weatherPhase === "settled"
    && (state.action === "rain-flinch" || state.action === "seek-shelter" || state.action === "shelter");
}

export function guideWorldWithHand(
  state: PetWorldState,
  point: WorldPoint,
  stage: PetStage = "young",
): PetWorldState {
  if (handGuideIsRefused(state)) return state;
  if (state.action === "hand-pounce" || state.action === "hand-aerial") return state;
  const hand: WorldHandGuide = {
    phase: "held",
    x: clampWorldX(point.x),
    y: reachableHandY(stage, point.y),
    ageMs: state.hand.phase === "quiet" ? 0 : state.hand.ageMs,
    acroUsed: state.hand.phase === "quiet" ? false : state.hand.acroUsed,
  };
  const distance = Math.abs(hand.x - state.petX);
  const isNewInvitation = state.hand.phase === "quiet";
  const attentionStillSettling = state.action === "hand-track"
    && state.hand.ageMs < PET_WORLD.handNoticeDuration;
  const action = isNewInvitation || attentionStillSettling
    ? "hand-track"
    : actionForHandGuide(stage, hand, distance);
  const facing = faceToward(state.petX, hand.x, state.facing);
  return {
    ...state,
    action,
    actionElapsed: state.action === action ? state.actionElapsed : 0,
    targetX: action === "hand-track" ? null : hand.x,
    facing,
    poseY: 0,
    rotation: 0,
    treePlay: quietTreePlay(),
    hand,
    guardianWake: action === "hand-aerial"
      ? state.guardianWake.phase === "gathering"
        ? { ...state.guardianWake, facing }
        : { phase: "gathering", x: state.petX, elapsedMs: 0, facing }
      : state.guardianWake,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
    playLeaf: createWindLeaf(),
  };
}

export function releaseWorldHandGuide(
  state: PetWorldState,
  stage: PetStage = "young",
): PetWorldState {
  if (state.hand.phase !== "held") return state;
  if (state.action === "hand-pounce" || state.action === "hand-aerial") {
    return { ...state, hand: { ...state.hand, phase: "released" } };
  }
  const distance = Math.abs(state.hand.x - state.petX);
  const attentionStillSettling = state.action === "hand-track"
    && state.hand.ageMs < PET_WORLD.handNoticeDuration;
  const action = attentionStillSettling
    ? "hand-track"
    : state.guardianWake.phase === "released" && stage === "guardian"
    ? "guardian-land"
    : distance <= PET_WORLD.handArrivalDistance && state.hand.acroUsed
    ? "hand-found"
    : actionForHandGuide(stage, state.hand, distance);
  return {
    ...state,
    action,
    actionElapsed: state.action === action ? state.actionElapsed : 0,
    targetX: action === "hand-found" || action === "guardian-land" ? null : state.hand.x,
    facing: faceToward(state.petX, state.hand.x, state.facing),
    poseY: 0,
    rotation: 0,
    hand: { ...state.hand, phase: "released" },
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
    guardianWake: state.guardianWake.phase === "gathering"
      ? quietGuardianWake(state.petX)
      : state.guardianWake,
  };
}

export function grabWorldWindLeaf(
  state: PetWorldState,
  point: WindLeafPoint,
  stage: PetStage,
): PetWorldState {
  if (state.focus.active || state.afterRain.phase === "engaged") return state;
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
    treePlay: quietTreePlay(),
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
    treePlay: quietTreePlay(),
    playLeaf: { ...playLeaf, throwCount: 0 },
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
    treePlay: quietTreePlay(),
    playLeaf,
  };
}

export function applyWorldIntent(state: PetWorldState, intent: PetWorldIntent): PetWorldState {
  if (state.daylight.eveningActive || state.afterRain.phase === "engaged") return state;
  if (
    intent.kind === "affection"
    && (state.focus.active || state.action === "focus" || (state.weather === "rain" && state.action === "shelter"))
  ) return state;
  const facing = intent.worldX < state.petX ? -1 : 1;
  if (intent.kind === "move") {
    return { ...state, facing, action: "walk", actionElapsed: 0, targetX: clampWorldX(intent.worldX), poseY: 0, rotation: 0, hand: quietWorldHand(), treePlay: quietTreePlay(), playLeaf: createWindLeaf() };
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
    treePlay: quietTreePlay(),
    playLeaf: createWindLeaf(),
  };
}

export function spawnVisitor(
  state: PetWorldState,
  stage: PetStage,
  visitor: { x?: number; y?: number; direction?: -1 | 1; sharedInvitation?: boolean } = {},
): PetWorldState {
  if (state.afterRain.phase === "engaged") return state;
  const kind = VISITOR_FOR_STAGE[stage];
  const behavior = VISITOR_BEHAVIOR[kind];
  const direction = visitor.direction ?? (state.petX > PET_WORLD.width / 2 ? -1 : 1);
  const x = visitor.x ?? (
    direction === 1
      ? state.cameraX - behavior.spawnOffset / state.zoom
      : state.cameraX + behavior.spawnOffset / state.zoom
  );
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
      sharedInvitation: visitor.sharedInvitation ?? false,
    },
  };
}

export function beginSharedPlayEcho(state: PetWorldState, stage: PetStage): PetWorldState {
  const breeze = setWorldWeather(plantLifeEcho(state, "play"), "breeze");
  const world = spawnVisitor(
    { ...breeze, weatherResponsePending: false },
    stage,
    { sharedInvitation: true },
  );
  return { ...world, action: "track", actionElapsed: 0, targetX: null };
}

function finishAction(state: PetWorldState): PetWorldState {
  return { ...state, action: "idle", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 };
}

function moveToward(value: number, target: number, distance: number) {
  if (Math.abs(target - value) <= distance) return target;
  return value + Math.sign(target - value) * distance;
}

function completeWindLeafCatch(
  state: PetWorldState,
  stage: PetStage,
  reducedMotion: boolean,
): PetWorldState {
  if (state.playLeaf.throwCount !== 1) {
    return finishAction({ ...state, playLeaf: createWindLeaf() });
  }

  const targetX = clampWorldX(state.playLeaf.returnX);
  const facing = faceToward(state.petX, targetX, state.facing);
  const carried = carryWindLeaf(state.playLeaf, reducedMotion ? targetX : state.petX, stage, facing);
  if (reducedMotion) {
    return {
      ...state,
      petX: targetX,
      cameraX: clampCameraX(targetX, state.zoom),
      action: "leaf-offer",
      actionElapsed: 0,
      targetX: null,
      facing,
      poseY: 0,
      rotation: 0,
      playLeaf: offerWindLeaf(carried),
    };
  }

  return {
    ...state,
    action: "leaf-return",
    actionElapsed: 0,
    targetX,
    facing,
    poseY: 0,
    rotation: 0,
    playLeaf: carried,
  };
}

function faceToward(value: number, target: number, fallback: -1 | 1): -1 | 1 {
  if (Math.abs(target - value) < 0.5) return fallback;
  return target < value ? -1 : 1;
}

function resolveVisitorIntercept(
  petX: number,
  visitor: WorldVisitor,
  behavior: (typeof VISITOR_BEHAVIOR)[WorldVisitorKind],
) {
  const currentDelta = visitor.x - petX;
  const escapeDirection = currentDelta === 0
    ? visitor.direction
    : currentDelta < 0 ? -1 : 1;
  const visibleEscapeDistance = behavior.speed * 1.32 * behavior.landAt;
  const readableLead = Math.min(behavior.lead, visibleEscapeDistance);

  // Commitment changes the visitor from crossing the scene to fleeing away
  // from Moss. Derive both the escape and the landing from that newly chosen
  // side; using the visitor's old travel direction leaves the landing behind
  // and makes an otherwise correctly mirrored leap read backward.
  return clampWorldX(visitor.x + escapeDirection * readableLead);
}

const VISITOR_HIT_RADIUS: Record<WorldVisitorKind, { x: number; y: number }> = {
  crawler: { x: 24, y: 18 },
  firefly: { x: 28, y: 24 },
  "sky-moth": { x: 34, y: 28 },
};

export function resolveVisitorHit(state: PetWorldState, point: WorldPoint): boolean {
  if (
    state.action !== "visitor-invite"
    || !state.visitor.active
    || state.visitor.engaged
    || !state.visitor.sharedInvitation
  ) return false;
  const radius = VISITOR_HIT_RADIUS[state.visitor.kind];
  return Math.abs(point.x - state.visitor.x) <= radius.x
    && Math.abs(point.y - state.visitor.y) <= radius.y;
}

export function beginVisitorChase(state: PetWorldState): PetWorldState {
  if (!state.visitor.active || state.visitor.engaged) return state;
  const behavior = VISITOR_BEHAVIOR[state.visitor.kind];
  const targetX = resolveVisitorIntercept(state.petX, state.visitor, behavior);
  const facing = faceToward(state.petX, state.visitor.x, state.facing);
  return {
    ...state,
    action: "visitor-turn",
    actionElapsed: 0,
    targetX,
    facing,
    poseY: 0,
    rotation: 0,
    visitor: {
      ...state.visitor,
      direction: facing,
      engaged: true,
      engagedAgeMs: 0,
      launchX: state.petX,
      sharedInvitation: false,
    },
  };
}

function resolveReducedVisitorChase(state: PetWorldState): PetWorldState {
  const behavior = VISITOR_BEHAVIOR[state.visitor.kind];
  const targetX = state.targetX ?? resolveVisitorIntercept(state.petX, state.visitor, behavior);
  return {
    ...state,
    petX: targetX,
    cameraX: clampCameraX(targetX, state.zoom),
    action: behavior.action,
    actionElapsed: 0,
    targetX: null,
    poseY: 0,
    rotation: 0,
  };
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

function resolveCommittedVisitorLift(state: PetWorldState, elapsedMs: number) {
  const behavior = VISITOR_BEHAVIOR[state.visitor.kind];
  if (behavior.extraLift === 0) return 0;
  const progress = clamp(
    (elapsedMs - behavior.launchAt) / (behavior.liftLandAt - behavior.launchAt),
    0,
    1,
  );
  if (progress === 0 || progress === 1) return 0;
  return -Math.sin(progress * Math.PI) * behavior.extraLift;
}

function finishVisitorAction(state: PetWorldState): PetWorldState {
  return finishAction({
    ...state,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
  });
}

function treePlayProfile(stage: PetStage) {
  return stage === "guardian" ? TREE_PLAY.guardian : TREE_PLAY.young;
}

function finishTreePlay(state: PetWorldState): PetWorldState {
  return finishAction({ ...state, poseY: 0, rotation: 0, treePlay: quietTreePlay(state.treePlay.stage) });
}

function finishTreeReturn(state: PetWorldState): PetWorldState {
  const stage = state.treePlay.stage;
  const landingX = state.treePlay.landingX;
  const facing = state.facing;
  const landed = finishTreePlay({ ...state, petX: landingX, facing });

  if (stage !== "guardian") return landed;

  return {
    ...landed,
    action: "guardian-land",
    actionElapsed: PET_WORLD.handAerialContactAt,
    petX: landingX,
    poseY: 0,
    rotation: 0,
    guardianWake: { phase: "released", x: landingX, elapsedMs: 0, facing },
  };
}

function resolveTreePlayMotion(state: PetWorldState, elapsedMs: number, returning: boolean) {
  const profile = treePlayProfile(state.treePlay.stage);
  const duration = returning ? profile.returnDuration : profile.launchDuration;
  const progress = clamp(elapsedMs / duration, 0, 1);
  const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
  const fromX = returning ? state.treePlay.perchX : state.treePlay.launchX;
  const toX = returning ? state.treePlay.landingX : state.treePlay.perchX;
  const fromY = returning ? state.treePlay.perchY : 0;
  const toY = returning ? 0 : state.treePlay.perchY;
  return {
    x: fromX + (toX - fromX) * eased,
    y: fromY + (toY - fromY) * eased - Math.sin(progress * Math.PI) * profile.arcLift,
  };
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
  const clearingRainIntensity = reducedMotion
    ? 0
    : Math.max(0, state.clearingRainIntensity - dt / PET_WORLD.weatherArrivalDuration);
  const weatherResponseStarted = state.weatherResponsePending
    && weatherPhase === "settled"
    && canBeginWeatherResponse(state);
  const focusAtFrame = state.focus.active && state.focus.phase === "together"
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
    clearingRainIntensity,
    weatherElapsed,
    weatherSway: reducedMotion ? 0 : weatherSway,
    daylight: stepDaylight(state.daylight, dt),
    twilightEcho: state.twilightEcho.source && state.daylight.eveningActive
      ? { ...state.twilightEcho, elapsedMs: state.twilightEcho.elapsedMs + dt }
      : state.twilightEcho,
    afterRain: stepAfterRain(state.afterRain, dt),
    guardianWake: stepGuardianWake(state.guardianWake, dt, state.action),
    rainGuest: stepRainGuest(state.rainGuest, dt),
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
    next.weatherResponsePending = false;
    if (state.weather === "rain" && stage === "guardian") {
      const rainGuest = waitingRainGuest(state.petX);
      next = {
        ...next,
        action: "rain-guest-notice",
        actionElapsed: 0,
        targetX: null,
        facing: faceToward(state.petX, rainGuest.x, state.facing),
        poseY: 0,
        rotation: 0,
        rainGuest,
      };
    } else if (state.weather === "rain") {
      next = {
        ...next,
        action: "rain-flinch",
        actionElapsed: 0,
        targetX: PET_WORLD.treeShelterX,
        facing: faceToward(state.petX, PET_WORLD.treeShelterX, state.facing),
      };
    } else if (state.weather === "sunny" && state.afterRain.phase === "shimmer") {
      next = {
        ...next,
        action: "puddle-notice",
        actionElapsed: 0,
        targetX: null,
        facing: faceToward(state.petX, state.afterRain.x, state.facing),
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

  if (state.focus.active && state.focus.phase === "choosing") {
    next.focus = state.focus;
    if (next.actionElapsed >= PET_WORLD.focusChoiceDuration) {
      next = chooseCompanionFocusPlace(next, PET_WORLD.treeShelterX);
    }
  } else if (state.focus.active && state.focus.phase === "together") {
    const remainingMs = Math.max(0, state.focus.remainingMs - dt);
    const elapsedMs = Math.min(state.focus.durationMs, state.focus.elapsedMs + dt);
    next.focus = {
      active: remainingMs > 0,
      phase: remainingMs > 0 ? "together" : "complete",
      anchorX: state.focus.anchorX,
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
  } else if (state.focus.active) {
    next.focus = state.focus;
  }

  if (state.visitor.active) {
    const behavior = VISITOR_BEHAVIOR[state.visitor.kind];
    const ageMs = state.visitor.ageMs + dt;
    const engagedAgeMs = state.visitor.engaged ? state.visitor.engagedAgeMs + dt : 0;
    const escapeMultiplier = state.visitor.engaged ? 1.32 : 1;
    const rawX = state.action === "visitor-invite"
      ? state.visitor.x
      : state.visitor.x + state.visitor.direction * dt * behavior.speed * escapeMultiplier;
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
    if (state.action === "visitor-invite" && next.visitor.active && !next.visitor.engaged) {
      if (next.actionElapsed < PET_WORLD.visitorInvitationDuration) {
        return {
          ...next,
          petX: state.petX,
          facing: faceToward(state.petX, next.visitor.x, state.facing),
          poseY: 0,
          rotation: 0,
        };
      }
      return resolveReducedVisitorChase(beginVisitorChase(next));
    }
    if (state.action === "visitor-turn" && next.visitor.engaged) {
      return resolveReducedVisitorChase(next);
    }
    if (state.action === "seek-focus" && state.targetX !== null) {
      return {
        ...next,
        petX: state.focus.anchorX,
        cameraX: clampCameraX(state.focus.anchorX, next.zoom),
        action: "focus",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
        focus: { ...state.focus, phase: "together" },
      };
    }
    if (state.treePlay.active) {
      if (state.action === "tree-root") {
        if (next.actionElapsed >= Math.min(500, TREE_PLAY.rootHoldDuration)) return finishTreePlay(next);
        return { ...next, petX: TREE_PLAY.rootX, poseY: 0, rotation: 0, targetX: null };
      }
      return {
        ...next,
        petX: TREE_PLAY.rootX,
        cameraX: clampCameraX(PET_WORLD.treeShelterX, next.zoom),
        action: "tree-root",
        actionElapsed: 0,
        targetX: null,
        facing: -1,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "reunion-notice" || state.action === "reunion-approach") {
      return {
        ...next,
        petX: PET_WORLD.reunionTargetX,
        cameraX: clampCameraX(PET_WORLD.reunionTargetX, next.zoom),
        action: "reunion-greet",
        actionElapsed: 0,
        targetX: null,
        facing: 1,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "reunion-greet") {
      if (next.actionElapsed >= Math.min(400, PET_WORLD.reunionGreetingDuration)) return finishAction(next);
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "hand-track") {
      const distance = Math.abs(next.hand.x - state.petX);
      const intendedAction = actionForHandGuide(stage, next.hand, distance);
      if (intendedAction === "hand-track") {
        if (next.hand.phase === "released") {
          return { ...next, action: "hand-found", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 };
        }
        return { ...next, facing: faceToward(state.petX, next.hand.x, state.facing), poseY: 0, rotation: 0 };
      }
      const facing = faceToward(state.petX, next.hand.x, state.facing);
      return {
        ...next,
        petX: next.hand.x,
        cameraX: clampCameraX(next.hand.x, next.zoom),
        action: intendedAction === "hand-aerial"
          ? "guardian-land"
          : next.hand.phase === "held" ? "hand-track" : "hand-found",
        actionElapsed: intendedAction === "hand-aerial" ? PET_WORLD.handAerialContactAt : 0,
        targetX: null,
        facing,
        poseY: 0,
        rotation: 0,
        hand: {
          ...next.hand,
          acroUsed: next.hand.acroUsed || intendedAction === "hand-pounce" || intendedAction === "hand-aerial",
        },
        guardianWake: intendedAction === "hand-aerial"
          ? { phase: "released", x: next.hand.x, elapsedMs: 0, facing }
          : next.guardianWake,
      };
    }
    if (
      state.action === "hand-walk"
      || state.action === "hand-run"
      || state.action === "hand-pounce"
      || state.action === "hand-aerial"
    ) {
      return {
        ...next,
        petX: next.hand.x,
        cameraX: clampCameraX(next.hand.x, next.zoom),
        action: state.action === "hand-aerial"
          ? "guardian-land"
          : next.hand.phase === "held" ? "hand-track" : "hand-found",
        actionElapsed: state.action === "hand-aerial" ? PET_WORLD.handAerialContactAt : 0,
        targetX: null,
        facing: faceToward(state.petX, next.hand.x, state.facing),
        poseY: 0,
        rotation: 0,
        hand: {
          ...next.hand,
          acroUsed: next.hand.acroUsed || state.action === "hand-pounce" || state.action === "hand-aerial",
        },
        guardianWake: state.action === "hand-aerial"
          ? { phase: "released", x: next.hand.x, elapsedMs: 0, facing: faceToward(state.petX, next.hand.x, state.facing) }
          : next.guardianWake,
      };
    }
    if (state.action === "hand-found") {
      if (next.actionElapsed >= Math.min(300, PET_WORLD.handFoundDuration)) {
        return finishAction({ ...next, hand: quietWorldHand() });
      }
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "guardian-land") {
      if (next.actionElapsed >= PET_WORLD.handAerialDuration) {
        return next.hand.phase === "held"
          ? { ...next, action: "hand-track", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 }
          : finishAction({ ...next, hand: quietWorldHand(), poseY: 0, rotation: 0 });
      }
      return { ...next, targetX: null, poseY: 0, rotation: 0 };
    }
    if (
      next.visitor.active
      && !next.visitor.engaged
      && !next.visitor.sharedInvitation
      && !weatherResponseStarted
      && !next.focus.active
      && !["focus", "shelter", "seek-shelter", "shade", "seek-shade", "night-rest"].includes(state.action)
    ) {
      return resolveReducedVisitorChase(beginVisitorChase(next));
    }
    if (
      (state.action === "visitor-stalk" || state.action === "pounce" || state.action === "aerial-pounce")
      && state.visitor.engaged
    ) {
      if (next.actionElapsed >= 300) return finishVisitorAction({ ...next, poseY: 0, rotation: 0 });
      return { ...next, targetX: null, facing: state.facing, poseY: 0, rotation: 0 };
    }
    if (state.action === "leaf-invite") {
      if (next.actionElapsed < PET_WORLD.windLeafInvitationDuration) {
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
        return completeWindLeafCatch(next, stage, true);
      }
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "leaf-return") {
      return completeWindLeafCatch(next, stage, true);
    }
    if (state.action === "leaf-offer") {
      if (next.actionElapsed >= PET_WORLD.leafOfferDuration) {
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
      if (next.actionElapsed >= Math.min(900, PET_WORLD.treeRestDuration)) {
        return state.daylight.eveningActive
          ? { ...next, action: "night-rest", actionElapsed: 0, poseY: 0, rotation: 0 }
          : finishAction(next);
      }
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "night-rest") return { ...next, poseY: 0, rotation: 0, targetX: null };
    if (state.action === "puddle-notice") {
      return { ...next, action: "puddle-invite", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 };
    }
    if (state.action === "puddle-invite") {
      return next.afterRain.phase === "quiet"
        ? finishAction({ ...next, afterRain: quietAfterRain(next.afterRain.x) })
        : { ...next, poseY: 0, rotation: 0 };
    }
    if (state.action === "seek-puddle") {
      return {
        ...next,
        petX: next.afterRain.x,
        cameraX: clampCameraX(next.afterRain.x, next.zoom),
        action: "puddle-splash",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
      };
    }
    if (state.action === "puddle-splash") {
      const profile = resolveAfterRainPlayProfile(stage);
      if (next.actionElapsed >= Math.min(300, profile.duration)) {
        return {
          ...next,
          action: "greet",
          actionElapsed: 0,
          poseY: 0,
          rotation: 0,
          afterRain: { ...next.afterRain, phase: "spent", elapsedMs: 0 },
        };
      }
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (weatherResponseStarted && state.weather === "rain" && stage === "guardian") {
      return {
        ...next,
        petX: PET_WORLD.treeShelterX,
        cameraX: clampCameraX(PET_WORLD.treeShelterX, next.zoom),
        action: "rain-guest-shelter",
        actionElapsed: 0,
        targetX: null,
        facing: 1,
        poseY: 0,
        rotation: 0,
        rainGuest: shelteredRainGuest(),
      };
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
    if (state.action === "focus-invite" || state.action === "focus" || state.action === "shelter" || state.action === "shade") {
      return { ...next, poseY: 0, rotation: 0 };
    }
    if (next.actionElapsed >= Math.min(300, PET_WORLD.rolloverDuration)) return finishAction({ ...next, poseY: 0, rotation: 0 });
    return { ...next, poseY: 0, rotation: 0 };
  }

  if (weatherResponseStarted) {
    next.poseY = 0;
    next.rotation = 0;
  } else if (state.action === "reunion-notice") {
    next.poseY = 0;
    next.rotation = 0;
    next.facing = faceToward(state.petX, PET_WORLD.reunionTargetX, state.facing);
    if (next.actionElapsed >= PET_WORLD.reunionNoticeDuration) {
      next.action = "reunion-approach";
      next.actionElapsed = 0;
      next.targetX = PET_WORLD.reunionTargetX;
    }
  } else if (state.action === "reunion-approach") {
    const profile = REUNION_FOR_STAGE[stage];
    const remaining = PET_WORLD.reunionTargetX - state.petX;
    next.poseY = 0;
    next.rotation = 0;
    next.facing = faceToward(state.petX, PET_WORLD.reunionTargetX, state.facing);
    if (Math.abs(remaining) <= 2) {
      next.petX = PET_WORLD.reunionTargetX;
      next.action = "reunion-greet";
      next.actionElapsed = 0;
      next.targetX = null;
    } else {
      next.petX = moveToward(state.petX, PET_WORLD.reunionTargetX, dt * profile.speed);
      next.targetX = PET_WORLD.reunionTargetX;
    }
  } else if (state.action === "reunion-greet") {
    next.poseY = 0;
    next.rotation = 0;
    next.targetX = null;
    if (next.actionElapsed >= PET_WORLD.reunionGreetingDuration) next = finishAction(next);
  } else if (state.action === "hand-track") {
    next.facing = faceToward(state.petX, next.hand.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.hand.ageMs >= PET_WORLD.handNoticeDuration) {
      const distance = Math.abs(next.hand.x - state.petX);
      const intendedAction = actionForHandGuide(stage, next.hand, distance);
      if (intendedAction === "hand-track") {
        if (next.hand.phase === "released") {
          next.action = "hand-found";
          next.actionElapsed = 0;
          next.targetX = null;
        }
      } else {
        next.action = intendedAction;
        next.actionElapsed = 0;
        next.targetX = next.hand.x;
        if (intendedAction === "hand-aerial") {
          next.guardianWake = {
            phase: "gathering",
            x: state.petX,
            elapsedMs: 0,
            facing: next.facing,
          };
        }
      }
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
      next.action = actionForHandGuide(stage, next.hand, remaining);
      next.targetX = next.hand.x;
      const speed = next.action === "hand-run"
        ? stage === "guardian" ? 0.058 : 0.052
        : stage === "baby" ? 0.025 : 0.03;
      next.petX = moveToward(state.petX, next.hand.x, dt * speed);
    }
  } else if (state.action === "hand-aerial") {
    const targetX = state.targetX ?? state.hand.x;
    next.facing = state.facing;
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= PET_WORLD.handAerialContactAt) {
      next.petX = targetX;
      next.targetX = null;
      next.action = "guardian-land";
      next.actionElapsed = PET_WORLD.handAerialContactAt;
      next.hand = { ...next.hand, acroUsed: true };
      next.guardianWake = { phase: "released", x: targetX, elapsedMs: 0, facing: next.facing };
    } else {
      const launchX = state.guardianWake.phase === "gathering" ? state.guardianWake.x : state.petX;
      const travel = clamp(next.actionElapsed / PET_WORLD.handAerialContactAt, 0, 1);
      const easedTravel = 1 - (1 - travel) ** 2;
      next.petX = launchX + (targetX - launchX) * easedTravel;
      next.targetX = targetX;
    }
  } else if (state.action === "hand-pounce") {
    const targetX = state.targetX ?? state.hand.x;
    next.facing = state.facing;
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= PET_WORLD.handPounceDuration) {
      next.petX = targetX;
      next.targetX = null;
      next.action = next.hand.phase === "held" ? "hand-track" : "hand-found";
      next.actionElapsed = 0;
      next.hand = { ...next.hand, acroUsed: true };
    } else {
      next.petX = moveToward(state.petX, targetX, dt * 0.05);
      next.targetX = targetX;
    }
  } else if (state.action === "hand-found") {
    next.facing = faceToward(state.petX, next.hand.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= PET_WORLD.handFoundDuration) {
      next = finishAction({ ...next, hand: quietWorldHand() });
    }
  } else if (state.action === "guardian-land") {
    next.targetX = null;
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= PET_WORLD.handAerialDuration) {
      next = next.hand.phase === "held"
        ? { ...next, action: "hand-track", actionElapsed: 0 }
        : finishAction({ ...next, hand: quietWorldHand() });
    }
  } else if (state.action === "leaf-invite") {
    next.facing = faceToward(state.petX, next.playLeaf.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= PET_WORLD.windLeafInvitationDuration) {
      next.action = next.playLeaf.mode === "ground"
        ? "seek-leaf"
        : next.playLeaf.mode === "leap" ? "leaf-pounce" : "leaf-aerial";
      next.actionElapsed = 0;
      next.targetX = next.playLeaf.catchX;
      next.facing = faceToward(state.petX, next.playLeaf.catchX, state.facing);
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
      next = completeWindLeafCatch(next, stage, false);
    } else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "leaf-return") {
    const targetX = state.playLeaf.returnX;
    const facing = faceToward(state.petX, targetX, state.facing);
    const speed = stage === "baby" ? 0.026 : stage === "young" ? 0.044 : 0.052;
    next.petX = moveToward(state.petX, targetX, dt * speed);
    next.targetX = targetX;
    next.facing = facing;
    next.poseY = 0;
    next.rotation = 0;
    next.playLeaf = carryWindLeaf(next.playLeaf, next.petX, stage, facing);
    if (Math.abs(next.petX - targetX) <= PET_WORLD.leafReturnArrivalDistance) {
      next = {
        ...next,
        petX: targetX,
        action: "leaf-offer",
        actionElapsed: 0,
        targetX: null,
        playLeaf: offerWindLeaf(carryWindLeaf(next.playLeaf, targetX, stage, facing)),
      };
    }
  } else if (state.action === "leaf-offer") {
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= PET_WORLD.leafOfferDuration) {
      next = finishAction({ ...next, playLeaf: createWindLeaf() });
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
    if (next.actionElapsed >= PET_WORLD.treeRestDuration) {
      next = state.daylight.eveningActive
        ? { ...next, action: "night-rest", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 }
        : finishAction(next);
    }
    else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "night-rest") {
    next.poseY = 0;
    next.rotation = 0;
  } else if (state.action === "puddle-notice") {
    if (next.actionElapsed >= PET_WORLD.puddleNoticeDuration) {
      next = { ...next, action: "puddle-invite", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 };
    } else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "puddle-invite") {
    if (next.afterRain.phase === "quiet") {
      next = finishAction({ ...next, afterRain: quietAfterRain(next.afterRain.x) });
    } else {
      next.facing = faceToward(state.petX, state.afterRain.x, state.facing);
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "puddle-splash") {
    const profile = resolveAfterRainPlayProfile(stage);
    const reachedContact = state.actionElapsed < profile.contactAt && next.actionElapsed >= profile.contactAt;
    if (profile.releasesWake && reachedContact && !reducedMotion) {
      next.guardianWake = {
        phase: "released",
        x: state.afterRain.x,
        elapsedMs: 0,
        facing: state.facing,
      };
    }
    if (next.actionElapsed >= profile.duration) {
      next = {
        ...next,
        action: "greet",
        actionElapsed: 0,
        targetX: null,
        poseY: 0,
        rotation: 0,
        afterRain: { ...next.afterRain, phase: "spent", elapsedMs: 0 },
      };
    } else {
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
  } else if (state.action === "rain-guest-notice") {
    next.facing = faceToward(state.petX, state.rainGuest.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.actionElapsed >= RAIN_GUEST.noticeDuration) {
      next = {
        ...next,
        action: "rain-guest-wait",
        actionElapsed: 0,
        targetX: null,
        rainGuest: { ...next.rainGuest, elapsedMs: 0 },
      };
    }
  } else if (state.action === "rain-guest-wait") {
    next.facing = faceToward(state.petX, state.rainGuest.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    if (next.rainGuest.elapsedMs >= RAIN_GUEST.waitDuration) {
      next = beginRainGuestShelter(next);
    }
  } else if (state.action === "rain-guest-carry") {
    next.poseY = 0;
    next.rotation = 0;
    next.targetX = null;
    next.rainGuest = carriedRainGuest(next.petX, next.facing, next.rainGuest.elapsedMs);
    if (next.actionElapsed >= RAIN_GUEST.contactDuration) {
      next = {
        ...next,
        action: "seek-shelter",
        actionElapsed: 0,
        targetX: PET_WORLD.treeShelterX,
        facing: faceToward(state.petX, PET_WORLD.treeShelterX, state.facing),
        poseY: 0,
        rotation: 0,
      };
      next.rainGuest = carriedRainGuest(next.petX, next.facing, next.rainGuest.elapsedMs);
    }
  } else if (state.action === "rain-guest-shelter") {
    next.petX = PET_WORLD.treeShelterX;
    next.targetX = null;
    next.poseY = 0;
    next.rotation = 0;
    next.rainGuest = { ...shelteredRainGuest(), elapsedMs: next.rainGuest.elapsedMs };
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
  } else if (state.action === "affection") {
    if (next.actionElapsed >= PET_WORLD.affectionDuration) next = finishAction(next);
    else {
      next.poseY = 0;
      next.rotation = 0;
    }
  } else if (state.action === "rollover") {
    if (next.actionElapsed >= PET_WORLD.rolloverDuration) next = finishAction(next);
    else {
      next.rotation = 0;
      next.poseY = 0;
    }
  } else if (state.action === "tree-notice" && state.treePlay.active) {
    next.petX = state.petX;
    next.poseY = 0;
    next.rotation = 0;
    next.facing = faceToward(state.petX, PET_WORLD.treeShelterX, state.facing);
    if (next.actionElapsed >= TREE_PLAY.noticeDuration) {
      if (state.treePlay.stage === "baby") {
        next.action = "seek-tree";
        next.actionElapsed = 0;
        next.targetX = TREE_PLAY.rootX;
      } else {
        next.action = "tree-launch";
        next.actionElapsed = 0;
        next.targetX = state.treePlay.perchX;
        next.treePlay = { ...state.treePlay, launchX: state.petX };
      }
    }
  } else if (state.action === "tree-root" && state.treePlay.active) {
    next.petX = TREE_PLAY.rootX;
    next.targetX = null;
    next.poseY = 0;
    next.rotation = 0;
    next.facing = -1;
    if (next.actionElapsed >= TREE_PLAY.rootHoldDuration) next = finishTreePlay(next);
  } else if (state.action === "tree-launch" && state.treePlay.active) {
    const profile = treePlayProfile(state.treePlay.stage);
    if (next.actionElapsed >= profile.launchDuration) {
      next.action = "tree-perch";
      next.actionElapsed = 0;
      next.targetX = null;
      next.petX = state.treePlay.perchX;
      next.poseY = state.treePlay.perchY;
      next.rotation = 0;
    } else {
      const motion = resolveTreePlayMotion(state, next.actionElapsed, false);
      next.petX = motion.x;
      next.poseY = motion.y;
      next.rotation = 0;
      next.facing = -1;
    }
  } else if (state.action === "tree-perch" && state.treePlay.active) {
    next.petX = state.treePlay.perchX;
    next.poseY = state.treePlay.perchY;
    next.targetX = null;
    next.rotation = 0;
    next.facing = -1;
    if (next.actionElapsed >= TREE_PLAY.perchDecisionDuration) {
      next = beginTreeReturn(next, TREE_PLAY.defaultLandingX);
    }
  } else if (state.action === "tree-return" && state.treePlay.active) {
    const profile = treePlayProfile(state.treePlay.stage);
    if (next.actionElapsed >= profile.returnDuration) {
      next = finishTreeReturn({ ...next, petX: state.treePlay.landingX, facing: state.facing });
    } else {
      const motion = resolveTreePlayMotion(state, next.actionElapsed, true);
      next.petX = motion.x;
      next.poseY = motion.y;
      next.rotation = 0;
      next.facing = state.facing;
    }
  } else if (state.action === "jump") {
    if (next.actionElapsed >= PET_WORLD.jumpDuration) next = finishAction(next);
    else {
      next.poseY = 0;
      if (state.targetX !== null) next.petX = moveToward(state.petX, state.targetX, dt * 0.018);
    }
  } else if (state.action === "visitor-invite" && state.visitor.active && !state.visitor.engaged) {
    next.petX = state.petX;
    next.facing = faceToward(state.petX, next.visitor.x, state.facing);
    next.poseY = 0;
    next.rotation = 0;
    next.targetX = null;
    if (next.actionElapsed >= PET_WORLD.visitorInvitationDuration) {
      next = beginVisitorChase(next);
    }
  } else if (state.action === "visitor-turn" && state.visitor.engaged) {
    next.facing = state.facing;
    next.petX = state.petX;
    next.poseY = 0;
    next.rotation = 0;
    const behavior = VISITOR_BEHAVIOR[state.visitor.kind];
    if (next.actionElapsed >= behavior.launchAt) {
      const pursuitElapsed = next.actionElapsed;
      const targetX = state.targetX ?? resolveVisitorIntercept(state.petX, next.visitor, behavior);
      next.action = behavior.action;
      next.actionElapsed = pursuitElapsed;
      next.targetX = targetX;
      next.visitor = {
        ...next.visitor,
        direction: state.facing,
        launchX: state.petX,
      };
      next.petX = resolveCommittedVisitorX(next, pursuitElapsed);
      next.poseY = resolveCommittedVisitorLift(next, pursuitElapsed);
    }
  } else if (state.action === "visitor-stalk" || state.action === "pounce") {
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
      next.poseY = resolveCommittedVisitorLift(state, next.actionElapsed);
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
      next.poseY = resolveCommittedVisitorLift(state, next.actionElapsed);
    }
  } else if (state.targetX !== null) {
    const distance = state.targetX - state.petX;
    if (Math.abs(distance) <= 2) {
      if (state.action === "seek-focus") {
        next = {
          ...next,
          petX: state.focus.anchorX,
          targetX: null,
          action: "focus",
          actionElapsed: 0,
          poseY: 0,
          rotation: 0,
          focus: { ...state.focus, phase: "together" },
        };
      } else if (state.action === "seek-shelter") {
        next = state.rainGuest.phase === "carried" && !state.focus.active
          ? {
              ...next,
              petX: PET_WORLD.treeShelterX,
              targetX: null,
              action: "rain-guest-shelter",
              actionElapsed: 0,
              poseY: 0,
              rotation: 0,
              rainGuest: shelteredRainGuest(),
            }
          : {
              ...next,
              petX: state.targetX,
              targetX: null,
              action: state.focus.active ? "focus" : "shelter",
              actionElapsed: 0,
              poseY: 0,
              rotation: 0,
            };
      } else if (state.action === "seek-rain-guest") {
        next = {
          ...next,
          petX: state.targetX,
          targetX: null,
          action: "rain-guest-carry",
          actionElapsed: 0,
          facing: faceToward(state.targetX, state.rainGuest.x, state.facing),
          poseY: 0,
          rotation: 0,
          rainGuest: carriedRainGuest(state.targetX, faceToward(state.targetX, state.rainGuest.x, state.facing)),
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
      } else if (state.action === "seek-puddle") {
        next = {
          ...next,
          petX: state.targetX,
          targetX: null,
          action: "puddle-splash",
          actionElapsed: 0,
          facing: faceToward(state.targetX, state.afterRain.x, state.facing),
          poseY: 0,
          rotation: 0,
        };
      } else if (state.action === "seek-tree") {
        next = {
          ...next,
          petX: TREE_PLAY.rootX,
          targetX: null,
          action: "tree-root",
          actionElapsed: 0,
          facing: -1,
          poseY: 0,
          rotation: 0,
        };
      } else next = finishAction({ ...next, petX: state.targetX });
    }
    else {
      const directedWalk = state.action === "seek-focus" || state.action === "seek-shelter" || state.action === "seek-rain-guest" || state.action === "seek-sun" || state.action === "seek-shade" || state.action === "seek-bloom" || state.action === "seek-memory" || state.action === "seek-rest" || state.action === "seek-leaf" || state.action === "seek-puddle" || state.action === "seek-tree";
      const running = !directedWalk && Math.abs(distance) > 52;
      const speed = running ? 0.052 : directedWalk ? 0.032 : 0.024;
      next.petX = moveToward(state.petX, state.targetX, dt * speed);
      next.facing = distance < 0 ? -1 : 1;
      if (!directedWalk) next.action = running ? "run" : "walk";
      next.poseY = 0;
      if (next.rainGuest.phase === "carried") {
        next.rainGuest = carriedRainGuest(next.petX, next.facing, next.rainGuest.elapsedMs);
      }
    }
  } else if (state.action === "focus-invite" || state.action === "shelter" || state.action === "rain-guest-shelter" || state.action === "focus" || state.action === "bask" || state.action === "shade" || state.action === "rest" || state.action === "night-rest") {
    next.poseY = 0;
    next.rotation = 0;
  } else if (next.visitor.active && !next.visitor.engaged) {
    const behavior = VISITOR_BEHAVIOR[next.visitor.kind];
    const visitorDistance = next.visitor.x - state.petX;
    const interceptX = resolveVisitorIntercept(state.petX, next.visitor, behavior);
    next.facing = faceToward(state.petX, interceptX, state.facing);
    const isTracking = state.action === "track";
    const attentionComplete = isTracking && next.actionElapsed >= behavior.noticeDuration;
    if (Math.abs(visitorDistance) <= behavior.engageDistance && attentionComplete) {
      next = next.visitor.sharedInvitation
        ? {
            ...next,
            action: "visitor-invite",
            actionElapsed: 0,
            targetX: null,
            petX: state.petX,
            facing: faceToward(state.petX, next.visitor.x, state.facing),
            poseY: 0,
            rotation: 0,
          }
        : beginVisitorChase(next);
    } else if (Math.abs(visitorDistance) <= behavior.attentionDistance || isTracking) {
      next.action = "track";
      if (!isTracking) next.actionElapsed = 0;
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

export function clipForWorldAction(action: PetWorldAction, reducedMotion = false, stage: PetStage = "young"): "idle" | "greet" | "affection" | "discover" | "care" | "sleep" | "walk" | "run" | "jump" | "pounce" | "aerial" | "rollover" | "weather-notice" | "wind-brace" | "rain-flinch" | "sun-bask" {
  if (action === "tree-notice") return "discover";
  if (action === "seek-tree") return "walk";
  if (action === "tree-root") return "affection";
  if (action === "tree-launch") return stage === "guardian" ? "aerial" : "pounce";
  if (action === "tree-perch") return "idle";
  if (action === "tree-return") return stage === "guardian" ? "aerial" : "jump";
  if (action === "reunion-notice") return "discover";
  if (action === "reunion-approach") return stage === "baby" ? "walk" : "run";
  if (action === "reunion-greet") return "affection";
  if (action === "leaf-return") return stage === "baby" ? "walk" : stage === "young" ? "run" : reducedMotion ? "walk" : "aerial";
  if (action === "leaf-offer") return "discover";
  if (action === "walk" || action === "run") return action;
  if (action === "hand-walk") return "walk";
  if (action === "hand-run") return "run";
  if (action === "hand-pounce") return "pounce";
  if (action === "hand-aerial") return "aerial";
  if (action === "guardian-land") return reducedMotion ? "discover" : "aerial";
  if (action === "focus-invite") return "discover";
  if (action === "seek-focus" || action === "seek-shelter" || action === "seek-rain-guest" || action === "seek-sun" || action === "seek-shade" || action === "seek-bloom" || action === "seek-memory" || action === "seek-rest" || action === "seek-leaf" || action === "seek-puddle") return "walk";
  if (action === "rain-guest-carry") return "care";
  if (action === "rain-guest-shelter") return "affection";
  if (action === "bloom-notice" || action === "memory-notice") return "discover";
  if (action === "admire-bloom" || action === "remember" || action === "leaf-catch") return "care";
  if (action === "bask") return "sun-bask";
  if (action === "aerial-pounce" || action === "leaf-aerial") return "aerial";
  if (action === "puddle-splash") return resolveAfterRainPlayProfile(stage).clip;
  if (action === "leaf-pounce") return "pounce";
  if (action === "jump" || action === "pounce" || action === "rollover") return action;
  if (action === "affection") return "affection";
  if (action === "greet" || action === "hand-found") return "greet";
  if (action === "visitor-stalk") return "walk";
  if (action === "visitor-invite") return "discover";
  if (action === "visitor-turn") return stage === "baby" ? "walk" : stage === "guardian" ? "aerial" : "pounce";
  if (action === "track" || action === "hand-track" || action === "leaf-invite" || action === "leaf-track") return "discover";
  if (action === "weather-notice") return "weather-notice";
  if (action === "rain-guest-notice" || action === "rain-guest-wait") return "rain-flinch";
  if (action === "puddle-notice" || action === "puddle-invite") return "discover";
  if (action === "wind-brace") return "wind-brace";
  if (action === "rain-flinch") return "rain-flinch";
  if (action === "shelter" || action === "shade" || action === "focus" || action === "rest" || action === "night-rest") return "sleep";
  return "idle";
}
