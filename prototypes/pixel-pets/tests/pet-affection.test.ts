import assert from "node:assert/strict";
import test from "node:test";

import {
  isPetContactHit,
  resolvePetContactGesture,
} from "../lib/pet-affection.ts";
import { createPetWorldState } from "../lib/pet-world.ts";

test("the contact target follows the rendered stage silhouette", () => {
  const world = { ...createPetWorldState(), petX: 240, cameraX: 240, poseY: 0, zoom: 1 };

  assert.equal(isPetContactHit(world, "baby", { x: 80, y: 178 }), true);
  assert.equal(isPetContactHit(world, "baby", { x: 80, y: 138 }), false);
  assert.equal(isPetContactHit(world, "guardian", { x: 80, y: 151 }), true);
  assert.equal(isPetContactHit(world, "guardian", { x: 22, y: 151 }), false);
});

test("a stationary body tap remains a hello rather than becoming affection", () => {
  assert.equal(resolvePetContactGesture({
    startedOnPet: true,
    leftPet: false,
    start: { x: 80, y: 176 },
    current: { x: 82, y: 174 },
    durationMs: 220,
  }), "tap");
});

test("a small slow stroke becomes affection", () => {
  assert.equal(resolvePetContactGesture({
    startedOnPet: true,
    leftPet: false,
    start: { x: 76, y: 169 },
    current: { x: 88, y: 178 },
    durationMs: 280,
  }), "affection");
});

test("Olive's quick broad horizontal swipe remains rollover", () => {
  assert.equal(resolvePetContactGesture({
    startedOnPet: true,
    leftPet: false,
    start: { x: 62, y: 176 },
    current: { x: 96, y: 179 },
    durationMs: 240,
  }), "rollover");
});

test("a gesture that leaves the body becomes hand guidance", () => {
  assert.equal(resolvePetContactGesture({
    startedOnPet: true,
    leftPet: true,
    start: { x: 80, y: 174 },
    current: { x: 132, y: 130 },
    durationMs: 310,
  }), "guide");
  assert.equal(resolvePetContactGesture({
    startedOnPet: false,
    leftPet: false,
    start: { x: 35, y: 160 },
    current: { x: 58, y: 155 },
    durationMs: 180,
  }), "guide");
});

test("a short edge stroke that actually leaves the silhouette becomes guidance", () => {
  assert.equal(resolvePetContactGesture({
    startedOnPet: true,
    leftPet: true,
    start: { x: 103, y: 174 },
    current: { x: 115, y: 174 },
    durationMs: 260,
  }), "guide");
});

test("ordinary five-pixel touch jitter remains a tap", () => {
  assert.equal(resolvePetContactGesture({
    startedOnPet: true,
    leftPet: false,
    start: { x: 80, y: 174 },
    current: { x: 85, y: 174 },
    durationMs: 210,
  }), "tap");
});
