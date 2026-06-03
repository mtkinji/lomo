#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const errors = [];
const warnings = [];

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.worktrees') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(repoRoot, file);
}

function pushImportFinding(collection, file, message) {
  collection.push(`${rel(file)}: ${message}`);
}

const featureRoot = path.join(repoRoot, 'src', 'features');
const featureDirs = fs.existsSync(featureRoot)
  ? fs.readdirSync(featureRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  : [];
const exemptFeatureManifests = new Set(['dev', 'devtools']);

for (const entry of featureDirs) {
  if (exemptFeatureManifests.has(entry.name)) continue;
  const manifest = path.join(featureRoot, entry.name, 'FEATURE.md');
  if (!fs.existsSync(manifest)) {
    errors.push(`src/features/${entry.name}: missing FEATURE.md manifest`);
    continue;
  }
  const text = fs.readFileSync(manifest, 'utf8');
  for (const required of ['feature:', 'serves:', 'status:', 'last_reviewed:']) {
    if (!text.includes(required)) {
      errors.push(`${rel(manifest)}: missing required manifest field ${required}`);
    }
  }
}

const sourceFiles = walk(path.join(repoRoot, 'src'), (file) => /\.(ts|tsx)$/.test(file));
const directReusableImport = /from\s+['"][^'"]*components\/ui\/[^'"]*['"]/;
const rawTextImport = /import\s+\{[^}]*\bText\b[^}]*\}\s+from\s+['"]react-native['"]/;
const rawTextAliasImport = /import\s+\{[^}]*\bText\s+as\s+\w+[^}]*\}\s+from\s+['"]react-native['"]/;

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (directReusableImport.test(text)) {
    pushImportFinding(errors, file, 'feature/app code must import through src/ui adapters, not components/ui directly');
  }

  if (rel(file).startsWith('src/features/') && (rawTextImport.test(text) || rawTextAliasImport.test(text))) {
    pushImportFinding(
      warnings,
      file,
      'raw react-native Text import in a feature file; prefer src/ui Typography for on-canvas copy when editing this file',
    );
  }
}

if (warnings.length > 0) {
  console.log('Architecture warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length > 0) {
  console.error('Architecture errors:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Architecture lint passed with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`);

