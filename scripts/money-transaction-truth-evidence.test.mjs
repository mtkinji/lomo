import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessMoneyTransactionTruthEvidence,
  validateMoneyTransactionTruthEvidence,
} from './money-transaction-truth-evidence-lib.mjs';

function completeEvidence(overrides = {}) {
  return {
    id: 'money-transaction-truth',
    current_score: 5,
    build: {
      app_version: '1.0.95',
      app_build: '95',
      testflight_installed: true,
      physical_device_verified: true,
    },
    window: { observation_days: 28 },
    aggregate: {
      genuine_starts: 10,
      saved: 8,
      saved_under_one_minute: 7,
      save_failed: 0,
      abandoned: 2,
      replace_saved: 1,
    },
    installed_build_reconciliation_discrepancies: 0,
    household_assessments: Array.from({ length: 3 }, () => ({
      ease_rating: 4,
      trust_rating: 4,
      explains_change: true,
      routine_bookkeeping: false,
    })),
    ...overrides,
  };
}

test('accepts the exact score-five boundary', () => {
  const assessment = assessMoneyTransactionTruthEvidence(completeEvidence());

  assert.equal(assessment.eligible_for_five, true);
  assert.deepEqual(assessment.gates.filter((gate) => !gate.passed), []);
  assert.equal(assessment.metrics.fast_save_rate, 0.875);
  assert.equal(assessment.metrics.abandonment_rate, 0.2);
  assert.equal(assessment.metrics.save_failure_rate, 0);
});

test('fails each external proof boundary without weakening the score contract', () => {
  const evidence = completeEvidence({
    build: {
      app_version: null,
      app_build: null,
      testflight_installed: false,
      physical_device_verified: false,
    },
    window: { observation_days: 27 },
    aggregate: {
      genuine_starts: 7,
      saved: 5,
      saved_under_one_minute: 3,
      save_failed: 1,
      abandoned: 2,
      replace_saved: 0,
    },
    installed_build_reconciliation_discrepancies: null,
    household_assessments: [],
  });

  const assessment = assessMoneyTransactionTruthEvidence(evidence);
  const failed = assessment.gates.filter((gate) => !gate.passed).map((gate) => gate.id);

  assert.equal(assessment.eligible_for_five, false);
  assert.deepEqual(failed, [
    'installed_build',
    'statement_cycle',
    'representative_households',
    'behavior_thresholds',
    'reconciliation',
    'household_trust',
  ]);
});

test('uses explicit denominators for the three behavioral rates', () => {
  const assessment = assessMoneyTransactionTruthEvidence(completeEvidence({
    aggregate: {
      genuine_starts: 20,
      saved: 16,
      saved_under_one_minute: 12,
      save_failed: 1,
      abandoned: 4,
      replace_saved: 1,
    },
  }));

  assert.equal(assessment.metrics.fast_save_rate, 0.75);
  assert.equal(assessment.metrics.abandonment_rate, 0.2);
  assert.equal(assessment.metrics.save_failure_rate, 1 / 17);
  assert.equal(assessment.eligible_for_five, false);
});

test('rejects impossible counts, ratings, and score-five claims with missing proof', () => {
  const evidence = completeEvidence({
    aggregate: {
      genuine_starts: 2,
      saved: 3,
      saved_under_one_minute: 4,
      save_failed: -1,
      abandoned: 3,
      replace_saved: 4,
    },
    household_assessments: [{
      ease_rating: 6,
      trust_rating: 0,
      explains_change: 'yes',
      routine_bookkeeping: false,
    }],
  });

  const errors = validateMoneyTransactionTruthEvidence(evidence);

  assert.match(errors.join('\n'), /saved cannot exceed genuine_starts/);
  assert.match(errors.join('\n'), /saved_under_one_minute cannot exceed saved/);
  assert.match(errors.join('\n'), /save_failed must be a non-negative integer/);
  assert.match(errors.join('\n'), /abandoned cannot exceed genuine_starts/);
  assert.match(errors.join('\n'), /replace_saved cannot exceed saved/);
  assert.match(errors.join('\n'), /ease_rating must be an integer from 1 to 5/);
  assert.match(errors.join('\n'), /trust_rating must be an integer from 1 to 5/);
  assert.match(errors.join('\n'), /explains_change must be boolean/);
});

test('rejects fields outside the privacy-safe aggregate schema', () => {
  const evidence = completeEvidence();
  evidence.aggregate.merchant_name = 'Private merchant';
  evidence.household_assessments[0].household_id = 'private-household';

  const errors = validateMoneyTransactionTruthEvidence(evidence);

  assert.match(errors.join('\n'), /aggregate contains prohibited field: merchant_name/);
  assert.match(errors.join('\n'), /household assessment 1 contains prohibited field: household_id/);
});
