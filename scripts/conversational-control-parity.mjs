#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '..');

function countBy(rows, key) {
  return rows.reduce((summary, row) => ({
    ...summary,
    [row[key]]: (summary[row[key]] ?? 0) + 1,
  }), {});
}

export function summarizeConversationalParity(rows) {
  return {
    operations: rows.length,
    completionModes: countBy(rows, 'completionMode'),
    mobile: countBy(rows, 'mobile'),
    phone: countBy(rows, 'phone'),
    external: countBy(rows, 'external'),
    voice: countBy(rows, 'voice'),
  };
}

export function renderConversationalParityJson({ rows, errors, summary }) {
  return `${JSON.stringify({ generatedFrom: 'canonical-runtime-projection', summary, errors, rows }, null, 2)}\n`;
}

function summaryRows(summary, errors) {
  return [
    ['Operations', String(summary.operations)],
    ['Mobile', JSON.stringify(summary.mobile)],
    ['Phone', JSON.stringify(summary.phone)],
    ['External', JSON.stringify(summary.external)],
    ['Voice', JSON.stringify(summary.voice)],
    ['Final parity errors', String(errors.length)],
  ];
}

export function renderConversationalParityMarkdown({ rows, errors, summary }) {
  const lines = [
    '# Conversational Control Parity',
    '',
    '> Generated from the canonical UI inventory, capability manifest, provider registries, and external control ledger. Do not edit counts by hand.',
    '',
    '| Measure | Value |',
    '| --- | --- |',
    ...summaryRows(summary, errors).map(([label, value]) => `| ${label} | ${value} |`),
    '',
    '## Operations',
    '',
    '| Operation | Owner | Mode | Mobile | Phone | External | Voice |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| \`${row.operationId}\` | ${row.owner} | ${row.completionMode} | ${row.mobile} | ${row.phone} | ${row.external} | ${row.voice} |`),
    '',
    '## Final parity errors',
    '',
    ...(errors.length === 0 ? ['None.'] : errors.map((error) => `- ${error}`)),
    '',
  ];
  return lines.join('\n');
}

function loadProjection() {
  const tsxPath = path.join(repoRoot, 'node_modules', '.bin', 'tsx');
  const runnerPath = path.join(scriptDir, 'conversational-control-parity-runner.ts');
  const result = spawnSync(tsxPath, [runnerPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `Parity runner exited ${result.status}`);
  return JSON.parse(result.stdout);
}

function run() {
  const allowIncomplete = process.argv.includes('--allow-incomplete');
  const noWrite = process.argv.includes('--no-write');
  const { rows, errors } = loadProjection();
  const summary = summarizeConversationalParity(rows);
  const payload = { rows, errors, summary };
  const markdown = renderConversationalParityMarkdown(payload);
  const json = renderConversationalParityJson(payload);

  if (!noWrite) {
    const outputDir = path.join(repoRoot, 'docs', 'delivery-evidence', 'unified-chat');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'conversational-control-parity.md'), markdown);
    fs.writeFileSync(path.join(outputDir, 'conversational-control-parity.json'), json);
  }
  process.stdout.write(markdown);
  if (errors.length > 0 && !allowIncomplete) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) run();
