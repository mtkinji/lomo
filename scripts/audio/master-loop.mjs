#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { parseFile } from 'music-metadata';
import policyData from '../../src/capabilities/games/audio/audioGainPolicy.json' with { type: 'json' };
import { isAudioCategory, parseLoudnormAnalysis } from './audio-audit-lib.mjs';

const LOSSY_DELIVERY_TRUE_PEAK_HEADROOM_DB = 1;

function run(args) {
  const result = spawnSync(ffmpegPath, args, { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  if (result.error) throw new Error(`ffmpeg could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${(result.stderr ?? '').trim()}`);
  return result;
}

function codecArgs(extension) {
  if (extension === '.wav') return ['-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2'];
  if (extension === '.mp3') return ['-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '48000', '-ac', '2'];
  if (extension === '.m4a' || extension === '.aac') return ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'];
  throw new Error(`Unsupported loop-master output extension: ${extension}`);
}

function loudnormFilter(policy, analysis = null) {
  const fields = [`I=${policy.targetLufs}`, `TP=${policy.truePeakCeilingDbtp}`, 'LRA=11'];
  if (!analysis) return `loudnorm=${[...fields, 'print_format=json'].join(':')}`;
  return `loudnorm=${[
    ...fields,
    `measured_I=${analysis.inputI}`,
    `measured_TP=${analysis.inputTp}`,
    `measured_LRA=${analysis.inputLra}`,
    `measured_thresh=${analysis.inputThresh}`,
    `offset=${analysis.targetOffset}`,
    'linear=true',
    'print_format=summary',
  ].join(':')}`;
}

function masteringPolicy(policy, extension) {
  if (extension === '.wav') return policy;
  return {
    ...policy,
    truePeakCeilingDbtp: policy.truePeakCeilingDbtp - LOSSY_DELIVERY_TRUE_PEAK_HEADROOM_DB,
  };
}

function rotatedCrossfadeGraph(durationSeconds, crossfadeSeconds, loopStartSeconds) {
  const bodyEnd = durationSeconds - crossfadeSeconds;
  const tailStart = bodyEnd;
  const headStart = loopStartSeconds - crossfadeSeconds;
  return [
    '[0:a]asplit=3[bodySource][tailSource][headSource]',
    `[bodySource]atrim=start=${loopStartSeconds}:end=${bodyEnd},asetpts=PTS-STARTPTS[body]`,
    `[tailSource]atrim=start=${tailStart}:end=${durationSeconds},asetpts=PTS-STARTPTS[tail]`,
    `[headSource]atrim=start=${headStart}:end=${loopStartSeconds},asetpts=PTS-STARTPTS[head]`,
    `[tail][head]acrossfade=d=${crossfadeSeconds}:c1=qsin:c2=qsin[seam]`,
    '[body][seam]concat=n=2:v=0:a=1[loop]',
  ].join(';');
}

export async function masterLoop({
  input,
  output,
  audition = null,
  crossfadeSeconds,
  loopStartSeconds = crossfadeSeconds,
  repeatCount = 1,
  category = 'focus.music',
}) {
  if (!isAudioCategory(category)) throw new Error(`Unknown audio category: ${category}`);
  if (!fs.existsSync(input) || !fs.statSync(input).isFile()) throw new Error(`Audio input does not exist: ${input}`);
  if (path.resolve(input) === path.resolve(output)) throw new Error('Loop mastering never overwrites its source');
  if (!Number.isFinite(crossfadeSeconds) || crossfadeSeconds <= 0) {
    throw new Error('crossfadeSeconds must be a positive number');
  }
  if (!Number.isFinite(loopStartSeconds) || loopStartSeconds < crossfadeSeconds) {
    throw new Error('loopStartSeconds must be at least crossfadeSeconds');
  }
  if (!Number.isInteger(repeatCount) || repeatCount < 1) {
    throw new Error('repeatCount must be a positive integer');
  }
  const metadata = await parseFile(input, { duration: true });
  const sourceDurationSeconds = Number(metadata.format.duration);
  if (!Number.isFinite(sourceDurationSeconds)) throw new Error('Audio input has no finite duration');
  if (loopStartSeconds >= sourceDurationSeconds - crossfadeSeconds) {
    throw new Error('Loop start must leave room for the body and tail crossfade');
  }

  const singleLoopDurationSeconds = sourceDurationSeconds - loopStartSeconds;
  const outputDurationSeconds = singleLoopDurationSeconds * repeatCount;
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-loop-master-'));
  const unnormalized = path.join(temporaryDirectory, 'rotated-loop.wav');
  const tiled = path.join(temporaryDirectory, 'tiled-loop.wav');
  const outputExtension = path.extname(output).toLowerCase();
  const policy = masteringPolicy(policyData.categories[category], outputExtension);
  try {
    run([
      '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
      '-filter_complex', rotatedCrossfadeGraph(sourceDurationSeconds, crossfadeSeconds, loopStartSeconds),
      '-map', '[loop]', '-c:a', 'pcm_f32le', '-ar', '48000', '-ac', '2', unnormalized,
    ]);

    const loudnessInput = repeatCount === 1 ? unnormalized : tiled;
    if (repeatCount > 1) {
      run([
        '-hide_banner', '-loglevel', 'error', '-y',
        '-stream_loop', String(repeatCount - 1), '-i', unnormalized,
        '-t', String(outputDurationSeconds),
        '-c:a', 'pcm_f32le', '-ar', '48000', '-ac', '2', tiled,
      ]);
    }

    const firstPass = run([
      '-hide_banner', '-nostats', '-i', loudnessInput,
      '-af', loudnormFilter(policy), '-f', 'null', '-',
    ]);
    const analysis = parseLoudnormAnalysis(firstPass.stderr);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    run([
      '-hide_banner', '-loglevel', 'error', '-y', '-i', loudnessInput,
      '-af', loudnormFilter(policy, analysis),
      ...codecArgs(outputExtension), output,
    ]);

    if (audition) {
      fs.mkdirSync(path.dirname(audition), { recursive: true });
      run([
        '-hide_banner', '-loglevel', 'error', '-y', '-stream_loop', '2', '-i', output,
        '-t', String(outputDurationSeconds * 3),
        ...codecArgs(path.extname(audition).toLowerCase()), audition,
      ]);
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  return {
    sourceDurationSeconds: Number(sourceDurationSeconds.toFixed(3)),
    singleLoopDurationSeconds: Number(singleLoopDurationSeconds.toFixed(3)),
    outputDurationSeconds: Number(outputDurationSeconds.toFixed(3)),
    crossfadeSeconds,
    loopStartSeconds,
    repeatCount,
    category,
    output,
    audition,
  };
}

function parseArgs(argv) {
  const options = {
    input: null,
    output: null,
    audition: null,
    crossfadeSeconds: null,
    loopStartSeconds: null,
    repeatCount: 1,
    category: 'focus.music',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') options.input = argv[++index];
    else if (arg === '--output') options.output = argv[++index];
    else if (arg === '--audition') options.audition = argv[++index];
    else if (arg === '--crossfade-seconds') options.crossfadeSeconds = Number(argv[++index]);
    else if (arg === '--loop-start-seconds') options.loopStartSeconds = Number(argv[++index]);
    else if (arg === '--repeat-count') options.repeatCount = Number(argv[++index]);
    else if (arg === '--category') options.category = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.input || !options.output || !Number.isFinite(options.crossfadeSeconds)) {
    throw new Error('Pass --input, --output, and --crossfade-seconds');
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseArgs(process.argv.slice(2));
  const result = await masterLoop({
    input: path.resolve(options.input),
    output: path.resolve(options.output),
    audition: options.audition ? path.resolve(options.audition) : null,
    crossfadeSeconds: options.crossfadeSeconds,
    loopStartSeconds: options.loopStartSeconds ?? options.crossfadeSeconds,
    repeatCount: options.repeatCount,
    category: options.category,
  });
  console.log(JSON.stringify(result));
}
