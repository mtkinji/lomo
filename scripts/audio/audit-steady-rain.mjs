#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import {
  evaluateSteadyRain,
  STEADY_RAIN_DELIVERY_POLICY,
  STEADY_RAIN_POLICY,
} from './ambient-quality-lib.mjs';

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function summarize(values) {
  if (!values.length) throw new Error('Ambient analysis produced no measurements');
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    p05: percentile(values, 0.05),
    p95: percentile(values, 0.95),
    stdDev: Math.sqrt(
      values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length,
    ),
  };
}

function run(args, options = {}) {
  const result = spawnSync(ffmpegPath, args, { maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.error) throw new Error(`ffmpeg could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${String(result.stderr).trim()}`);
  return result;
}

function measureRms(file) {
  const result = run([
    '-hide_banner', '-loglevel', 'error', '-i', file,
    '-ac', '1', '-ar', '8000', '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1',
  ]);
  const samples = new Float32Array(
    result.stdout.buffer,
    result.stdout.byteOffset,
    Math.floor(result.stdout.byteLength / 4),
  );
  const windowFrames = 4_000;
  const windows = [];
  for (let offset = 0; offset + windowFrames <= samples.length; offset += windowFrames) {
    let energy = 0;
    for (let index = offset; index < offset + windowFrames; index += 1) {
      energy += samples[index] * samples[index];
    }
    windows.push(20 * Math.log10(Math.sqrt(energy / windowFrames) + 1e-12));
  }
  return summarize(windows);
}

function measureSpectralFlatness(file) {
  const result = run([
    '-hide_banner', '-nostats', '-i', file,
    '-af', 'aspectralstats=win_size=4096:overlap=0.75:measure=flatness,ametadata=print:key=lavfi.aspectralstats.1.flatness',
    '-f', 'null', '-',
  ], { encoding: 'utf8' });
  const values = [...result.stderr.matchAll(/flatness=([0-9.eE+-]+)/g)]
    .map((match) => Number(match[1]));
  return summarize(values);
}

for (const input of process.argv.slice(2)) {
  const file = path.resolve(input);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`Steady-rain input does not exist: ${input}`);
  }
  const rms = measureRms(file);
  const spectral = measureSpectralFlatness(file);
  const measurement = {
    rmsP05Dbfs: rms.p05,
    rmsP95Dbfs: rms.p95,
    rmsStdDevDb: rms.stdDev,
    spectralFlatnessP05: spectral.p05,
    spectralFlatnessP95: spectral.p95,
  };
  const policy = path.extname(file).toLowerCase() === '.wav'
    ? STEADY_RAIN_POLICY
    : STEADY_RAIN_DELIVERY_POLICY;
  const result = evaluateSteadyRain(measurement, policy);
  console.log(`${result.passes ? 'PASS' : 'REJECT'} ${input}`);
  console.log(
    `       loudness ${result.rmsSpreadDb} dB spread / ${rms.stdDev.toFixed(2)} dB deviation | spectral flatness ${spectral.p05.toFixed(2)}-${spectral.p95.toFixed(2)}`,
  );
  result.failures.forEach((failure) => console.log(`       - ${failure}`));
}
