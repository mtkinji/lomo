#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function validateRenderedLoopProbe(result, options = {}) {
  const minimumBoundaries = options.minimumBoundaries ?? 3;
  const maximumBoundaryJumpDbfs = options.maximumBoundaryJumpDbfs ?? -36;
  const failures = [];
  if (!result || typeof result !== 'object') return ['probe result must be an object'];
  if (!Number.isInteger(result.completedBoundaries) || result.completedBoundaries < minimumBoundaries) {
    failures.push(`rendered ${result.completedBoundaries ?? 0} boundaries; expected at least ${minimumBoundaries}`);
  }
  if (result.underrunCount !== 0) failures.push(`reported ${result.underrunCount ?? 'unknown'} underruns`);
  if (!Number.isFinite(result.worstBoundaryJumpDbfs)) {
    failures.push('worstBoundaryJumpDbfs must be finite');
  } else if (result.worstBoundaryJumpDbfs > maximumBoundaryJumpDbfs) {
    failures.push(
      `boundary jump ${result.worstBoundaryJumpDbfs.toFixed(2)} dBFS exceeds ${maximumBoundaryJumpDbfs} dBFS`,
    );
  }
  if (result.lastErrorCode) failures.push(`native error: ${result.lastErrorCode}`);
  return failures;
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: rendered-loop-probe.mjs <native-probe.json>');
  const result = JSON.parse(await readFile(path, 'utf8'));
  const failures = validateRenderedLoopProbe(result);
  if (failures.length) {
    failures.forEach((failure) => console.error(`FAIL ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(
    `PASS ${result.completedBoundaries} rendered boundaries, ${result.worstBoundaryJumpDbfs.toFixed(2)} dBFS worst jump, 0 underruns`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
