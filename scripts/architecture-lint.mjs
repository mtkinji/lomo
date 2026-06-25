#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const errors = [];
const warnings = [];

const baselinePath = path.join(repoRoot, 'scripts', 'architecture-lint-baseline.json');
const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : {};
const legacyRawTextFeatureFiles = new Set(baseline.legacyRawReactNativeTextFeatureFiles ?? []);

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

function featureNameFor(relativeFile) {
  const parts = relativeFile.split('/');
  return parts[0] === 'src' && parts[1] === 'features' && parts[2] ? parts[2] : null;
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
const rawTextWarningsByFeature = new Map();

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const relativeFile = rel(file);
  if (directReusableImport.test(text)) {
    pushImportFinding(errors, file, 'feature/app code must import through src/ui adapters, not components/ui directly');
  }

  if (relativeFile.startsWith('src/features/') && (rawTextImport.test(text) || rawTextAliasImport.test(text))) {
    if (!legacyRawTextFeatureFiles.has(relativeFile)) {
      pushImportFinding(
        errors,
        file,
        'new raw react-native Text import in a feature file; use src/ui Typography for on-canvas copy',
      );
      continue;
    }
    pushImportFinding(
      warnings,
      file,
      'legacy raw react-native Text import in a feature file; prefer src/ui Typography for on-canvas copy when editing this file',
    );
    const featureName = featureNameFor(relativeFile);
    if (featureName) {
      rawTextWarningsByFeature.set(featureName, (rawTextWarningsByFeature.get(featureName) ?? 0) + 1);
    }
  }
}

if (warnings.length > 0) {
  console.log('Architecture warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
  if (rawTextWarningsByFeature.size > 0) {
    console.log('Raw Text warnings by feature:');
    for (const [featureName, count] of [...rawTextWarningsByFeature.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })) {
      console.log(`- ${featureName}: ${count}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Architecture errors:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Architecture lint passed with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`);
