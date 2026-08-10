import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateSteadyRain,
  STEADY_RAIN_DELIVERY_POLICY,
} from './ambient-quality-lib.mjs';

test('rejects wave-like level cycling and an unstable tonal spectrum', () => {
  const result = evaluateSteadyRain({
    rmsP05Dbfs: -58.44,
    rmsP95Dbfs: -49.42,
    rmsStdDevDb: 3.52,
    spectralFlatnessP05: 0.31,
    spectralFlatnessP95: 0.42,
  });

  assert.equal(result.passes, false);
  assert.deepEqual(result.failures, [
    'slow loudness spread is 9.02 dB (ceiling 4 dB)',
    'slow loudness deviation is 3.52 dB (ceiling 1.5 dB)',
    'spectral flatness drops to 0.31 (floor 0.35)',
    'spectral flatness varies by 0.11 (ceiling 0.08)',
  ]);
});

test('accepts steady broadband rain without level cycling or tonal patches', () => {
  const result = evaluateSteadyRain({
    rmsP05Dbfs: -50.19,
    rmsP95Dbfs: -47.53,
    rmsStdDevDb: 0.85,
    spectralFlatnessP05: 0.38,
    spectralFlatnessP95: 0.43,
  });

  assert.deepEqual(result, {
    passes: true,
    failures: [],
    rmsSpreadDb: 2.66,
    spectralFlatnessSpread: 0.05,
  });
});

test('uses a codec-aware flatness floor for a stable MP3 delivery master', () => {
  const result = evaluateSteadyRain({
    rmsP05Dbfs: -25.3,
    rmsP95Dbfs: -22.71,
    rmsStdDevDb: 0.79,
    spectralFlatnessP05: 0.18,
    spectralFlatnessP95: 0.2,
  }, STEADY_RAIN_DELIVERY_POLICY);

  assert.equal(result.passes, true);
});

test('requires finite steady-rain measurements', () => {
  assert.throws(() => evaluateSteadyRain({
    rmsP05Dbfs: Number.NaN,
    rmsP95Dbfs: -47.53,
    rmsStdDevDb: 0.85,
    spectralFlatnessP05: 0.38,
    spectralFlatnessP95: 0.43,
  }), /finite steady-rain measurements/);
});
