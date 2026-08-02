import assert from "node:assert/strict";
import test from "node:test";

import {
  BECOMING_TREE,
  resolveBecomingTreeHit,
  resolveBecomingTreePresentation,
} from "../lib/pet-habitat-growth.ts";

test("the becoming tree gains readable stages without becoming a meter", () => {
  assert.equal(resolveBecomingTreePresentation(0).stage, "sprout");
  assert.equal(resolveBecomingTreePresentation(1).stage, "sapling");
  assert.equal(resolveBecomingTreePresentation(3).stage, "young-tree");
  assert.equal(resolveBecomingTreePresentation(8).stage, "canopy");
  assert.equal(resolveBecomingTreePresentation(99).stage, "canopy");
});

test("the becoming tree owns one generous world-space touch target", () => {
  assert.equal(resolveBecomingTreeHit({ x: BECOMING_TREE.x, y: BECOMING_TREE.groundY - 12 }), true);
  assert.equal(resolveBecomingTreeHit({ x: BECOMING_TREE.x + BECOMING_TREE.hitRadiusX + 1, y: BECOMING_TREE.groundY - 12 }), false);
  assert.equal(resolveBecomingTreeHit({ x: BECOMING_TREE.x, y: BECOMING_TREE.groundY - BECOMING_TREE.hitHeight - 1 }), false);
});
