import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { projectMoneySnapshot } from '../../src/capabilities/money/data/moneySnapshot';
import { snapshotPerformanceFixture } from './snapshot-performance-fixture';

// Run with: npx tsx scripts/money/benchmark-snapshot.ts [--unique-merchants]
// Desktop JS projection only: no device rendering, backend, network or real household data.
const now = new Date(2026, 10, 15, 12);
const samples = 40;
const uniqueMerchants = process.argv.includes('--unique-merchants');
const results = [];
for (const rules of [0, 40, 113]) {
  for (const count of [0, 1000, 4000, 10000]) {
    const rows = snapshotPerformanceFixture(count, rules, uniqueMerchants);
    for (let warmup = 0; warmup < 5; warmup += 1) projectMoneySnapshot(rows, now);
    const timings = [];
    let snapshot;
    for (let sample = 0; sample < samples; sample += 1) {
      const start = performance.now();
      snapshot = projectMoneySnapshot(rows, now);
      timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    results.push({ transactions: count, rules, samples,
      medianMs: +timings[Math.floor(samples / 2)].toFixed(3),
      p95Ms: +timings[Math.ceil(samples * 0.95) - 1].toFixed(3),
      snapshotSha256: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
    });
  }
}
const sourceHashes = Object.fromEntries([
  '../../src/capabilities/money/data/moneySnapshot.ts',
  '../../src/capabilities/money/data/moneyMerchantRules.ts',
  './snapshot-performance-fixture.ts', './benchmark-snapshot.ts',
].map((path) => [path, createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex')]));
console.log(JSON.stringify({ scope: 'synthetic desktop snapshot projection', node: process.version,
  platform: `${process.platform}/${process.arch}`, cpu: cpus()[0]?.model,
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  merchantNames: uniqueMerchants ? 'all unique' : '80 repeated', sourceHashes, results }, null, 2));
