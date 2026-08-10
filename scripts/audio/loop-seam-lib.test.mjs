import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateLoopSeam,
  measureLoopBoundary,
} from './loop-seam-lib.mjs';

test('rejects leading or trailing boundary silence longer than 30 ms', () => {
  const result = evaluateLoopSeam({
    leadingSilenceSeconds: 0.031,
    trailingSilenceSeconds: 0.045,
    startRmsDbfs: -24,
    endRmsDbfs: -24.5,
    derivativeJumpDbfs: -42,
  });

  assert.equal(result.passes, false);
  assert.deepEqual(result.failures, [
    'leading silence 31 ms exceeds the 30 ms loop ceiling',
    'trailing silence 45 ms exceeds the 30 ms loop ceiling',
  ]);
});

test('rejects a material first-to-last window energy mismatch', () => {
  const result = evaluateLoopSeam({
    leadingSilenceSeconds: 0,
    trailingSilenceSeconds: 0,
    startRmsDbfs: -18,
    endRmsDbfs: -24.2,
    derivativeJumpDbfs: -38,
  });

  assert.equal(result.passes, false);
  assert.deepEqual(result.failures, [
    'boundary window energy differs by 6.2 dB (ceiling 3 dB)',
  ]);
});

test('measures boundary RMS, silence, and endpoint derivative discontinuity', () => {
  const startSamples = Float32Array.from([0, 0, 0.25, 0.25, 0.5, 0.5]);
  const endSamples = Float32Array.from([0.5, 0.5, 0.25, 0.25, 0, 0]);
  const result = measureLoopBoundary({
    startSamples,
    endSamples,
    sampleRateHz: 1_000,
    channels: 2,
    silenceThresholdDbfs: -60,
  });

  assert.equal(result.leadingSilenceSeconds, 0.001);
  assert.equal(result.trailingSilenceSeconds, 0.001);
  assert.equal(result.startRmsDbfs, result.endRmsDbfs);
  assert.equal(result.derivativeJumpDbfs, -6.02);
});

test('requires finite measurements', () => {
  assert.throws(() => evaluateLoopSeam({
    leadingSilenceSeconds: 0,
    trailingSilenceSeconds: 0,
    startRmsDbfs: Number.NaN,
    endRmsDbfs: -24,
    derivativeJumpDbfs: -40,
  }), /finite loop seam measurements/);
});
