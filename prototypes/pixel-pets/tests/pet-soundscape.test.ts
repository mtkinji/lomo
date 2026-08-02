import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePetVoice,
  resolveSoundscapeMix,
  resolveVisitorVoice,
} from "../lib/pet-soundscape.ts";

test("muting collapses every soundscape layer without changing world meaning", () => {
  const mix = resolveSoundscapeMix({
    enabled: false,
    weather: "rain",
    weatherIntensity: 1,
    focusHush: 0,
    visitor: "sky-moth",
  });

  assert.deepEqual(mix, {
    master: 0,
    meadow: 0,
    wind: 0,
    rain: 0,
    warmth: 0,
    focus: 0,
    wildlife: 0,
  });
});

test("weather arrives as a crossfaded layer rather than an abrupt replacement", () => {
  const arriving = resolveSoundscapeMix({
    enabled: true,
    weather: "rain",
    weatherIntensity: 0.35,
    focusHush: 0,
    visitor: null,
  });
  const settled = resolveSoundscapeMix({
    enabled: true,
    weather: "rain",
    weatherIntensity: 1,
    focusHush: 0,
    visitor: null,
  });

  assert.ok(arriving.rain > 0);
  assert.ok(arriving.rain < settled.rain);
  assert.ok(settled.meadow > 0, "rain remains part of one meadow instead of replacing it");
  assert.equal(settled.wind, 0);
  assert.equal(settled.warmth, 0);
});

test("Focus hushes weather and wildlife while adding one stable quiet tone", () => {
  const ordinary = resolveSoundscapeMix({
    enabled: true,
    weather: "breeze",
    weatherIntensity: 1,
    focusHush: 0,
    visitor: "firefly",
  });
  const focusing = resolveSoundscapeMix({
    enabled: true,
    weather: "breeze",
    weatherIntensity: 1,
    focusHush: 1,
    visitor: "firefly",
  });

  assert.ok(focusing.wind < ordinary.wind);
  assert.ok(focusing.wildlife < ordinary.wildlife);
  assert.ok(focusing.meadow < ordinary.meadow);
  assert.ok(focusing.focus > 0);
  assert.ok(focusing.master <= ordinary.master);
});

test("Moss's voice matures downward and lengthens without becoming a reward fanfare", () => {
  const baby = resolvePetVoice("baby", "greet");
  const young = resolvePetVoice("young", "greet");
  const guardian = resolvePetVoice("guardian", "greet");

  assert.ok(baby.frequencies[0] > young.frequencies[0]);
  assert.ok(young.frequencies[0] > guardian.frequencies[0]);
  assert.ok(baby.durationSeconds < guardian.durationSeconds);
  assert.ok(guardian.durationSeconds <= 0.62);
  assert.equal(baby.waveform, "triangle");
  assert.equal(guardian.peakGain <= 0.11, true);
});

test("wildlife cues occupy distinct light registers and remain brief", () => {
  const crawler = resolveVisitorVoice("crawler");
  const firefly = resolveVisitorVoice("firefly");
  const moth = resolveVisitorVoice("sky-moth");

  assert.ok(crawler.frequency < firefly.frequency);
  assert.ok(firefly.frequency < moth.frequency);
  assert.ok([crawler, firefly, moth].every((cue) => cue.durationSeconds <= 0.34));
});
