#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import policyData from '../../src/capabilities/games/audio/audioGainPolicy.json' with { type: 'json' };
import {
  inferAudioCategory,
  isAudioCategory,
  parseEbur128Summary,
  parseLoudnormAnalysis,
  parseVolumeDetectSummary,
  shortCueGainDb,
} from './audio-audit-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function parseArgs(argv) {
  const options = { category: null, outputDir: null, inputs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--category') options.category = argv[++index];
    else if (arg === '--output-dir') options.outputDir = argv[++index];
    else options.inputs.push(arg);
  }
  if (options.category && !isAudioCategory(options.category)) throw new Error(`Unknown audio category: ${options.category}`);
  if (!options.outputDir) throw new Error('Pass --output-dir <directory>; normalization never overwrites source candidates');
  if (!options.inputs.length) throw new Error('Pass at least one audio input file');
  return options;
}

function run(args) {
  const result = spawnSync(ffmpegPath, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw new Error(`ffmpeg could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${(result.stderr ?? '').trim() || `exit ${result.status}`}`);
  return result;
}

function loudnormFilter(policy, analysis = null) {
  const base = [
    `I=${policy.targetLufs}`,
    `TP=${policy.truePeakCeilingDbtp}`,
    'LRA=11',
  ];
  if (!analysis) return `loudnorm=${[...base, 'print_format=json'].join(':')}`;
  return `loudnorm=${[
    ...base,
    `measured_I=${analysis.inputI}`,
    `measured_TP=${analysis.inputTp}`,
    `measured_LRA=${analysis.inputLra}`,
    `measured_thresh=${analysis.inputThresh}`,
    `offset=${analysis.targetOffset}`,
    'linear=true',
    'print_format=summary',
  ].join(':')}`;
}

function outputCodecArgs(extension) {
  if (extension === '.wav') return ['-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2'];
  if (extension === '.mp3') return ['-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '48000', '-ac', '2'];
  if (extension === '.m4a' || extension === '.aac') return ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'];
  throw new Error(`Unsupported normalization output extension: ${extension}`);
}

const options = parseArgs(process.argv.slice(2));
const outputDir = path.resolve(repoRoot, options.outputDir);
fs.mkdirSync(outputDir, { recursive: true });

for (const inputArg of options.inputs) {
  const input = path.resolve(repoRoot, inputArg);
  if (!fs.existsSync(input) || !fs.statSync(input).isFile()) throw new Error(`Audio input does not exist: ${inputArg}`);
  const category = options.category ?? inferAudioCategory(input);
  if (!category) throw new Error(`Cannot infer a category for ${inputArg}; pass --category`);
  const policy = policyData.categories[category];
  const trimFilter = 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-60dB';
  const firstPass = run([
    '-hide_banner', '-nostats', '-i', input,
    '-af', `${trimFilter},${loudnormFilter(policy)}`,
    '-f', 'null', '-',
  ]);
  let analysis = null;
  let shortCueGain = null;
  try {
    analysis = parseLoudnormAnalysis(firstPass.stderr);
  } catch (error) {
    if (!String(error?.message).includes('incomplete loudnorm analysis')) throw error;
    const shortCuePeakPass = run([
      '-hide_banner', '-nostats', '-i', input,
      '-af', `${trimFilter},ebur128=peak=true`,
      '-f', 'null', '-',
    ]);
    const shortCueVolumePass = run([
      '-hide_banner', '-nostats', '-i', input,
      '-af', `${trimFilter},volumedetect`,
      '-f', 'null', '-',
    ]);
    const peakMeasurement = parseEbur128Summary(shortCuePeakPass.stderr);
    const volumeMeasurement = parseVolumeDetectSummary(shortCueVolumePass.stderr);
    shortCueGain = shortCueGainDb({
      integratedLufs: volumeMeasurement.meanVolumeDbfs,
      truePeakDbtp: peakMeasurement.truePeakDbtp,
      targetLufs: policy.targetLufs,
      truePeakCeilingDbtp: policy.truePeakCeilingDbtp,
    });
  }
  const extension = path.extname(input).toLowerCase();
  const output = path.join(outputDir, path.basename(input));
  run([
    '-hide_banner', '-nostats', '-y', '-i', input,
    '-af', shortCueGain === null
      ? `${trimFilter},${loudnormFilter(policy, analysis)}`
      : `${trimFilter},volume=${shortCueGain}dB`,
    ...outputCodecArgs(extension),
    output,
  ]);
  console.log(`${path.relative(repoRoot, input)} -> ${path.relative(repoRoot, output)} (${category}, ${policy.targetLufs} LUFS, ${policy.truePeakCeilingDbtp} dBTP)`);
}
