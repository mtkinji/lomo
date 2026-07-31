export const PET_WORLD = {
  width: 480,
  viewportWidth: 160,
  minX: 24,
  maxX: 456,
  minZoom: 1,
  maxZoom: 2.25,
  jumpDuration: 850,
  pounceDuration: 720,
  rolloverDuration: 1200,
  treeShelterX: 112,
  sunPatchX: 366,
  maxWeatherSway: 2.2,
} as const;

export type PetWeather = "sunny" | "breeze" | "rain";
export type PetWorldAction = "idle" | "greet" | "track" | "walk" | "run" | "jump" | "pounce" | "rollover" | "seek-shelter" | "shelter" | "bask" | "focus";

export interface WorldPoint {
  x: number;
  y: number;
}

export type PetWorldIntent =
  | { kind: "greet"; worldX: number }
  | { kind: "move"; worldX: number }
  | { kind: "jump"; worldX: number }
  | { kind: "rollover"; worldX: number };

export interface WorldInsect {
  active: boolean;
  x: number;
  y: number;
  originY: number;
  direction: -1 | 1;
  ageMs: number;
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
  weatherElapsed: number;
  weatherSway: number;
  focus: {
    active: boolean;
    remainingMs: number;
    completed: boolean;
  };
  insect: WorldInsect;
}

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
    weatherElapsed: 0,
    weatherSway: 0,
    focus: { active: false, remainingMs: 0, completed: false },
    insect: { active: false, x: 0, y: 0, originY: 0, direction: 1, ageMs: 0 },
  };
}

export function setWorldWeather(state: PetWorldState, weather: PetWeather): PetWorldState {
  if (weather === "rain") {
    return {
      ...state,
      weather,
      weatherElapsed: 0,
      action: "seek-shelter",
      actionElapsed: 0,
      targetX: PET_WORLD.treeShelterX,
      facing: PET_WORLD.treeShelterX < state.petX ? -1 : 1,
    };
  }

  if (weather === "sunny") {
    return {
      ...state,
      weather,
      weatherElapsed: 0,
      action: "bask",
      actionElapsed: 0,
      targetX: PET_WORLD.sunPatchX,
      facing: PET_WORLD.sunPatchX < state.petX ? -1 : 1,
    };
  }

  return {
    ...state,
    weather,
    weatherElapsed: 0,
    weatherSway: 0,
    action: "track",
    actionElapsed: 0,
    targetX: null,
  };
}

export function beginCompanionFocus(state: PetWorldState, durationMs = 60000): PetWorldState {
  return {
    ...state,
    action: "seek-shelter",
    actionElapsed: 0,
    targetX: PET_WORLD.treeShelterX,
    facing: PET_WORLD.treeShelterX < state.petX ? -1 : 1,
    focus: { active: true, remainingMs: Math.max(1, durationMs), completed: false },
  };
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

export function spawnInsect(
  state: PetWorldState,
  insect: { x?: number; y?: number; direction?: -1 | 1 } = {},
): PetWorldState {
  const direction = insect.direction ?? (state.petX > PET_WORLD.width / 2 ? -1 : 1);
  const x = insect.x ?? (direction === 1 ? state.cameraX - 94 / state.zoom : state.cameraX + 94 / state.zoom);
  const y = insect.y ?? 162;
  return {
    ...state,
    insect: { active: true, x: clampWorldX(x), y, originY: y, direction, ageMs: 0 },
  };
}

export function resolveRolloverPose(elapsedMs: number): { rotation: number; clipElapsed: number } {
  const elapsed = clamp(elapsedMs, 0, PET_WORLD.rolloverDuration);
  const curlDuration = 300;
  const rollEnd = 900;

  if (elapsed < curlDuration) {
    return { rotation: 0, clipElapsed: Math.round((elapsed / curlDuration) * 940) };
  }
  if (elapsed <= rollEnd) {
    return {
      rotation: ((elapsed - curlDuration) / (rollEnd - curlDuration)) * 360,
      clipElapsed: 1000,
    };
  }
  return {
    rotation: 0,
    clipElapsed: Math.round(((PET_WORLD.rolloverDuration - elapsed) / (PET_WORLD.rolloverDuration - rollEnd)) * 940),
  };
}

function finishAction(state: PetWorldState): PetWorldState {
  return { ...state, action: "idle", actionElapsed: 0, targetX: null, poseY: 0, rotation: 0 };
}

function moveToward(value: number, target: number, distance: number) {
  if (Math.abs(target - value) <= distance) return target;
  return value + Math.sign(target - value) * distance;
}

export function stepPetWorld(state: PetWorldState, elapsedMs: number, reducedMotion: boolean): PetWorldState {
  const dt = Math.max(0, elapsedMs);
  const weatherElapsed = state.weatherElapsed + dt;
  const weatherSway = state.weather === "breeze"
    ? Math.sin(weatherElapsed / 230) * PET_WORLD.maxWeatherSway
    : state.weather === "rain"
      ? Math.sin(weatherElapsed / 170) * 0.7
      : 0;
  let next: PetWorldState = {
    ...state,
    actionElapsed: state.actionElapsed + dt,
    weatherElapsed,
    weatherSway: reducedMotion ? 0 : weatherSway,
  };

  if (state.focus.active) {
    const remainingMs = Math.max(0, state.focus.remainingMs - dt);
    next.focus = { active: remainingMs > 0, remainingMs, completed: remainingMs === 0 };
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

  if (state.insect.active) {
    const ageMs = state.insect.ageMs + dt;
    const x = state.insect.x + state.insect.direction * dt * 0.026;
    const active = x > PET_WORLD.minX - 10 && x < PET_WORLD.maxX + 10 && ageMs < 9000;
    next.insect = {
      ...state.insect,
      active,
      ageMs,
      x,
      y: state.insect.originY + Math.sin(ageMs / 150) * 7 + Math.sin(ageMs / 53) * 2,
    };
  }

  if (reducedMotion) {
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
    if (state.action === "bask") {
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
    if (next.actionElapsed >= Math.min(300, PET_WORLD.rolloverDuration)) return finishAction({ ...next, poseY: 0, rotation: 0 });
    return { ...next, poseY: 0, rotation: 0 };
  }

  if (state.action === "rollover") {
    if (next.actionElapsed >= PET_WORLD.rolloverDuration) next = finishAction(next);
    else {
      const pose = resolveRolloverPose(next.actionElapsed);
      next.rotation = pose.rotation;
      next.poseY = 0;
    }
  } else if (state.action === "jump") {
    if (next.actionElapsed >= PET_WORLD.jumpDuration) next = finishAction(next);
    else {
      const progress = next.actionElapsed / PET_WORLD.jumpDuration;
      next.poseY = -Math.sin(progress * Math.PI) * 31;
      if (state.targetX !== null) next.petX = moveToward(state.petX, state.targetX, dt * 0.018);
    }
  } else if (state.action === "pounce") {
    if (next.actionElapsed >= PET_WORLD.pounceDuration) next = finishAction(next);
    else {
      const progress = next.actionElapsed / PET_WORLD.pounceDuration;
      const targetX = state.targetX ?? state.insect.x;
      next.petX = moveToward(state.petX, targetX, dt * 0.05);
      next.poseY = -Math.sin(progress * Math.PI) * 10;
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
      } else if (state.action === "bask") {
        next = { ...next, petX: state.targetX, targetX: null, action: "bask", actionElapsed: 0, poseY: 0 };
      } else next = finishAction({ ...next, petX: state.targetX });
    }
    else {
      const running = state.action !== "seek-shelter" && state.action !== "bask" && Math.abs(distance) > 52;
      const speed = running ? 0.052 : state.action === "seek-shelter" ? 0.032 : 0.024;
      next.petX = moveToward(state.petX, state.targetX, dt * speed);
      next.facing = distance < 0 ? -1 : 1;
      if (state.action !== "seek-shelter" && state.action !== "bask") next.action = running ? "run" : "walk";
      next.poseY = -Math.abs(Math.sin((state.actionElapsed + dt) / (running ? 85 : 125))) * (running ? 2 : 1);
    }
  } else if (state.action === "shelter" || state.action === "focus" || state.action === "bask") {
    next.poseY = 0;
    next.rotation = 0;
  } else if (next.insect.active) {
    const insectDistance = next.insect.x - state.petX;
    next.facing = insectDistance < 0 ? -1 : 1;
    if (Math.abs(insectDistance) <= 20 && next.insect.y > 158) {
      next.action = "pounce";
      next.actionElapsed = 0;
      next.targetX = clampWorldX(next.insect.x);
    } else if (Math.abs(insectDistance) <= 100) {
      next.action = "track";
      next.actionElapsed = 0;
    }
  } else if (state.action === "greet" || state.action === "track") {
    if (next.actionElapsed > 900) next = finishAction(next);
  }

  const desiredCamera = clampCameraX(next.petX, next.zoom);
  const follow = Math.min(1, dt / 280);
  next.cameraX = clampCameraX(state.cameraX + (desiredCamera - state.cameraX) * follow, next.zoom);
  return next;
}

export function clipForWorldAction(action: PetWorldAction): "idle" | "greet" | "discover" | "sleep" {
  if (action === "pounce" || action === "greet") return "greet";
  if (action === "track") return "discover";
  if (action === "rollover" || action === "shelter" || action === "focus") return "sleep";
  if (action === "bask" || action === "seek-shelter") return "discover";
  return "idle";
}
