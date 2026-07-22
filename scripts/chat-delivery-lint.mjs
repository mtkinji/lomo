#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

import { validateChatDeliveryLedger } from './chat-delivery-lint-lib.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const ledgerPath = path.join(repoRoot, 'docs/delivery-evidence/unified-chat.yml');

let ledger;
try {
  ledger = yaml.load(fs.readFileSync(ledgerPath, 'utf8'));
} catch (error) {
  console.error(`Unable to read ${path.relative(repoRoot, ledgerPath)}: ${error.message}`);
  process.exit(1);
}

const errors = validateChatDeliveryLedger(ledger, {
  exists: (candidate) => fs.existsSync(path.resolve(repoRoot, candidate)),
});

console.log('Unified Chat delivery evidence:');
for (const step of ledger.steps ?? []) {
  console.log(`  ${step.id}. ${step.name}: ${step.score}/5`);
}
console.log(`  Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('OK - delivery claims resolve to their required evidence.');
