import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRenderedLoopProbe } from './rendered-loop-probe.mjs';

test('accepts a quiet multi-boundary render with no underruns', () => {
  assert.deepEqual(validateRenderedLoopProbe({
    completedBoundaries: 3,
    underrunCount: 0,
    worstBoundaryJumpDbfs: -62.4,
    lastErrorCode: null,
  }), []);
});

test('rejects incomplete, discontinuous, or underrunning probes', () => {
  assert.deepEqual(validateRenderedLoopProbe({
    completedBoundaries: 1,
    underrunCount: 2,
    worstBoundaryJumpDbfs: -20,
    lastErrorCode: 'native_failure',
  }), [
    'rendered 1 boundaries; expected at least 3',
    'reported 2 underruns',
    'boundary jump -20.00 dBFS exceeds -36 dBFS',
    'native error: native_failure',
  ]);
});
