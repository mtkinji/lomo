#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 48_000;
const BARS = 4;
const BEATS_PER_BAR = 4;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = path.join(repoRoot, 'assets/games/music');

const grooves = [
  {
    id: 'funk', bpm: 100,
    kick: [0, 0.75, 2, 2.75], snare: [1, 3], hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    ghost: [1.75, 3.75], ride: [],
  },
  {
    id: 'jazz', bpm: 96,
    kick: [0, 2], snare: [1, 3], hat: [1, 3],
    ghost: [1.67, 3.67], ride: [0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67],
  },
  {
    id: 'rock', bpm: 112,
    kick: [0, 2, 2.5], snare: [1, 3], hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    ghost: [], ride: [],
  },
  {
    id: 'blues', bpm: 88,
    kick: [0, 2], snare: [1, 3], hat: [0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67],
    ghost: [1.67, 3.67], ride: [], peak: 0.65,
  },
];

function seededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffff_ffff * 2 - 1;
  };
}

function addKick(samples, start, amount = 1) {
  const length = Math.round(SAMPLE_RATE * 0.32);
  let phase = 0;
  for (let index = 0; index < length && start + index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const frequency = 48 + 72 * Math.exp(-time * 24);
    phase += 2 * Math.PI * frequency / SAMPLE_RATE;
    samples[start + index] += Math.sin(phase) * Math.exp(-time * 16) * 0.72 * amount;
  }
}

function addSnare(samples, start, amount = 1, seed = 1) {
  const length = Math.round(SAMPLE_RATE * 0.22);
  const noise = seededNoise(seed);
  let previous = 0;
  for (let index = 0; index < length && start + index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const raw = noise();
    const bright = raw - previous * 0.72;
    previous = raw;
    const body = Math.sin(2 * Math.PI * 185 * time) * 0.24;
    samples[start + index] += (bright * 0.34 + body) * Math.exp(-time * 20) * amount;
  }
}

function addHat(samples, start, amount = 1, seed = 1) {
  const length = Math.round(SAMPLE_RATE * 0.075);
  const noise = seededNoise(seed);
  let previous = 0;
  for (let index = 0; index < length && start + index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const raw = noise();
    const bright = raw - previous;
    previous = raw;
    samples[start + index] += bright * Math.exp(-time * 58) * 0.11 * amount;
  }
}

function addRide(samples, start, amount = 1, seed = 1) {
  const length = Math.round(SAMPLE_RATE * 0.34);
  const noise = seededNoise(seed);
  for (let index = 0; index < length && start + index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const metal = Math.sin(2 * Math.PI * 2_480 * time) + 0.45 * Math.sin(2 * Math.PI * 3_710 * time);
    samples[start + index] += (metal * 0.07 + noise() * 0.025) * Math.exp(-time * 9) * amount;
  }
}

function writeMonoWav(filePath, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32_767), 44 + index * 2));
  fs.writeFileSync(filePath, buffer);
}

function buildGroove(groove, grooveIndex) {
  const secondsPerBeat = 60 / groove.bpm;
  const totalBeats = BARS * BEATS_PER_BAR;
  const renderBars = BARS + 2;
  const rendered = new Float64Array(Math.round(SAMPLE_RATE * renderBars * BEATS_PER_BAR * secondsPerBeat));
  const sampleAtBeat = (beat) => Math.round(beat * secondsPerBeat * SAMPLE_RATE);

  for (let bar = 0; bar < renderBars; bar += 1) {
    const barStart = bar * BEATS_PER_BAR;
    groove.kick.forEach((beat, index) => addKick(rendered, sampleAtBeat(barStart + beat), index === 0 ? 1 : 0.84));
    groove.snare.forEach((beat, index) => addSnare(rendered, sampleAtBeat(barStart + beat), 1, 1000 + grooveIndex * 100 + (bar % BARS) * 10 + index));
    groove.ghost.forEach((beat, index) => addSnare(rendered, sampleAtBeat(barStart + beat), 0.24, 2000 + grooveIndex * 100 + (bar % BARS) * 10 + index));
    groove.hat.forEach((beat, index) => addHat(rendered, sampleAtBeat(barStart + beat), index % 2 === 0 ? 1 : 0.72, 3000 + grooveIndex * 100 + (bar % BARS) * 20 + index));
    groove.ride.forEach((beat, index) => addRide(rendered, sampleAtBeat(barStart + beat), index % 3 === 0 ? 1 : 0.8, 4000 + grooveIndex * 100 + (bar % BARS) * 20 + index));
  }

  // Cut at the same quiet inter-beat phase on both ends. Rendering a bar on
  // either side keeps cymbal and drum decays continuous across the loop seam.
  const sliceStart = sampleAtBeat(BEATS_PER_BAR + 0.65);
  const sliceLength = sampleAtBeat(totalBeats);
  const samples = rendered.slice(sliceStart, sliceStart + sliceLength);
  const peak = samples.reduce((largest, sample) => Math.max(largest, Math.abs(sample)), 0);
  const gain = (groove.peak ?? 0.56) / peak;
  const bedCycles = Math.round(samples.length / SAMPLE_RATE * 55);
  for (let index = 0; index < samples.length; index += 1) {
    const phase = 2 * Math.PI * bedCycles * index / samples.length;
    samples[index] = samples[index] * gain + Math.sin(phase) * 0.0018;
  }
  writeMonoWav(path.join(outputDirectory, `pattern-${groove.id}.wav`), samples);
}

fs.mkdirSync(outputDirectory, { recursive: true });
grooves.forEach(buildGroove);
console.log(`Built ${grooves.length} deterministic Pass the Pattern grooves in ${path.relative(repoRoot, outputDirectory)}`);
