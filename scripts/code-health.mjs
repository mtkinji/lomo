#!/usr/bin/env node

import path from 'node:path';
import {
  compareSummaries,
  formatReport,
  pickBaseRef,
  readGitFiles,
  readWorkingFiles,
  summarizeFiles,
} from './code-health-lib.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const failOnRegression = args.includes('--fail-on-regression');
const json = args.includes('--json');
const topIndex = args.indexOf('--top');
const baseIndex = args.indexOf('--base');
const topCount = topIndex >= 0 ? Math.max(1, Number(args[topIndex + 1] ?? 10)) : 10;
const baseRef = pickBaseRef(repoRoot, baseIndex >= 0 ? args[baseIndex + 1] : undefined);

const current = summarizeFiles(readWorkingFiles(repoRoot));
let base = null;
let findings = [];
let baseLabel = baseRef;

if (baseRef) {
  base = summarizeFiles(readGitFiles(repoRoot, baseRef));
  if (base.rows.length > 0) {
    findings = compareSummaries(current.rows, base.rows);
  } else {
    baseLabel = `${baseRef} (unavailable; ratchet skipped)`;
  }
}

if (json) {
  console.log(JSON.stringify({ base: baseRef, baseAvailable: Boolean(base?.rows.length), current, findings }, null, 2));
} else {
  process.stdout.write(formatReport({ current, findings, baseLabel, topCount }));
}

if (failOnRegression && findings.some((finding) => finding.severity === 'error')) {
  process.exit(1);
}
