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
    worstEndpointJumpDbfs: -60,
    endpointDerivativeReferenceDbfs: -48,
    endpointOutlierDb: -12,
    worstDerivativeJumpDbfs: -42,
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
    worstEndpointJumpDbfs: -60,
    endpointDerivativeReferenceDbfs: -48,
    endpointOutlierDb: -12,
    worstDerivativeJumpDbfs: -38,
  });

  assert.equal(result.passes, false);
  assert.deepEqual(result.failures, [
    'boundary window energy differs by 6.2 dB (ceiling 3 dB)',
  ]);
});

test('measures boundary RMS and the worst channel-specific endpoint discontinuities', () => {
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
  assert.equal(result.worstEndpointJumpDbfs, -240);
  assert.equal(result.endpointDerivativeReferenceDbfs, -12.04);
  assert.equal(result.endpointOutlierDb, -227.96);
  assert.equal(result.worstDerivativeJumpDbfs, -6.02);
});

test('does not let mono downmix hide opposite-polarity endpoint jumps', () => {
  const result = measureLoopBoundary({
    startSamples: Float32Array.from([0.5, -0.5, 0.5, -0.5]),
    endSamples: Float32Array.from([0, 0, -0.5, 0.5]),
    sampleRateHz: 1_000,
    channels: 2,
  });

  assert.equal(result.worstEndpointJumpDbfs, 0);
  assert.equal(result.endpointOutlierDb, 6.02);
});

test('rejects a loud endpoint jump that is an outlier against local waveform motion', () => {
  const result = evaluateLoopSeam({
    leadingSilenceSeconds: 0,
    trailingSilenceSeconds: 0,
    startRmsDbfs: -24,
    endRmsDbfs: -24,
    worstEndpointJumpDbfs: -24,
    endpointDerivativeReferenceDbfs: -48,
    endpointOutlierDb: 24,
    worstDerivativeJumpDbfs: -42,
  });

  assert.deepEqual(result.failures, [
    'endpoint jump -24 dBFS is 24 dB above local waveform motion (ceiling 12 dB)',
  ]);
});

test('accepts a loud endpoint step when it matches normal local waveform motion', () => {
  const result = evaluateLoopSeam({
    leadingSilenceSeconds: 0,
    trailingSilenceSeconds: 0,
    startRmsDbfs: -24,
    endRmsDbfs: -24,
    worstEndpointJumpDbfs: -24,
    endpointDerivativeReferenceDbfs: -25,
    endpointOutlierDb: 1,
    worstDerivativeJumpDbfs: -42,
  });

  assert.deepEqual(result.failures, []);
});

test('requires finite measurements', () => {
  assert.throws(() => evaluateLoopSeam({
    leadingSilenceSeconds: 0,
    trailingSilenceSeconds: 0,
    startRmsDbfs: Number.NaN,
    endRmsDbfs: -24,
    worstEndpointJumpDbfs: -60,
    endpointDerivativeReferenceDbfs: -48,
    endpointOutlierDb: -12,
    worstDerivativeJumpDbfs: -40,
  }), /finite loop seam measurements/);
});
