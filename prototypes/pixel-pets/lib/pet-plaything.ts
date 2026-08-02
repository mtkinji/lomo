import type { PetStage } from "./pet-state";

export type WindLeafPhase = "perched" | "held" | "flying" | "landed" | "caught" | "carried" | "offered";
export type WindLeafMode = "ground" | "leap" | "aerial";
export type WindLeafWeather = "sunny" | "breeze" | "rain";
export type WindLeafFlightProfileId = "sun-updraft" | "wind-drift" | "rain-heavy";

export interface WindLeafPoint {
  x: number;
  y: number;
}

export interface WindLeafState {
  phase: WindLeafPhase;
  mode: WindLeafMode;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  catchX: number;
  returnX: number;
  returnY: number;
  throwCount: number;
  ageMs: number;
  flight: WindLeafFlightProfile;
}

export interface WindLeafFlightProfile {
  id: WindLeafFlightProfileId;
  weather: WindLeafWeather;
  gravity: number;
  windX: number;
  drag: number;
  maxFlightMs: number;
}

export const WIND_LEAF = {
  perchX: 176,
  perchY: 122,
  minX: 24,
  maxX: 456,
  minY: 38,
  groundY: 202,
  grabRadius: 18,
  maxVelocityX: 0.12,
  maxVelocityY: 0.16,
  returnDelayMs: 1280,
} as const;

const MODE_FOR_STAGE: Record<PetStage, WindLeafMode> = {
  baby: "ground",
  young: "leap",
  guardian: "aerial",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function resolveWindLeafFlightProfile(
  weather: WindLeafWeather,
  weatherSway = 0,
  intensity = 1,
): WindLeafFlightProfile {
  const settledIntensity = clamp(intensity, 0, 1);
  const direction = Math.abs(weatherSway) < 0.12 ? 1 : Math.sign(weatherSway);
  const gust = clamp(Math.abs(weatherSway) / 2.2, 0.45, 1);
  if (weather === "breeze") {
    return {
      id: "wind-drift",
      weather,
      gravity: 0.00045,
      windX: direction * (0.000018 + gust * 0.000016) * settledIntensity,
      drag: 0.9991,
      maxFlightMs: 2700,
    };
  }
  if (weather === "rain") {
    return {
      id: "rain-heavy",
      weather,
      gravity: 0.00072,
      windX: direction * gust * 0.000004 * settledIntensity,
      drag: 0.9962,
      maxFlightMs: 1800,
    };
  }
  return {
    id: "sun-updraft",
    weather,
    gravity: 0.00033,
    windX: 0,
    drag: 0.9993,
    maxFlightMs: 3000,
  };
}

function clampPoint(point: WindLeafPoint): WindLeafPoint {
  return {
    x: clamp(point.x, WIND_LEAF.minX, WIND_LEAF.maxX),
    y: clamp(point.y, WIND_LEAF.minY, WIND_LEAF.groundY),
  };
}

export function windLeafModeForStage(stage: PetStage): WindLeafMode {
  return MODE_FOR_STAGE[stage];
}

export function createWindLeaf(): WindLeafState {
  return {
    phase: "perched",
    mode: "ground",
    x: WIND_LEAF.perchX,
    y: WIND_LEAF.perchY,
    velocityX: 0,
    velocityY: 0,
    catchX: WIND_LEAF.perchX,
    returnX: WIND_LEAF.perchX,
    returnY: WIND_LEAF.perchY,
    throwCount: 0,
    ageMs: 0,
    flight: resolveWindLeafFlightProfile("sunny"),
  };
}

export function isWindLeafHit(leaf: WindLeafState, point: WindLeafPoint) {
  if (leaf.phase === "held" || leaf.phase === "caught" || leaf.phase === "carried") return false;
  return Math.hypot(point.x - leaf.x, point.y - leaf.y) <= WIND_LEAF.grabRadius;
}

export function grabWindLeaf(
  leaf: WindLeafState,
  point: WindLeafPoint,
  stage: PetStage,
): WindLeafState {
  const clamped = clampPoint(point);
  return {
    ...leaf,
    phase: "held",
    mode: windLeafModeForStage(stage),
    x: clamped.x,
    y: clamped.y,
    velocityX: 0,
    velocityY: 0,
    catchX: clamped.x,
    ageMs: 0,
  };
}

export function dragWindLeaf(leaf: WindLeafState, point: WindLeafPoint): WindLeafState {
  if (leaf.phase !== "held") return leaf;
  const clamped = clampPoint(point);
  return { ...leaf, x: clamped.x, y: clamped.y, catchX: clamped.x };
}

interface WindLeafFlightStep {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  landed: boolean;
}

function stepFlight(
  point: WindLeafPoint,
  velocityX: number,
  velocityY: number,
  flight: WindLeafFlightProfile,
  dtMs: number,
): WindLeafFlightStep {
  const dt = clamp(dtMs, 0, 64);
  const nextVelocityY = velocityY + flight.gravity * dt;
  let nextVelocityX = (velocityX + flight.windX * dt) * Math.pow(flight.drag, dt);
  let x = point.x + nextVelocityX * dt;
  const rawY = point.y + nextVelocityY * dt;

  if (x <= WIND_LEAF.minX || x >= WIND_LEAF.maxX) {
    x = clamp(x, WIND_LEAF.minX, WIND_LEAF.maxX);
    nextVelocityX *= -0.34;
  }

  const landed = rawY >= WIND_LEAF.groundY;
  return {
    x,
    y: landed ? WIND_LEAF.groundY : Math.max(WIND_LEAF.minY, rawY),
    velocityX: nextVelocityX,
    velocityY: nextVelocityY,
    landed,
  };
}

function predictCatchX(
  point: WindLeafPoint,
  velocityX: number,
  velocityY: number,
  flight: WindLeafFlightProfile,
) {
  let prediction: WindLeafFlightStep = { x: point.x, y: point.y, velocityX, velocityY, landed: false };
  for (let elapsed = 0; elapsed < flight.maxFlightMs && !prediction.landed; elapsed += 16) {
    prediction = stepFlight(prediction, prediction.velocityX, prediction.velocityY, flight, 16);
  }
  return clamp(prediction.x, WIND_LEAF.minX, WIND_LEAF.maxX);
}

export function releaseWindLeaf(
  leaf: WindLeafState,
  velocity: WindLeafPoint,
  reducedMotion: boolean,
  flight = resolveWindLeafFlightProfile("sunny"),
): WindLeafState {
  if (leaf.phase !== "held") return leaf;
  if (reducedMotion) {
    return {
      ...leaf,
      phase: "landed",
      y: WIND_LEAF.groundY,
      velocityX: 0,
      velocityY: 0,
      catchX: leaf.x,
      returnX: leaf.x,
      returnY: leaf.y,
      throwCount: leaf.throwCount + 1,
      ageMs: 0,
      flight,
    };
  }

  const velocityX = clamp(velocity.x, -WIND_LEAF.maxVelocityX, WIND_LEAF.maxVelocityX);
  const velocityY = clamp(velocity.y, -WIND_LEAF.maxVelocityY, WIND_LEAF.maxVelocityY);
  return {
    ...leaf,
    phase: "flying",
    velocityX,
    velocityY,
    catchX: predictCatchX(leaf, velocityX, velocityY, flight),
    returnX: leaf.x,
    returnY: leaf.y,
    throwCount: leaf.throwCount + 1,
    ageMs: 0,
    flight,
  };
}

export function catchWindLeaf(leaf: WindLeafState): WindLeafState {
  return {
    ...leaf,
    phase: "caught",
    x: leaf.catchX,
    y: WIND_LEAF.groundY - 18,
    velocityX: 0,
    velocityY: 0,
    ageMs: 0,
  };
}

const CARRY_OFFSET: Record<PetStage, { forward: number; lift: number }> = {
  baby: { forward: 13, lift: 10 },
  young: { forward: 18, lift: 7 },
  guardian: { forward: 22, lift: 22 },
};

export function carryWindLeaf(
  leaf: WindLeafState,
  petX: number,
  stage: PetStage,
  facing: -1 | 1,
): WindLeafState {
  const offset = CARRY_OFFSET[stage];
  return {
    ...leaf,
    phase: "carried",
    x: clamp(petX + facing * offset.forward, WIND_LEAF.minX, WIND_LEAF.maxX),
    y: WIND_LEAF.groundY - offset.lift,
    velocityX: 0,
    velocityY: 0,
    ageMs: 0,
  };
}

export function offerWindLeaf(leaf: WindLeafState): WindLeafState {
  return {
    ...leaf,
    phase: "offered",
    x: clamp(leaf.returnX, WIND_LEAF.minX, WIND_LEAF.maxX),
    y: WIND_LEAF.groundY - 10,
    velocityX: 0,
    velocityY: 0,
    ageMs: 0,
  };
}

export function stepWindLeaf(leaf: WindLeafState, dtMs: number): WindLeafState {
  const dt = clamp(dtMs, 0, 64);
  if (leaf.phase === "perched" || leaf.phase === "held" || leaf.phase === "landed" || leaf.phase === "carried" || leaf.phase === "offered") return leaf;
  if (leaf.phase === "caught") {
    if (leaf.throwCount > 0) return leaf;
    const ageMs = leaf.ageMs + Math.max(0, dtMs);
    return ageMs >= WIND_LEAF.returnDelayMs ? createWindLeaf() : { ...leaf, ageMs };
  }

  const ageMs = leaf.ageMs + dt;
  const stepped = stepFlight(leaf, leaf.velocityX, leaf.velocityY, leaf.flight, dt);

  if (stepped.landed || ageMs >= leaf.flight.maxFlightMs) {
    return {
      ...leaf,
      phase: "landed",
      x: clamp(stepped.x, WIND_LEAF.minX, WIND_LEAF.maxX),
      y: WIND_LEAF.groundY,
      velocityX: 0,
      velocityY: 0,
      ageMs,
    };
  }

  return {
    ...leaf,
    x: stepped.x,
    y: stepped.y,
    velocityX: stepped.velocityX,
    velocityY: stepped.velocityY,
    ageMs,
  };
}
