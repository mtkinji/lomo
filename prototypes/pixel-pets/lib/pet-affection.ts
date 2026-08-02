import { ENGINE_SCENE } from "./pet-engine.ts";
import { LEAFLING_PRESENTATION } from "./leafling.ts";
import type { PetWorldState, WorldPoint } from "./pet-world.ts";
import type { PetStage } from "./pet-state.ts";

export type PetContactGesture = "tap" | "affection" | "rollover" | "guide";

export interface PetContactGestureInput {
  startedOnPet: boolean;
  leftPet: boolean;
  start: WorldPoint;
  current: WorldPoint;
  durationMs: number;
}

export function isPetContactHit(
  world: PetWorldState,
  stage: PetStage,
  point: WorldPoint,
) {
  const presentation = LEAFLING_PRESENTATION.stages[stage];
  const screenX = ENGINE_SCENE.width / 2
    + (world.petX - world.cameraX) * world.zoom;
  const groundY = ENGINE_SCENE.groundY + world.poseY * world.zoom;
  const halfWidth = (presentation.width * world.zoom) / 2 + 8;
  const top = groundY - presentation.height * world.zoom - 7;
  const bottom = groundY + 6;
  return Math.abs(point.x - screenX) <= halfWidth
    && point.y >= top
    && point.y <= bottom;
}

export function resolvePetContactGesture({
  startedOnPet,
  leftPet,
  start,
  current,
  durationMs,
}: PetContactGestureInput): PetContactGesture {
  const travelX = current.x - start.x;
  const travelY = current.y - start.y;
  const distance = Math.hypot(travelX, travelY);

  if (distance < 6) return "tap";
  if (!startedOnPet) return "guide";

  const broadHorizontalSwipe = Math.abs(travelX) >= 28
    && Math.abs(travelX) > Math.abs(travelY) * 1.4
    && durationMs <= 460;
  if (broadHorizontalSwipe) return "rollover";
  if (leftPet) return "guide";
  if (distance > 40) return "guide";
  if (durationMs >= 140 && distance <= 34) return "affection";
  return "tap";
}
