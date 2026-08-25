import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRelatedTestCommand,
  needsEasUploadPolicy,
} from './verify-changed-lib.mjs';

test('related test command permits source files with no matching Jest tests', () => {
  assert.equal(
    buildRelatedTestCommand(['app.config.ts']),
    'npm test -- --runInBand --passWithNoTests --findRelatedTests "app.config.ts"',
  );
});

test('related test command safely quotes each changed path', () => {
  assert.equal(
    buildRelatedTestCommand(['src/example.ts', 'packages/example with spaces/source.ts']),
    'npm test -- --runInBand --passWithNoTests --findRelatedTests "src/example.ts" "packages/example with spaces/source.ts"',
  );
});

test('selects the EAS upload policy for upload configuration changes', () => {
  assert.equal(needsEasUploadPolicy(['.easignore']), true);
  assert.equal(needsEasUploadPolicy(['eas.json']), true);
  assert.equal(needsEasUploadPolicy(['scripts/eas-upload-policy-lib.mjs']), true);
  assert.equal(needsEasUploadPolicy(['scripts/eas-upload-policy.test.mjs']), true);
});

test('does not select the EAS upload policy for unrelated app changes', () => {
  assert.equal(needsEasUploadPolicy(['src/App.tsx']), false);
});
