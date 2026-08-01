import type { PetStage } from "./pet-state";

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
  cameraLookAhead: 14,
  maxWeatherSway: 2.2,
} as const;

export type PetWeather = "sunny" | "breeze" | "rain";
export type PetWeatherPhase = "arriving" | "settled";
export type PetWorldAction = "idle" | "greet" | "track" | "walk" | "run" | "jump" | "pounce" | "aerial-pounce" | "rollover" | "seek-shelter" | "shelter" | "seek-sun" | "bask" | "seek-shade" | "shade" | "focus";
export type WorldVisitorKind = "crawler" | "firefly" | "sky-moth";

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
}

export interface PetWorldState {
  petX: number;
  cameraX: number;
  zoom: number;
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
}

const VISITOR_BEHAVIOR = {
  crawler: {
    y: 188,
    speed: 0.011,
    engageDistance: 15,
    attentionDistance: 76,
    lead: 4,
    action: "pounce" as const,
  },
  firefly: {
    y: 158,
    speed: 0.026,
    engageDistance: 22,
    attentionDistance: 108,
    lead: 22,
    action: "pounce" as const,
  },
  "sky-moth": {
    y: 112,
    speed: 0.034,
    engageDistance: 34,
    attentionDistance: 138,
    lead: 38,
    action: "aerial-pounce" as const,
  },
} satisfies Record<WorldVisitorKind, {
  y: number;
  speed: number;
  engageDistance: number;
  attentionDistance: number;
  lead: number;
  action: "pounce" | "aerial-pounce";
}>;

const VISITOR_FOR_STAGE: Record<PetStage, WorldVisitorKind> = {
  baby: "crawler",
  young: "firefly",
  guardian: "sky-moth",
};

export function createPetWorldState(): PetWorldState {
  return {
    petX: PET_WORLD.width / 2,
    cameraX: PET_WORLD.width / 2,
    zoom: 1,
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
    },
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
    action: "track",
    actionElapsed: 0,
    targetX: null,
    facing: weather === "rain"
      ? faceToward(state.petX, PET_WORLD.treeShelterX, state.facing)
      : weather === "sunny"
        ? faceToward(state.petX, PET_WORLD.sunPatchX, state.facing)
        : state.facing,
    visitor: { ...state.visitor, active: false, engaged: false, engagedAgeMs: 0 },
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
  };
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
  const directed = state.action === "walk"
    || state.action === "run"
    || state.action === "seek-shelter"
    || state.action === "seek-sun"
    || state.action === "seek-shade";
  const lookAhead = directed ? PET_WORLD.cameraLookAhead * state.facing : 0;
  return clampCameraX(state.petX + lookAhead, state.zoom);
}

export function setWorldZoom(state: PetWorldState, zoom: number): PetWorldState {
  const nextZoom = clamp(zoom, PET_WORLD.minZoom, PET_WORLD.maxZoom);
  return { ...state, zoom: nextZoom, cameraX: clampCameraX(state.cameraX, nextZoom) };
}

export function resolveTapIntent(state: PetWorldState, point: WorldPoint): PetWorldIntent {
  const worldX = Math.round(state.cameraX + (point.x - PET_WORLD.viewportWidth / 2) / state.zoom);
  if (point.y < 122) return { kind: "jump", worldX: clampWorldX(worldX) };
  if (Math.abs(worldX - state.petX) <= 18) return { kind: "greet", worldX: state.petX };
  return { kind: "move", worldX: clampWorldX(worldX) };
}

export function applyWorldIntent(state: PetWorldState, intent: PetWorldIntent): PetWorldState {
  const facing = intent.worldX < state.petX ? -1 : 1;
  if (intent.kind === "move") {
    return { ...state, facing, action: "walk", actionElapsed: 0, targetX: clampWorldX(intent.worldX), poseY: 0, rotation: 0 };
  }

  return {
    ...state,
    facing,
    action: intent.kind,
    actionElapsed: 0,
    targetX: intent.kind === "jump" ? clampWorldX(intent.worldX) : null,
    poseY: 0,
    rotation: 0,
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
    },
  };
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
    weatherPhase,
    weatherIntensity,
    weatherElapsed,
    weatherSway: reducedMotion ? 0 : weatherSway,
  };

  if (weatherResponseStarted) {
    if (state.weather === "rain") {
      next = {
        ...next,
        action: "seek-shelter",
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
      next = finishAction(next);
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
    if (next.actionElapsed >= PET_WORLD.pounceDuration) next = finishVisitorAction(next);
    else {
      const targetX = state.targetX ?? state.visitor.x;
      next.petX = moveToward(state.petX, targetX, dt * 0.05);
      next.facing = faceToward(state.petX, targetX, state.facing);
      next.poseY = 0;
    }
  } else if (state.action === "aerial-pounce") {
    if (next.actionElapsed >= PET_WORLD.aerialPounceDuration) next = finishVisitorAction(next);
    else {
      const targetX = state.targetX ?? state.visitor.x;
      next.petX = moveToward(state.petX, targetX, dt * 0.042);
      next.facing = faceToward(state.petX, targetX, state.facing);
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
      } else next = finishAction({ ...next, petX: state.targetX });
    }
    else {
      const directedWalk = state.action === "seek-shelter" || state.action === "seek-sun" || state.action === "seek-shade";
      const running = !directedWalk && Math.abs(distance) > 52;
      const speed = running ? 0.052 : directedWalk ? 0.032 : 0.024;
      next.petX = moveToward(state.petX, state.targetX, dt * speed);
      next.facing = distance < 0 ? -1 : 1;
      if (!directedWalk) next.action = running ? "run" : "walk";
      next.poseY = 0;
    }
  } else if (state.action === "shelter" || state.action === "focus" || state.action === "bask" || state.action === "shade") {
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
      };
    } else if (Math.abs(visitorDistance) <= behavior.attentionDistance) {
      next.action = "track";
      if (state.action !== "track") next.actionElapsed = 0;
    }
  } else if (state.action === "greet" || state.action === "track") {
    const weatherStillArriving = state.action === "track" && next.weatherPhase === "arriving";
    if (!weatherStillArriving && next.actionElapsed > 900) next = finishAction(next);
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

export function clipForWorldAction(action: PetWorldAction): "idle" | "greet" | "discover" | "sleep" | "walk" | "run" | "jump" | "pounce" | "aerial" | "rollover" {
  if (action === "walk" || action === "run") return action;
  if (action === "seek-shelter" || action === "seek-sun" || action === "seek-shade") return "walk";
  if (action === "bask") return "idle";
  if (action === "aerial-pounce") return "aerial";
  if (action === "jump" || action === "pounce" || action === "rollover") return action;
  if (action === "greet") return "greet";
  if (action === "track") return "discover";
  if (action === "shelter" || action === "shade" || action === "focus") return "sleep";
  return "idle";
}
