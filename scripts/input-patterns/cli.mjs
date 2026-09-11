#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanInputProject} from './scan.mjs';
import {assessInputPolicy} from './policy.mjs';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function collectInputSites(root = repoRoot) {
  const sources = {};
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (['node_modules', 'dist', 'generated', '__tests__', '__mocks__'].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.[jt]sx?$/.test(entry.name) && !/\.(test|spec|stories)\./.test(entry.name)) sources[path.relative(root, absolute)] = fs.readFileSync(absolute, 'utf8');
    }
  }
  for (const sourceRoot of ['src', 'packages']) walk(path.join(root, sourceRoot));
  return scanInputProject({sources});
}
export function checkInputPatterns(root = repoRoot) {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'scripts/input-patterns/baseline.json'), 'utf8'));
  if (baseline.version !== 1) throw new Error('Unsupported input baseline version');
  const currentSites = collectInputSites(root);
  return {currentSites, findings: assessInputPolicy({currentSites, baselineSites: baseline.sites, exceptions: baseline.exceptions})};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === '--inventory') console.log(JSON.stringify(collectInputSites(), null, 2));
    else if (process.argv[2] === '--check') {
      const {currentSites, findings} = checkInputPatterns();
      for (const finding of findings) console.error(`${finding.file}:${finding.line} ${finding.owner} <${finding.component}>: ${finding.message} [${finding.fingerprint}]`);
      if (findings.length) process.exitCode = 1;
      else console.log(`Input policy passed: ${currentSites.length} discovered sites match the reviewed input policy.`);
    } else throw new Error('Usage: node scripts/input-patterns/cli.mjs --check | --inventory (read-only)');
  } catch (error) { console.error(`Input policy failed: ${error.message}`); process.exitCode = 1; }
}
