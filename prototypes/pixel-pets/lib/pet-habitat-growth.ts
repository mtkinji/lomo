import { ENGINE_SCENE } from "./pet-engine.ts";

export type BecomingTreeStage = "sprout" | "sapling" | "young-tree" | "canopy";

export const BECOMING_TREE = {
  x: 292,
  groundY: ENGINE_SCENE.groundY,
  hitRadiusX: 18,
  hitHeight: 44,
} as const;

export interface BecomingTreePresentation {
  stage: BecomingTreeStage;
  trunkHeight: number;
  crownWidth: number;
  crownHeight: number;
  branchPairs: number;
}

export function resolveBecomingTreePresentation(growth: number): BecomingTreePresentation {
  const bounded = Math.max(0, Math.min(8, Math.floor(growth)));
  if (bounded >= 8) return { stage: "canopy", trunkHeight: 31, crownWidth: 30, crownHeight: 24, branchPairs: 3 };
  if (bounded >= 3) return { stage: "young-tree", trunkHeight: 24, crownWidth: 22, crownHeight: 18, branchPairs: 2 };
  if (bounded >= 1) return { stage: "sapling", trunkHeight: 16, crownWidth: 14, crownHeight: 11, branchPairs: 1 };
  return { stage: "sprout", trunkHeight: 8, crownWidth: 8, crownHeight: 6, branchPairs: 0 };
}

export function resolveBecomingTreeHit(point: { x: number; y: number }): boolean {
  return Math.abs(point.x - BECOMING_TREE.x) <= BECOMING_TREE.hitRadiusX
    && point.y <= BECOMING_TREE.groundY + 4
    && point.y >= BECOMING_TREE.groundY - BECOMING_TREE.hitHeight;
}
