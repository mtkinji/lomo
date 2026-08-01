import assert from "node:assert/strict";
import test from "node:test";

import { LEAFLING_HABITAT } from "../lib/pet-habitat.ts";

test("the habitat declares portable authored layers around world coordinates", () => {
  assert.deepEqual(LEAFLING_HABITAT.backdrop.size, { width: 480, height: 240 });
  assert.equal(LEAFLING_HABITAT.backdrop.parallax, 0.85);
  assert.deepEqual(LEAFLING_HABITAT.shelterTree.size, { width: 176, height: 196 });
  assert.deepEqual(LEAFLING_HABITAT.shelterTree.anchor, { x: 88, y: 196 });
  assert.deepEqual(LEAFLING_HABITAT.foreground.size, { width: 480, height: 64 });
  assert.equal(LEAFLING_HABITAT.foreground.baseline, 8);
});

test("authored habitat assets remain weather-neutral and renderer-independent", () => {
  assert.match(LEAFLING_HABITAT.backdrop.src, /leafling-habitat-backdrop-v1\.png$/);
  assert.match(LEAFLING_HABITAT.shelterTree.src, /leafling-shelter-tree-v1\.png$/);
  assert.match(LEAFLING_HABITAT.foreground.src, /leafling-meadow-foreground-v1\.png$/);
  assert.equal(LEAFLING_HABITAT.weatherBakedIn, false);
});
