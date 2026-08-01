import assert from "node:assert/strict";
import test from "node:test";

import {
  VISITOR_PERFORMANCE_CLIPS,
  resolveVisitorPerformance,
} from "../lib/pet-visitor-performance.ts";
import { PET_WORLD } from "../lib/pet-world.ts";
import type { WorldVisitor } from "../lib/pet-world.ts";

function visitor(
  kind: WorldVisitor["kind"],
  overrides: Partial<WorldVisitor> = {},
): WorldVisitor {
  return {
    active: true,
    kind,
    x: 260,
    y: kind === "crawler" ? PET_WORLD.visitorGroundY : kind === "firefly" ? 158 : 112,
    originY: kind === "crawler" ? PET_WORLD.visitorGroundY : kind === "firefly" ? 158 : 112,
    direction: 1,
    ageMs: 0,
    engaged: false,
    engagedAgeMs: 0,
    launchX: 240,
    ...overrides,
  };
}

test("every visitor owns a nonlinear limited-animation vocabulary", () => {
  for (const [kind, clip] of Object.entries(VISITOR_PERFORMANCE_CLIPS)) {
    assert.ok(clip.frames.length >= 4, `${kind} needs more than a two-state symbol`);
    assert.ok(new Set(clip.frames.map((frame) => frame.duration)).size >= 3, `${kind} timing needs holds and accents`);
    assert.ok(clip.frames.some((frame) => frame.role === "hold"));
    assert.ok(clip.frames.some((frame) => frame.role === "accent"));
  }
});

test("the crawler keeps planted contact while its shell, legs, and antennae act", () => {
  const poses = [0, 190, 280, 470].map((ageMs) =>
    resolveVisitorPerformance(visitor("crawler", { ageMs }), "sunny", false)
  );

  assert.ok(poses.every((pose) => pose.contact === "planted"));
  assert.ok(poses.every((pose) => pose.rigDrop === 0), "body acting cannot lift the planted rig");
  assert.ok(new Set(poses.map((pose) => pose.legPhase)).size > 1);
  assert.ok(new Set(poses.map((pose) => pose.bodyDrop)).size > 1, "the shell may compress over planted feet");
  assert.ok(new Set(poses.map((pose) => pose.shellShift)).size > 1);
  assert.ok(new Set(poses.map((pose) => pose.antennaLift)).size > 1);
});

test("the firefly beats its wings faster than its warm glow breathes", () => {
  const first = resolveVisitorPerformance(visitor("firefly", { ageMs: 120 }), "sunny", false);
  const second = resolveVisitorPerformance(visitor("firefly", { ageMs: 190 }), "sunny", false);

  assert.notEqual(first.wingPhase, second.wingPhase);
  assert.ok(Math.abs(first.glow - second.glow) < 0.12, "glow cannot flash with every wing drawing");
  assert.equal(first.material, "warm");
});

test("an escaping sky moth banks into its actual world direction", () => {
  const right = resolveVisitorPerformance(
    visitor("sky-moth", { direction: 1, engaged: true, engagedAgeMs: 260, ageMs: 480 }),
    "breeze",
    false,
  );
  const left = resolveVisitorPerformance(
    visitor("sky-moth", { direction: -1, engaged: true, engagedAgeMs: 260, ageMs: 480 }),
    "breeze",
    false,
  );

  assert.ok(right.bank > 0);
  assert.ok(left.bank < 0);
  assert.equal(right.bank, -left.bank);
  assert.ok(right.escapeEnergy > 0);
  assert.equal(right.material, "wind");
});

test("weather changes visitor material without changing pursuit authority", () => {
  const flying = visitor("firefly", { ageMs: 330, engaged: true, engagedAgeMs: 90 });
  const sun = resolveVisitorPerformance(flying, "sunny", false);
  const breeze = resolveVisitorPerformance(flying, "breeze", false);
  const rain = resolveVisitorPerformance(flying, "rain", false);

  assert.deepEqual([sun.material, breeze.material, rain.material], ["warm", "wind", "wet"]);
  assert.equal(sun.frame, breeze.frame);
  assert.equal(breeze.frame, rain.frame);
  assert.ok(rain.rigDrop > sun.rigDrop);
  assert.ok(rain.glow < sun.glow);
});

test("Reduce Motion resolves one stable species key while preserving direction meaning", () => {
  const early = resolveVisitorPerformance(
    visitor("sky-moth", { direction: -1, engaged: true, engagedAgeMs: 20, ageMs: 80 }),
    "breeze",
    true,
  );
  const late = resolveVisitorPerformance(
    visitor("sky-moth", { direction: -1, engaged: true, engagedAgeMs: 600, ageMs: 2400 }),
    "breeze",
    true,
  );

  assert.equal(early.frame, late.frame);
  assert.equal(early.wingPhase, late.wingPhase);
  assert.equal(early.glow, late.glow);
  assert.equal(early.dust, 0);
  assert.equal(early.escapeEnergy, late.escapeEnergy);
  assert.ok(early.bank < 0);
  assert.equal(early.bank, late.bank);
});
