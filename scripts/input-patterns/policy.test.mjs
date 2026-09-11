import test from 'node:test';
import assert from 'node:assert/strict';
import { assessInputPolicy } from './policy.mjs';

const site = {file: 'src/features/demo/Form.tsx', line: 5, owner: 'Form', component: 'TextInput', kind: 'raw-native-input', fingerprint: 'a', violations: ['raw-native-input']};
const debt = {...site, reason: 'Existing entry awaiting migration', task: '05', siteIds: ['INP-001']};
const assess = (currentSites, baselineSites = [debt], exceptions = []) => assessInputPolicy({currentSites, baselineSites, exceptions});
test('allows observed debt but rejects multiplicity growth and replacement in the same file', () => {
  assert.deepEqual(assess([site]), []);
  assert.equal(assess([site, site]).length, 1);
  assert.equal(assess([{...site, fingerprint: 'b'}]).length, 1);
  assert.deepEqual(assess([]), []);
});
test('exception is exact, reasoned and becomes a finding when stale', () => {
  assert.deepEqual(assess([site], [], [debt]), []);
  assert.equal(assess([], [], [debt])[0].code, 'stale-exception');
  assert.equal(assess([{...site, fingerprint: 'b'}], [], [debt]).length, 2);
});
test('baseline cannot suppress a new violation on the same identity', () => {
  assert.equal(assess([{...site, violations: ['raw-native-input', 'unresolved-style']}]).length, 1);
});
test('rejects missing or malformed debt data rather than silently permitting it', () => {
  assert.throws(() => assessInputPolicy({currentSites: [], baselineSites: null, exceptions: []}));
  assert.throws(() => assess([site], [{...debt, reason: ''}]));
});
