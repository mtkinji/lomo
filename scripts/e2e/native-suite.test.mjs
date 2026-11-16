import test from 'node:test';
import assert from 'node:assert/strict';
import { selectGroup, acceptanceResult } from './native-suite.mjs';
test('Budget smoke is quick but release defaults to complete inventory acceptance', () => {
  assert.match(selectGroup({ group: 'budget', suite: 'smoke' }).flows[0], /navigation-refresh/);
  assert.match(selectGroup({ group: 'budget' }).flows[0], /navigation-inventory/);
});
test('targeted workspace retry keeps the named flow and rejects arbitrary paths', () => {
  assert.deepEqual(selectGroup({ group: 'workspace', workspaceFlow: 'smoke-devtools' }).flows, ['e2e/workspace-fixture/smoke-devtools.yaml']);
  assert.equal(selectGroup({ group: 'workspace' }).flows.length, 4);
  assert.throws(() => selectGroup({ group: 'workspace', workspaceFlow: '../../other' }));
  assert.throws(() => selectGroup({ group: 'budget', suite: 'typo' }));
});
test('focused or smoke results cannot claim full release acceptance', () => {
  const complete = { suite: 'acceptance', group: 'all', workspaceFlow: 'all', outcomes: { auth: 'success', workspace: 'success', budget: 'success' } };
  assert.equal(acceptanceResult(complete).fullAcceptance, true);
  for (const patch of [{ suite: 'smoke' }, { group: 'workspace' }, { workspaceFlow: 'smoke-devtools' }, { outcomes: { ...complete.outcomes, budget: 'skipped' } }]) {
    assert.equal(acceptanceResult({ ...complete, ...patch }).fullAcceptance, false);
  }
  assert.equal(acceptanceResult({ ...complete, outcomes: { ...complete.outcomes, auth: 'failure' } }).passed, false);
});
