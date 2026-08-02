import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRelatedTestCommand } from './verify-changed-lib.mjs';

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
