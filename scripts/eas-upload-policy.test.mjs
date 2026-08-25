import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  REQUIRED_EAS_IGNORE_ENTRIES,
  validateEasIgnore,
} from './eas-upload-policy-lib.mjs';

test('reports each required exclusion missing from an EAS ignore file', () => {
  const errors = validateEasIgnore('.git\nnode_modules/\n');

  assert.ok(errors.some((error) => error.includes('/artifacts/')));
  assert.ok(errors.some((error) => error.includes('/prototypes/')));
  assert.ok(errors.some((error) => error.includes('app-store-screenshots/')));
  assert.ok(errors.some((error) => error.includes('*.p12')));
});

test('accepts the complete canonical exclusion set', () => {
  const source = `${REQUIRED_EAS_IGNORE_ENTRIES.join('\n')}\n`;

  assert.deepEqual(validateEasIgnore(source), []);
});

test('rejects the obsolete local-credentials rationale', () => {
  const source = `${REQUIRED_EAS_IGNORE_ENTRIES.join('\n')}\n# production-widgets uses credentialsSource: "local"\n`;

  assert.match(validateEasIgnore(source).join('\n'), /obsolete local-credentials rationale/);
});

test('the repository EAS ignore file satisfies the upload policy', async () => {
  const source = await readFile(new URL('../.easignore', import.meta.url), 'utf8');

  assert.deepEqual(validateEasIgnore(source), []);
});
