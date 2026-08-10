#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { parseFile } from 'music-metadata';
import { evaluateLoopSeam, measureLoopBoundary } from './loop-seam-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function parseArgs(argv) {
  const options = { enforce: false, jsonPath: null, windowSeconds: 1, inputs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--enforce') options.enforce = true;
    else if (arg === '--json') options.jsonPath = argv[++index];
    else if (arg === '--window-seconds') options.windowSeconds = Number(argv[++index]);
    else options.inputs.push(arg);
  }
  if (!Number.isFinite(options.windowSeconds) || options.windowSeconds <= 0) {
    throw new Error('--window-seconds must be a positive number');
  }
  if (!options.inputs.length) throw new Error('Pass at least one looping audio file');
  return options;
}

function decodeWindow(file, startSeconds, durationSeconds, sampleRateHz, channels) {
  const result = spawnSync(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error',
    '-ss', String(Math.max(0, startSeconds)),
    '-i', file,
    '-t', String(durationSeconds),
    '-vn', '-sn', '-dn',
    '-ac', String(channels),
    '-ar', String(sampleRateHz),
    '-c:a', 'pcm_f32le',
    '-f', 'f32le',
    'pipe:1',
  ], { maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(`ffmpeg could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${String(result.stderr).trim()}`);
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4)).slice();
}

async function audit(fileArg, windowSeconds) {
  const file = path.resolve(repoRoot, fileArg);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`Looping audio file does not exist: ${fileArg}`);
  }
  const metadata = await parseFile(file, { duration: true });
  const durationSeconds = Number(metadata.format.duration);
  const sampleRateHz = Number(metadata.format.sampleRate);
  const channels = Number(metadata.format.numberOfChannels);
  if (![durationSeconds, sampleRateHz, channels].every(Number.isFinite)) {
    throw new Error(`Incomplete audio metadata for ${fileArg}`);
  }
  const measuredWindowSeconds = Math.min(windowSeconds, durationSeconds / 2);
  const startSamples = decodeWindow(file, 0, measuredWindowSeconds, sampleRateHz, channels);
  const endSamples = decodeWindow(
    file,
    durationSeconds - measuredWindowSeconds,
    measuredWindowSeconds,
    sampleRateHz,
    channels,
  );
  const measurement = measureLoopBoundary({ startSamples, endSamples, sampleRateHz, channels });
  return {
    path: path.relative(repoRoot, file),
    durationSeconds: Number(durationSeconds.toFixed(3)),
    sampleRateHz,
    channels,
    windowSeconds: measuredWindowSeconds,
    ...measurement,
    ...evaluateLoopSeam(measurement),
  };
}

const options = parseArgs(process.argv.slice(2));
const report = await Promise.all(options.inputs.map((input) => audit(input, options.windowSeconds)));

for (const item of report) {
  console.log(`${item.passes ? 'PASS' : 'REVIEW'} ${item.path}`);
  console.log(
    `       boundary ${item.startRmsDbfs}/${item.endRmsDbfs} dBFS (${item.rmsDeltaDb} dB delta) | lead ${Math.round(item.leadingSilenceSeconds * 1_000)} ms | tail ${Math.round(item.trailingSilenceSeconds * 1_000)} ms | derivative ${item.derivativeJumpDbfs} dBFS`,
  );
  item.failures.forEach((failure) => console.log(`       - ${failure}`));
}

if (options.jsonPath) {
  const output = path.resolve(repoRoot, options.jsonPath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), assets: report }, null, 2)}\n`);
  console.log(`JSON report: ${path.relative(repoRoot, output)}`);
}

if (options.enforce && report.some((item) => !item.passes)) process.exitCode = 1;
