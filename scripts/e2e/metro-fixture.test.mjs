import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { getMetroServerRoot } = require('@expo/config/paths');
const root = path.resolve(import.meta.dirname, '../..');
test('fixture assets resolve from the repository workspace, not encoded parent traversals', () => {
  for (const fixture of ['scripts/e2e/native-harness', 'scripts/money/native-harness']) {
    assert.equal(getMetroServerRoot(path.join(root, fixture)), root);
  }
});
