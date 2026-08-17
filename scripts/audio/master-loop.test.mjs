import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ffmpegPath from 'ffmpeg-static';
import { parseFile } from 'music-metadata';
import { masterLoop } from './master-loop.mjs';

function runFfmpeg(args) {
  const result = spawnSync(ffmpegPath, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr);
}

function assertDurationNear(actual, expected, toleranceSeconds = 0.1) {
  assert.equal(Number.isFinite(actual), true, `Expected a finite duration, received ${actual}`);
  assert.ok(
    Math.abs(actual - expected) <= toleranceSeconds,
    `Expected ${expected}s ±${toleranceSeconds}s, received ${actual}s`,
  );
}

test('creates a rotated crossfade master and a three-repeat audition', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-loop-master-'));
  const input = path.join(directory, 'source.wav');
  const output = path.join(directory, 'loop.wav');
  const audition = path.join(directory, 'loop-audition.wav');
  runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=8',
    '-ac', '2', '-c:a', 'pcm_s16le', input,
  ]);

  const result = await masterLoop({
    input,
    output,
    audition,
    crossfadeSeconds: 2,
    category: 'focus.music',
  });

  assert.equal(fs.existsSync(output), true);
  assert.equal(fs.existsSync(audition), true);
  assert.equal(result.sourceDurationSeconds, 8);
  assert.equal(result.outputDurationSeconds, 6);
  const outputMetadata = await parseFile(output, { duration: true });
  const auditionMetadata = await parseFile(audition, { duration: true });
  assertDurationNear(outputMetadata.format.duration, 6);
  assertDurationNear(auditionMetadata.format.duration, 18);

  const audit = spawnSync(process.execPath, [
    path.resolve('scripts/audio/audit-loop-seams.mjs'),
    '--enforce', output,
  ], { encoding: 'utf8' });
  assert.equal(audit.status, 0, audit.stdout + audit.stderr);
});

test('chooses the musical loop start independently from crossfade duration', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-loop-start-'));
  const input = path.join(directory, 'source.wav');
  const output = path.join(directory, 'loop.wav');
  runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=8',
    '-ac', '2', '-c:a', 'pcm_s16le', input,
  ]);

  const result = await masterLoop({
    input,
    output,
    crossfadeSeconds: 2,
    loopStartSeconds: 3,
    category: 'focus.music',
  });

  assert.equal(result.loopStartSeconds, 3);
  assert.equal(result.outputDurationSeconds, 5);
  const outputMetadata = await parseFile(output, { duration: true });
  assertDurationNear(outputMetadata.format.duration, 5);
});

test('tiles a seamless master before delivery encoding to reduce transport-boundary frequency', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-loop-repeat-'));
  const input = path.join(directory, 'source.wav');
  const output = path.join(directory, 'loop.mp3');
  runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=8',
    '-ac', '2', '-c:a', 'pcm_s16le', input,
  ]);

  const result = await masterLoop({
    input,
    output,
    crossfadeSeconds: 2,
    repeatCount: 3,
    category: 'focus.music',
  });

  assert.equal(result.singleLoopDurationSeconds, 6);
  assert.equal(result.outputDurationSeconds, 18);
  assert.equal(result.repeatCount, 3);
  const outputMetadata = await parseFile(output, { duration: true });
  assertDurationNear(outputMetadata.format.duration, 18);
});

test('normalizes a 44.1 kHz source before cutting the cyclic seam', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-loop-resample-'));
  const input = path.join(directory, 'source.wav');
  const output = path.join(directory, 'loop.wav');
  runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=437:sample_rate=44100:duration=8',
    '-ac', '2', '-c:a', 'pcm_s16le', input,
  ]);

  const result = await masterLoop({
    input,
    output,
    crossfadeSeconds: 2,
    loopStartSeconds: 3,
    category: 'focus.music',
  });

  assert.equal(result.workingSampleRateHz, 48_000);
  const metadata = await parseFile(output);
  assert.equal(metadata.format.sampleRate, 48_000);
  const audit = spawnSync(process.execPath, [
    path.resolve('scripts/audio/audit-loop-seams.mjs'),
    '--enforce', output,
  ], { encoding: 'utf8' });
  assert.equal(audit.status, 0, audit.stdout + audit.stderr);
});
