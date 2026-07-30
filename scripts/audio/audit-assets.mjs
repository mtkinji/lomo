#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { parseFile } from 'music-metadata';
import policyData from '../../src/capabilities/games/audio/audioGainPolicy.json' with { type: 'json' };
import {
  evaluateAudioMeasurement,
  inferAudioCategory,
  isAudioCategory,
  parseEbur128Summary,
  parseSilenceSummary,
} from './audio-audit-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const supportedExtensions = new Set(['.aac', '.m4a', '.mp3', '.ogg', '.opus', '.wav']);

function parseArgs(argv) {
  const options = { category: null, enforce: false, jsonPath: null, paths: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--category') options.category = argv[++index];
    else if (arg === '--json') options.jsonPath = argv[++index];
    else if (arg === '--enforce') options.enforce = true;
    else options.paths.push(arg);
  }
  if (options.category && !isAudioCategory(options.category)) {
    throw new Error(`Unknown audio category: ${options.category}`);
  }
  return options;
}

function collectAudioFiles(target) {
  const absolute = path.resolve(repoRoot, target);
  if (!fs.existsSync(absolute)) throw new Error(`Audio path does not exist: ${target}`);
  const stats = fs.statSync(absolute);
  if (stats.isFile()) return supportedExtensions.has(path.extname(absolute).toLowerCase()) ? [absolute] : [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => (
    collectAudioFiles(path.join(absolute, entry.name))
  ));
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw new Error(`${path.basename(binary)} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${path.basename(binary)} failed: ${(result.stderr ?? '').trim() || `exit ${result.status}`}`);
  }
  return result;
}

async function probe(file) {
  const data = await parseFile(file, { duration: true });
  if (!Number.isFinite(data.format.duration) || !Number.isFinite(data.format.sampleRate)) {
    throw new Error(`Incomplete audio metadata for ${file}`);
  }
  return {
    codec: data.format.codec ?? 'unknown',
    sampleRateHz: Number(data.format.sampleRate),
    channels: Number(data.format.numberOfChannels ?? 0),
    durationSeconds: Number(data.format.duration),
    sizeBytes: fs.statSync(file).size,
    container: data.format.container ?? path.extname(file).slice(1),
  };
}

function measure(file, durationSeconds) {
  const loudness = run(ffmpegPath, [
    '-hide_banner', '-nostats', '-i', file,
    '-filter_complex', 'ebur128=peak=true',
    '-f', 'null', '-',
  ]);
  const silence = run(ffmpegPath, [
    '-hide_banner', '-nostats', '-i', file,
    '-af', 'silencedetect=noise=-60dB:d=0.01',
    '-f', 'null', '-',
  ]);
  return {
    ...parseEbur128Summary(loudness.stderr),
    ...parseSilenceSummary(silence.stderr, durationSeconds),
  };
}

function round(value, places = 2) {
  return Number(value.toFixed(places));
}

const options = parseArgs(process.argv.slice(2));
const targets = options.paths.length ? options.paths : ['assets/audio', 'assets/games'];
const files = [...new Set(targets.flatMap(collectAudioFiles))].sort();
const report = await Promise.all(files.map(async (file) => {
  const relativePath = path.relative(repoRoot, file);
  const metadata = await probe(file);
  const measurement = measure(file, metadata.durationSeconds);
  const category = options.category ?? inferAudioCategory(relativePath);
  const evaluation = category
    ? evaluateAudioMeasurement({ category, ...measurement }, policyData.categories[category])
    : { passes: false, failures: ['no audio category could be inferred'] };
  return {
    path: relativePath,
    category,
    ...metadata,
    integratedLufs: round(measurement.integratedLufs, 1),
    truePeakDbtp: round(measurement.truePeakDbtp, 1),
    leadingSilenceMs: Math.round(measurement.leadingSilenceSeconds * 1_000),
    trailingSilenceMs: Math.round(measurement.trailingSilenceSeconds * 1_000),
    ...evaluation,
  };
}));

for (const item of report) {
  const status = item.passes ? 'PASS' : 'REVIEW';
  console.log(`${status.padEnd(6)} ${item.path}`);
  console.log(`       ${item.category ?? 'uncategorized'} | ${item.durationSeconds.toFixed(3)} s | ${item.sampleRateHz} Hz | ${item.channels} ch | ${item.integratedLufs} LUFS | ${item.truePeakDbtp} dBTP | lead ${item.leadingSilenceMs} ms | tail ${item.trailingSilenceMs} ms`);
  item.failures.forEach((failure) => console.log(`       - ${failure}`));
}

const passCount = report.filter((item) => item.passes).length;
console.log(`\nAudio audit: ${passCount}/${report.length} assets meet the proposed category policy.`);

if (options.jsonPath) {
  const outputPath = path.resolve(repoRoot, options.jsonPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), assets: report }, null, 2)}\n`);
  console.log(`JSON report: ${path.relative(repoRoot, outputPath)}`);
}

if (options.enforce && passCount !== report.length) process.exitCode = 1;
