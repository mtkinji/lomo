import assert from 'node:assert/strict';
import test from 'node:test';

import { validateChatDeliveryLedger } from './chat-delivery-lint-lib.mjs';

function completeStep(overrides = {}) {
  return {
    id: 1,
    name: 'Arrive',
    score: 5,
    gap: null,
    code: ['src/features/unifiedChat/UnifiedChatScreen.tsx'],
    tests: ['src/features/unifiedChat/UnifiedChatScreen.test.tsx'],
    runtime_evidence: ['docs/delivery-evidence/unified-chat/step-01.md'],
    proof: {
      simulator: 'docs/delivery-evidence/unified-chat/step-01.md',
      physical_device: 'docs/delivery-evidence/unified-chat/step-01.md',
    },
    ...overrides,
  };
}

function completeLedger(stepOverrides = {}) {
  return {
    id: 'unified-chat',
    brief: 'docs/feature-briefs/unified-chat.md',
    job_flow: 'job-flow-nina-trust-ai-with-my-life-system',
    job_flow_source: 'docs/job-flows/nina-trust-ai-with-my-life-system.md',
    last_reviewed: '2026-07-22',
    steps: Array.from({ length: 10 }, (_, index) =>
      completeStep({
        id: index + 1,
        name: `Step ${index + 1}`,
        ...stepOverrides,
      }),
    ),
  };
}

const allFilesExist = { exists: () => true };

test('accepts ten fully evidenced five-star steps', () => {
  assert.deepEqual(validateChatDeliveryLedger(completeLedger(), allFilesExist), []);
});

test('rejects a five without code, tests, runtime evidence, and both proof classes', () => {
  const ledger = completeLedger();
  ledger.steps[0] = completeStep({
    code: [],
    tests: [],
    runtime_evidence: [],
    proof: {},
  });

  const errors = validateChatDeliveryLedger(ledger, allFilesExist);

  assert.match(errors.join('\n'), /step 1: score 5 requires code evidence/);
  assert.match(errors.join('\n'), /step 1: score 5 requires tests evidence/);
  assert.match(errors.join('\n'), /step 1: score 5 requires runtime evidence/);
  assert.match(errors.join('\n'), /step 1: score 5 requires simulator proof/);
  assert.match(errors.join('\n'), /step 1: score 5 requires physical-device proof/);
});

test('allows an honest non-five only when it names the remaining gap', () => {
  const honest = completeLedger({
    score: 3,
    gap: 'Authoritative mutation receipts are not implemented yet.',
    code: [],
    tests: [],
    runtime_evidence: [],
    proof: {},
  });
  assert.deepEqual(validateChatDeliveryLedger(honest, allFilesExist), []);

  honest.steps[0].gap = '';
  assert.match(
    validateChatDeliveryLedger(honest, allFilesExist).join('\n'),
    /step 1: scores below 5 must name the remaining gap/,
  );
});

test('rejects duplicate, missing, and out-of-range step ids', () => {
  const ledger = completeLedger();
  ledger.steps[1].id = 1;
  ledger.steps[2].id = 11;

  const errors = validateChatDeliveryLedger(ledger, allFilesExist).join('\n');
  assert.match(errors, /step ids must be the unique integers 1 through 10/);
});

test('rejects unresolved evidence paths', () => {
  const errors = validateChatDeliveryLedger(completeLedger(), {
    exists: (path) => !path.includes('step-01.md'),
  });

  assert.match(errors.join('\n'), /runtime_evidence path does not exist/);
  assert.match(errors.join('\n'), /simulator proof path does not exist/);
  assert.match(errors.join('\n'), /physical_device proof path does not exist/);
});

test('rejects an unresolved accepted brief', () => {
  const errors = validateChatDeliveryLedger(completeLedger(), {
    exists: (path) =>
      path !== 'docs/feature-briefs/unified-chat.md' &&
      path !== 'docs/job-flows/nina-trust-ai-with-my-life-system.md',
  });

  assert.match(errors.join('\n'), /accepted brief path does not exist/);
  assert.match(errors.join('\n'), /job flow source path does not exist/);
});
