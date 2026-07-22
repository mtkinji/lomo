#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';

const argv = process.argv.slice(2);
const shouldRun = argv.includes('--run');
const asJson = argv.includes('--json');
const baseArgIndex = argv.indexOf('--base');
const baseRef = baseArgIndex >= 0 ? argv[baseArgIndex + 1] : undefined;

function git(args, options = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', options.quiet ? 'ignore' : 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function pickBaseRef() {
  if (baseRef) return baseRef;
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { quiet: true });
  if (upstream) return upstream;
  const originMain = git(['rev-parse', '--verify', 'origin/main'], { quiet: true });
  if (originMain) return 'origin/main';
  return 'main';
}

function splitLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

const base = pickBaseRef();
const committed = splitLines(git(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}...HEAD`], { quiet: true }));
const staged = splitLines(git(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB'], { quiet: true }));
const unstaged = splitLines(git(['diff', '--name-only', '--diff-filter=ACMRTUXB'], { quiet: true }));
const untracked = splitLines(git(['ls-files', '--others', '--exclude-standard'], { quiet: true }));
const files = unique([...committed, ...staged, ...unstaged, ...untracked]).sort();

const commands = [];
const manual = [];
const notes = [];

function add(command, reason) {
  if (!commands.some((entry) => entry.command === command)) {
    commands.push({ command, reason });
  }
}

function addManual(command, reason) {
  if (!manual.some((entry) => entry.command === command)) {
    manual.push({ command, reason });
  }
}

function matches(pattern) {
  return files.some((file) => pattern.test(file));
}

if (files.length > 0) {
  add('git diff --check', 'catch whitespace and conflict-marker issues before deeper gates');
}

const appCodeFiles = files.filter((file) =>
  /^(src|packages)\/.*\.(ts|tsx|js|jsx|json)$/.test(file) ||
  /^(app\.config\.ts|babel\.config\.js|metro\.config\.js|jest\.config\.js|package(-lock)?\.json|tsconfig.*\.json)$/.test(file),
);

if (appCodeFiles.length > 0) {
  add('npm run lint', 'typecheck app, workspace packages, and shared TypeScript contracts');
}

if (
  matches(/^(src|packages|supabase\/functions|scripts|plugins)\//) ||
  matches(/^(package(-lock)?\.json|\.github\/workflows\/)/)
) {
  add(
    `npm run code:health -- --fail-on-regression --base ${JSON.stringify(base)}`,
    'enforce code-health ratchets against newly introduced complexity',
  );
}

if (matches(/^scripts\/code-health(-lib)?(\.test)?\.mjs$/)) {
  add('npm run test:code-health', 'unit-test the code-health ratchet rules');
}

if (matches(/(^|\/)([^/]+\.)?(test|spec)\.(ts|tsx)$/) || matches(/^(jest\.setup\.ts|jest\.config\.js|src\/test\/|tsconfig\.test\.json)/)) {
  add('npm run lint:tests', 'typecheck Jest files and shared test harness code that app lint excludes');
}

const relatedTestCandidates = appCodeFiles.filter((file) => /\.(ts|tsx)$/.test(file) && !/\.(test|spec)\.(ts|tsx)$/.test(file));
if (relatedTestCandidates.length > 0 && relatedTestCandidates.length <= 20) {
  add(
    `npm test -- --runInBand --findRelatedTests ${relatedTestCandidates.map((file) => JSON.stringify(file)).join(' ')}`,
    'run the Jest tests most directly related to touched app/package files',
  );
} else if (relatedTestCandidates.length > 20 || matches(/^(jest\.config\.js|jest\.setup\.ts|src\/test\/)/)) {
  add('npm test -- --runInBand', 'run the full Jest suite because shared test/runtime configuration changed');
}

if (matches(/^supabase\/functions\/.*\.ts$/)) {
  add('npm run lint:supabase-functions', 'typecheck Supabase Edge Functions with the Deno gate');
  add('npm run test:supabase-functions', 'run Deno unit tests for extracted Supabase function helpers');
}

if (matches(/^(docs\/jtbd\/|docs\/personas\/|docs\/job-flows\/|docs\/feature-briefs\/|docs\/delivery-evidence\/|src\/features\/[^/]+\/FEATURE\.md)/)) {
  add('npm run product:lint', 'validate JTBD, persona, job-flow, feature, and feature-brief references');
}

if (matches(/^(src\/features\/unifiedChat\/|docs\/delivery-evidence\/unified-chat|docs\/feature-briefs\/unified-chat|scripts\/chat-delivery-lint)/)) {
  add('npm run chat:delivery-lint', 'validate Unified Chat delivery scores against code, tests, and runtime evidence');
}

if (matches(/^(src\/features\/unifiedChat\/|protocol-fixtures\/|supabase\/migrations\/.*unified_chat|scripts\/(chat-delivery-lint|unified-chat-migration-contract|unified-chat-protocol-conformance))/)) {
  add('npm run test:chat-contracts', 'run Unified Chat delivery and durable-schema contract tests');
}

if (matches(/^(docs\/|src\/features\/[^/]+\/FEATURE\.md|scripts\/generate-agent-code-map\.mjs)/)) {
  add('npm run agent:map', 'refresh the agent-facing code map after docs or feature manifest changes');
}

if (matches(/^(src\/features\/|src\/ui\/|docs\/ui-architecture\.md|scripts\/architecture-lint\.mjs|scripts\/generate-agent-code-map\.mjs)/)) {
  add('npm run architecture:lint', 'check enforceable UI/feature architecture conventions');
}

if (matches(/^(supabase\/functions\/mcp\/|scripts\/mcp-|packages\/kwilt-sdk\/)/)) {
  addManual('npm run mcp:smoke', 'requires MCP environment credentials; run when connector behavior changed');
}

if (matches(/^(e2e\/maestro\/|src\/features\/(activities|arcs|goals|onboarding|ai)\/)/)) {
  addManual('maestro test e2e/maestro/<relevant-flow>.yaml', 'native interaction flows need a simulator or device');
}

if (matches(/^(e2e\/visual-|scripts\/visual-regression\/|src\/ui\/|src\/features\/)/)) {
  addManual('npm run visual:compare', 'requires fresh Maestro screenshots; use when visual surfaces changed');
}

if (files.length === 0) {
  notes.push('No changed files detected against the working tree, index, or branch base.');
}

const plan = {
  base,
  changedFiles: files,
  commands,
  manual,
  notes,
};

if (asJson) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log(`Verification plan for ${files.length} changed file${files.length === 1 ? '' : 's'} (base: ${base})`);
  if (files.length > 0) {
    console.log('\nChanged files:');
    for (const file of files) console.log(`- ${file}`);
  }
  if (commands.length > 0) {
    console.log('\nRun:');
    for (const { command, reason } of commands) console.log(`- ${command}\n  ${reason}`);
  }
  if (manual.length > 0) {
    console.log('\nManual or environment-dependent:');
    for (const { command, reason } of manual) console.log(`- ${command}\n  ${reason}`);
  }
  for (const note of notes) console.log(`\n${note}`);
}

if (shouldRun) {
  for (const { command } of commands) {
    console.log(`\n[verify:changed] ${command}`);
    const result = spawnSync(command, {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}
