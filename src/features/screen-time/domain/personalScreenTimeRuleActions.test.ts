import {
  PersonalScreenTimeRuleAuthorizationError,
  PersonalScreenTimeRuleStaleError,
  deletePersonalScreenTimeRule,
  getPersonalScreenTimeRule,
  listPersonalScreenTimeRules,
  updatePersonalScreenTimeRule,
  type PersonalScreenTimeRuleActionBoundary,
} from './personalScreenTimeRuleActions';
import { normalizeScreenTimeProtectionSettings } from '../../../services/screenTimeProtection';
import type { PersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';

const updatedAt = '2026-08-27T20:00:00.000Z';
const rule: PersonalCompositeScreenTimeRule = {
  id: 'opaque-rule-1',
  selectionId: 'private-selection-1',
  selectedApps: [{ token: 'private-app-token', label: 'Instagram' }],
  selectedCategories: [{ token: 'private-category-token', label: 'Social' }],
  enabled: true,
  setupCompleted: true,
  connector: 'all',
  outcome: 'pause',
  conditions: [{ id: 'usage', type: 'daily_usage', operator: 'reaches', minutes: 10 }],
  lastUpdated: updatedAt,
};

function boundary(authorizationStatus: 'approved' | 'denied' = 'approved'):
PersonalScreenTimeRuleActionBoundary & Record<string, jest.Mock> {
  let settings = normalizeScreenTimeProtectionSettings({
    authorizationStatus,
    personalRuleSchemaVersion: 2,
    personalCompositeRules: [rule],
  });
  return {
    readSettings: jest.fn(() => settings),
    persistSettings: jest.fn((next) => { settings = next; }),
    activateRule: jest.fn(async () => true),
    deactivateRule: jest.fn(async () => true),
  } as PersonalScreenTimeRuleActionBoundary & Record<string, jest.Mock>;
}

test('lists and gets redacted canonical rule summaries', () => {
  const store = boundary();
  const listed = listPersonalScreenTimeRules(store);
  const fetched = getPersonalScreenTimeRule({ ruleId: rule.id }, store);
  expect(listed.result).toEqual([{
    id: rule.id,
    kind: 'composite',
    targetLabels: ['Instagram', 'Social'],
    conditionCount: 1,
    connector: 'all',
    outcome: 'pause',
    enabled: true,
    updatedAt,
  }]);
  expect(fetched.result).toEqual(listed.result[0]);
  expect(JSON.stringify({ listed, fetched })).not.toMatch(/private-app-token|private-selection-1/);
});

test('updates lifecycle state and persists only after native enforcement succeeds', async () => {
  const store = boundary();
  const receipt = await updatePersonalScreenTimeRule({
    ruleId: rule.id,
    expectedUpdatedAt: updatedAt,
    fields: { enabled: false },
    confirmed: true,
  }, store, () => '2026-08-27T20:01:00.000Z');
  expect(store.deactivateRule).toHaveBeenCalledWith(expect.objectContaining({ id: rule.id, enabled: true }));
  expect(store.activateRule).not.toHaveBeenCalled();
  expect(store.persistSettings).toHaveBeenCalledTimes(1);
  expect(receipt.result).toMatchObject({ id: rule.id, enabled: false, updatedAt: '2026-08-27T20:01:00.000Z' });
  expect(receipt.undoOperation).toEqual({
    type: 'screen_time.personal_rule.update',
    ruleId: rule.id,
    expectedUpdatedAt: '2026-08-27T20:01:00.000Z',
    fields: { enabled: true },
  });
});

test('rejects structural patches so material edits use the sentence composer', async () => {
  await expect(updatePersonalScreenTimeRule({
    ruleId: rule.id,
    expectedUpdatedAt: updatedAt,
    fields: { enabled: true, limitMinutes: 20 } as { enabled: boolean },
    confirmed: true,
  }, boundary())).rejects.toThrow('screen_time_rule_structural_edit_requires_native_composer');
});

test('rolls enforcement back and does not persist when activation fails', async () => {
  const disabledRule = { ...rule, enabled: false };
  let settings = normalizeScreenTimeProtectionSettings({
    authorizationStatus: 'approved',
    personalRuleSchemaVersion: 2,
    personalCompositeRules: [disabledRule],
  });
  const store = {
    readSettings: jest.fn(() => settings),
    persistSettings: jest.fn((next) => { settings = next; }),
    activateRule: jest.fn(async () => false),
    deactivateRule: jest.fn(async () => true),
  } as PersonalScreenTimeRuleActionBoundary & Record<string, jest.Mock>;
  await expect(updatePersonalScreenTimeRule({
    ruleId: rule.id,
    expectedUpdatedAt: updatedAt,
    fields: { enabled: true },
    confirmed: true,
  }, store)).rejects.toThrow('screen_time_rule_activation_failed');
  expect(store.persistSettings).not.toHaveBeenCalled();
});

test('rejects denied authorization, stale versions, and missing rules before mutation', async () => {
  await expect(updatePersonalScreenTimeRule({
    ruleId: rule.id, expectedUpdatedAt: updatedAt, fields: { enabled: false }, confirmed: true,
  }, boundary('denied'))).rejects.toBeInstanceOf(PersonalScreenTimeRuleAuthorizationError);
  await expect(updatePersonalScreenTimeRule({
    ruleId: rule.id, expectedUpdatedAt: 'stale', fields: { enabled: false }, confirmed: true,
  }, boundary())).rejects.toBeInstanceOf(PersonalScreenTimeRuleStaleError);
  expect(() => getPersonalScreenTimeRule({ ruleId: 'missing' }, boundary())).toThrow('screen_time_rule_not_found');
});

test('deletes only after native cleanup and exposes no private selection data', async () => {
  const store = boundary();
  const receipt = await deletePersonalScreenTimeRule({
    ruleId: rule.id, expectedUpdatedAt: updatedAt, confirmed: true,
  }, store);
  expect(store.deactivateRule).toHaveBeenCalledWith(expect.objectContaining({ id: rule.id, enabled: true }));
  expect(store.persistSettings).toHaveBeenCalledWith(expect.objectContaining({ personalCompositeRules: [] }));
  expect(receipt).toMatchObject({ operationId: 'screen_time.personal_rule.delete', reversible: false, undoOperation: null });
  expect(JSON.stringify(receipt)).not.toMatch(/private-app-token|private-selection-1/);
});

test('deletes an unversioned canonical rule through the reviewed boundary', async () => {
  const unversionedRule = { ...rule, lastUpdated: null };
  let settings = normalizeScreenTimeProtectionSettings({
    authorizationStatus: 'approved', personalRuleSchemaVersion: 2,
    personalCompositeRules: [unversionedRule],
  });
  const store = {
    readSettings: jest.fn(() => settings),
    persistSettings: jest.fn((next) => { settings = next; }),
    activateRule: jest.fn(async () => true),
    deactivateRule: jest.fn(async () => true),
  } as PersonalScreenTimeRuleActionBoundary & Record<string, jest.Mock>;

  await deletePersonalScreenTimeRule({
    ruleId: rule.id, expectedUpdatedAt: 'unversioned', confirmed: true,
  }, store);

  expect(store.deactivateRule).toHaveBeenCalledWith(expect.objectContaining({ id: unversionedRule.id, lastUpdated: null }));
  expect(store.persistSettings).toHaveBeenCalledWith(expect.objectContaining({ personalCompositeRules: [] }));
});
