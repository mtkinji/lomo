import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { isCodeFile, shouldIgnoreFile, readWorkingFiles, summarizeFiles, compareSummaries, formatReport } from '../code-health-lib.mjs';

export function readGitFilesBatched(root, ref) {
  const run = (args, input) => execFileSync('git', args, { cwd: root, input, maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  const sha = run(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).toString().trim();
  const entries = run(['ls-tree', '-rz', sha]).toString().split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t');
    const [, type, oid] = line.slice(0, tab).split(' ');
    return { file: line.slice(tab + 1), type, oid };
  }).filter(({ file, type }) => type === 'blob' && isCodeFile(file) && !shouldIgnoreFile(file));
  if (!entries.length) return [];
  const blobs = run(['cat-file', '--batch'], `${entries.map(e => e.oid).join('\n')}\n`);
  let offset = 0;
  return entries.map(({ file, oid }) => {
    const end = blobs.indexOf(10, offset);
    const [actual, type, length] = blobs.subarray(offset, end).toString().split(' ');
    const size = Number(length);
    if (end < 0 || actual !== oid || type !== 'blob' || !Number.isSafeInteger(size) || size < 0 || end + size + 1 >= blobs.length) {
      throw new Error(`Invalid Git blob response for ${file}`);
    }
    const text = blobs.subarray(end + 1, end + 1 + size).toString('utf8').trim();
    offset = end + size + 2;
    // Preserve the original reader's trimming and empty-blob semantics.
    return { file, text };
  }).filter(({ text }) => text.length > 0);
}

function main() {
  const root = process.cwd();
  const base = process.argv[2];
  if (!base) throw new Error('A verified Git base is required.');
  const current = summarizeFiles(readWorkingFiles(root));
  const previous = summarizeFiles(readGitFilesBatched(root, base));
  const findings = previous.rows.length ? compareSummaries(current.rows, previous.rows) : [];
  process.stdout.write(formatReport({ current, findings, baseLabel: previous.rows.length ? base : `${base} (empty baseline)`, topCount: 10 }));
  if (findings.some(f => f.severity === 'error')) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
