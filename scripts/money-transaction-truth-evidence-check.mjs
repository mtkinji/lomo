import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  assessMoneyTransactionTruthEvidence,
  validateMoneyTransactionTruthEvidence,
} from './money-transaction-truth-evidence-lib.mjs';

const evidencePath = path.resolve(
  process.cwd(),
  process.argv[2] ?? 'docs/delivery-evidence/money-transaction-truth.json',
);

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  console.error(`Money transaction-truth evidence could not be read: ${error.message}`);
  process.exit(1);
}

const errors = validateMoneyTransactionTruthEvidence(evidence);
if (errors.length > 0) {
  console.error('Money transaction-truth evidence is invalid:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const assessment = assessMoneyTransactionTruthEvidence(evidence);
console.log(`Money transaction-truth score: ${evidence.current_score}`);
for (const gate of assessment.gates) {
  console.log(`${gate.passed ? 'PASS' : 'PENDING'} ${gate.id}`);
}
console.log(`Eligible for 5: ${assessment.eligible_for_five ? 'yes' : 'no'}`);

