#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { buildLocalPlan } from './verification/local-plan.mjs';
import { git, resolveBase, collectChanges, selectFiles } from './verification/local-state.mjs';
import { assertLocalEnvironment, runLocalPlan } from './verification/local-runner.mjs';

const help = `Usage: npm run verify:local -- [options]
  --run                 Execute the displayed local plan (default: preview)
  --files <paths...>     Verify explicit repo-relative files
  --scope <directory>   Verify changed files under a directory; repeatable
  --base <git-ref>      Compare against this base (default: upstream/main/HEAD)
  --workers <1-8>       Jest workers; 1 uses serial execution (default: 1)
  --force               Run checks even when local success receipts match
  --json                Print the plan or latest report as JSON
  --report              Read the latest local timing/result report
  --help                Show this help

Local results never satisfy merge, integration, or deployment gates.
Those continue to use npm run verify:changed -- --run and existing release checks.`;

function parse(args) {
  const options = { files: [], scopes: [], workers: 1 };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (['--run', '--json', '--force', '--report', '--help'].includes(arg)) options[arg.slice(2)] = true;
    else if (arg === '--files') {
      const start = options.files.length;
      while (args[i + 1] && !args[i + 1].startsWith('--')) options.files.push(args[++i]);
      if (options.files.length === start) throw new Error('--files requires at least one path.');
    } else if (['--scope', '--base', '--workers'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
      if (arg === '--scope') options.scopes.push(value);
      else options[arg.slice(2)] = arg === '--workers' ? Number(value) : value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isInteger(options.workers) || options.workers < 1 || options.workers > 8) throw new Error('--workers must be an integer from 1 to 8.');
  if (options.run && (options.json || options.report)) throw new Error('Use --run for execution, then --report --json for machine-readable results.');
  return options;
}

function showReport(report) {
  console.log(`Local automation ${report.status}: ${(report.durationMs / 1000).toFixed(2)}s`);
  for (const r of report.results) console.log(`- ${r.id}: ${r.status} (${(r.durationMs / 1000).toFixed(2)}s${r.status === 'reused' ? `, originally ${r.completedAt}` : ''})`);
  if (report.error) console.error(report.error);
  console.log('Integration/deployment approval and listed manual checks remain separate.');
}

async function main() {
  const options = parse(process.argv.slice(2));
  if (options.help) { console.log(help); return; }
  assertLocalEnvironment(process.env);
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
  const cacheDir = path.resolve(root, git(root, ['rev-parse', '--git-path', 'kwilt-verification']).trim());
  if (options.report) {
    const report = JSON.parse(fs.readFileSync(path.join(cacheDir, 'latest.json'), 'utf8'));
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else showReport(report);
    return;
  }
  const base = resolveBase(root, options.base);
  const changed = collectChanges(root, base);
  const { files, omitted } = selectFiles(root, changed, options.files, options.scopes);
  const plan = { ...buildLocalPlan(files, { base, cacheDir, workers: options.workers,
    exists: file => fs.existsSync(path.join(root, file)) }), omitted };
  if (options.json) { console.log(JSON.stringify(plan, null, 2)); return; }
  console.log(`Local verification: ${files.length} selected files, ${omitted.length} other changed files outside this scope.`);
  for (const file of files) console.log(`- ${file}`);
  for (const gate of plan.commands) console.log(`Check: ${gate.id} — ${gate.reason}`);
  for (const item of plan.manual) console.log(`Manual: ${item.command} — ${item.reason}`);
  for (const note of plan.notes) console.log(note);
  if (!options.run) return;
  const result = await runLocalPlan(plan, { root, cacheDir, force: options.force });
  showReport(result);
  process.exitCode = result.exitCode;
}

main().catch(error => { console.error(`[verify:local] ${error.message}`); process.exitCode = 1; });
