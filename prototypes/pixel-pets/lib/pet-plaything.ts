import type { PetStage } from "./pet-state";

export type WindLeafPhase = "perched" | "held" | "flying" | "landed" | "caught";
export type WindLeafMode = "ground" | "leap" | "aerial";

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
  ageMs: number;
}

export const WIND_LEAF = {
  perchX: 176,
  perchY: 122,
  minX: 24,
  maxX: 456,
  minY: 38,
  groundY: 202,
  grabRadius: 18,
  gravity: 0.00046,
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
    ageMs: 0,
  };
}

export function isWindLeafHit(leaf: WindLeafState, point: WindLeafPoint) {
  if (leaf.phase !== "perched") return false;
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

function predictCatchX(point: WindLeafPoint, velocityX: number, velocityY: number) {
  const distanceToGround = Math.max(0, WIND_LEAF.groundY - point.y);
  const discriminant = velocityY * velocityY + 2 * WIND_LEAF.gravity * distanceToGround;
  const flightMs = discriminant <= 0
    ? 0
    : (-velocityY + Math.sqrt(discriminant)) / WIND_LEAF.gravity;
  return clamp(
    point.x + velocityX * Math.min(1700, flightMs) * 0.7,
    WIND_LEAF.minX,
    WIND_LEAF.maxX,
  );
}

export function releaseWindLeaf(
  leaf: WindLeafState,
  velocity: WindLeafPoint,
  reducedMotion: boolean,
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
      ageMs: 0,
    };
  }

  const velocityX = clamp(velocity.x, -WIND_LEAF.maxVelocityX, WIND_LEAF.maxVelocityX);
  const velocityY = clamp(velocity.y, -WIND_LEAF.maxVelocityY, WIND_LEAF.maxVelocityY);
  return {
    ...leaf,
    phase: "flying",
    velocityX,
    velocityY,
    catchX: predictCatchX(leaf, velocityX, velocityY),
    ageMs: 0,
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

export function stepWindLeaf(leaf: WindLeafState, dtMs: number): WindLeafState {
  const dt = clamp(dtMs, 0, 64);
  if (leaf.phase === "perched" || leaf.phase === "held" || leaf.phase === "landed") return leaf;
  if (leaf.phase === "caught") {
    const ageMs = leaf.ageMs + Math.max(0, dtMs);
    return ageMs >= WIND_LEAF.returnDelayMs ? createWindLeaf() : { ...leaf, ageMs };
  }

  const ageMs = leaf.ageMs + dt;
  const velocityY = leaf.velocityY + WIND_LEAF.gravity * dt;
  let velocityX = leaf.velocityX * Math.pow(0.9987, dt);
  let x = leaf.x + velocityX * dt;
  const y = leaf.y + velocityY * dt;

  if (x <= WIND_LEAF.minX || x >= WIND_LEAF.maxX) {
    x = clamp(x, WIND_LEAF.minX, WIND_LEAF.maxX);
    velocityX *= -0.34;
  }

  if (y >= WIND_LEAF.groundY || ageMs >= 2400) {
    return {
      ...leaf,
      phase: "landed",
      x: clamp(x, WIND_LEAF.minX, WIND_LEAF.maxX),
      y: WIND_LEAF.groundY,
      velocityX: 0,
      velocityY: 0,
      ageMs,
    };
  }

  return {
    ...leaf,
    x,
    y: Math.max(WIND_LEAF.minY, y),
    velocityX,
    velocityY,
    ageMs,
  };
}
