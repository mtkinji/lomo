import {
  PersonalScreenTimeRuleAuthorizationError,
  PersonalScreenTimeRuleStaleError,
  deletePersonalScreenTimeRule,
  getPersonalScreenTimeRule,
  listPersonalScreenTimeRules,
  savePersonalScreenTimeRule,
  updatePersonalScreenTimeRule,
  type PersonalScreenTimeRuleActionBoundary,
} from './personalScreenTimeRuleActions';
import {
  createPersonalScreenTimeRule,
  normalizeScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';

const updatedAt = '2026-08-27T20:00:00.000Z';
const rule = createPersonalScreenTimeRule({
  id: 'opaque-rule-1', selectionId: 'private-selection-1', kind: 'daily_limit',
  selectedApps: [{ token: 'private-app-token', label: 'Instagram' }],
  selectedCategories: [{ token: 'private-category-token', label: 'Social' }],
  enabled: true, setupCompleted: true, limitMinutes: 10, nowIso: updatedAt,
});

function boundary(authorizationStatus: 'approved' | 'denied' = 'approved'):
PersonalScreenTimeRuleActionBoundary & Record<string, jest.Mock> {
  let settings = normalizeScreenTimeProtectionSettings({ authorizationStatus, personalRules: [rule] });
  return {
    readSettings: jest.fn(() => settings),
    persistSettings: jest.fn((next) => { settings = next; }),
    activateRule: jest.fn(async () => true),
    deactivateRule: jest.fn(async () => true),
  } as PersonalScreenTimeRuleActionBoundary & Record<string, jest.Mock>;
}

test('lists and gets label-only personal rule summaries without FamilyControls tokens', () => {
  const store = boundary();
  const listed = listPersonalScreenTimeRules(store);
  const fetched = getPersonalScreenTimeRule({ ruleId: rule.id }, store);
  expect(listed.result).toEqual([expect.objectContaining({
    id: rule.id, kind: 'daily_limit', targetLabels: ['Instagram', 'Social'],
    enabled: true, limitMinutes: 10, updatedAt,
  })]);
  expect(fetched.result).toEqual(listed.result[0]);
  expect(JSON.stringify({ listed, fetched })).not.toContain('private-app-token');
  expect(JSON.stringify({ listed, fetched })).not.toContain('private-selection-1');
});

test('updates an exact current rule and persists only after native enforcement succeeds', async () => {
  const store = boundary();
  const receipt = await updatePersonalScreenTimeRule({
    ruleId: rule.id, expectedUpdatedAt: updatedAt,
    fields: { limitMinutes: 20 }, confirmed: true,
  }, store, () => '2026-08-27T20:01:00.000Z');
  expect(store.deactivateRule).toHaveBeenCalledWith(rule);
  expect(store.activateRule).toHaveBeenCalledWith(expect.objectContaining({ limitMinutes: 20 }));
  expect(store.persistSettings).toHaveBeenCalledTimes(1);
  expect(receipt.result).toMatchObject({ id: rule.id, limitMinutes: 20, updatedAt: '2026-08-27T20:01:00.000Z' });
  expect(receipt.undoOperation).toEqual({
    type: 'screen_time.personal_rule.update', ruleId: rule.id,
    expectedUpdatedAt: '2026-08-27T20:01:00.000Z', fields: { enabled: true, kind: 'daily_limit', limitMinutes: 10 },
  });
  expect(JSON.stringify(receipt)).not.toContain('private-app-token');
});

test('saves native-selected targets through the action boundary but returns labels only', async () => {
  const store = boundary();
  const replacement = createPersonalScreenTimeRule({
    id: rule.id, selectionId: 'new-private-selection', kind: 'focus',
    selectedApps: [{ token: 'new-private-token', label: 'Messages' }], selectedCategories: [],
    enabled: true, setupCompleted: true, nowIso: '2026-08-27T20:02:00.000Z',
  });
  const result = await savePersonalScreenTimeRule({
    rule: replacement, expectedUpdatedAt: updatedAt, confirmed: true,
  }, store);
  expect(result).toMatchObject({ id: rule.id, kind: 'focus', targetLabels: ['Messages'] });
  expect(store.persistSettings).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(result)).not.toMatch(/new-private-token|new-private-selection/);
});

test('rolls enforcement back and does not persist when the replacement cannot activate', async () => {
  const store = boundary();
  (store.activateRule as jest.Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  await expect(updatePersonalScreenTimeRule({
    ruleId: rule.id, expectedUpdatedAt: updatedAt,
    fields: { limitMinutes: 20 }, confirmed: true,
  }, store)).rejects.toThrow('screen_time_rule_activation_failed');
  expect(store.activateRule).toHaveBeenLastCalledWith(rule);
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

test('deletes only after native cleanup and does not advertise token-bearing undo', async () => {
  const store = boundary();
  const receipt = await deletePersonalScreenTimeRule({
    ruleId: rule.id, expectedUpdatedAt: updatedAt, confirmed: true,
  }, store);
  expect(store.deactivateRule).toHaveBeenCalledWith(rule);
  expect(store.persistSettings).toHaveBeenCalledWith(expect.objectContaining({ personalRules: [] }));
  expect(receipt).toMatchObject({ operationId: 'screen_time.personal_rule.delete', reversible: false, undoOperation: null });
  expect(JSON.stringify(receipt)).not.toContain('private-app-token');
});
