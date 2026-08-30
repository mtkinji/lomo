import {
  migrateLegacyPersonalRule,
  normalizePersonalCompositeScreenTimeRule,
  validatePersonalCompositeScreenTimeRule,
} from './personalCompositeScreenTimeRule';
import { createPersonalScreenTimeRule } from '../../../services/screenTimeProtection';

describe('personalCompositeScreenTimeRule', () => {
  const composite = {
    id: 'rule-social-evening',
    selectionId: 'selection-social',
    selectedApps: [],
    selectedCategories: [{ token: 'social', label: 'Social' }],
    enabled: true,
    setupCompleted: true,
    connector: 'all',
    outcome: 'available',
    conditions: [
      { id: 'after-five', type: 'time_of_day', operator: 'after', minuteOfDay: 17 * 60 },
      { id: 'under-limit', type: 'daily_usage', operator: 'below', minutes: 15 },
    ],
    temporaryOpenUntilIso: null,
    lastUpdated: '2026-08-27T23:00:00.000Z',
  };

  it('normalizes a complete two-condition aggregate', () => {
    expect(normalizePersonalCompositeScreenTimeRule(composite)).toEqual(composite);
    expect(validatePersonalCompositeScreenTimeRule(composite)).toEqual({ valid: true, issues: [] });
  });

  it('normalizes a Money-owned budget condition inside the same aggregate', () => {
    const budgetCondition = {
      id: 'shopping-budget', type: 'budget', categorySourceId: 'category-shopping',
      categoryName: 'Shopping', preset: 'at_95_percent',
    };
    const candidate = { ...composite, conditions: [composite.conditions[0], budgetCondition] };
    expect(normalizePersonalCompositeScreenTimeRule(candidate)).toEqual(candidate);
    expect(validatePersonalCompositeScreenTimeRule(candidate)).toEqual({ valid: true, issues: [] });
  });

  it.each([
    [{ ...composite, connector: 'sometimes' }, 'connector'],
    [{ ...composite, outcome: 'notify' }, 'outcome'],
    [{ ...composite, conditions: [] }, 'conditions'],
    [{ ...composite, conditions: [composite.conditions[0], { ...composite.conditions[1], id: 'after-five' }] }, 'condition_ids'],
    [{ ...composite, conditions: [composite.conditions[0], { ...composite.conditions[0], id: 'another-time' }] }, 'condition_type'],
    [{ ...composite, conditions: [{ id: 'late', type: 'time_of_day', operator: 'after', minuteOfDay: 1440 }] }, 'condition_value'],
    [{ ...composite, conditions: [{ id: 'usage', type: 'daily_usage', operator: 'below', minutes: 0 }] }, 'condition_value'],
    [{ ...composite, conditions: [{ id: 'real', type: 'real_step_complete', operator: 'sometimes' }] }, 'condition_operator'],
    [{ ...composite, conditions: [{ id: 'budget', type: 'budget', categorySourceId: '', categoryName: 'Shopping', preset: 'when_over' }] }, 'condition_value'],
    [{ ...composite, conditions: [{ id: 'budget', type: 'budget', categorySourceId: 'shopping', categoryName: 'Shopping', preset: 'sometimes' }] }, 'condition_operator'],
  ])('rejects invalid saved aggregates (%s)', (candidate, issue) => {
    expect(normalizePersonalCompositeScreenTimeRule(candidate)).toBeNull();
    expect(validatePersonalCompositeScreenTimeRule(candidate).issues).toContain(issue);
  });

  it('migrates every legacy rule without changing its behavior', () => {
    const makeLegacy = (id: string, kind: 'real_step' | 'focus' | 'daily_limit') => createPersonalScreenTimeRule({
      id, kind, selectionId: 'selection', selectedApps: [], selectedCategories: [{ token: 'games' }],
      enabled: true, setupCompleted: true, limitMinutes: kind === 'daily_limit' ? 25 : undefined,
      nowIso: '2026-08-27T23:00:00.000Z',
    });

    expect(migrateLegacyPersonalRule(makeLegacy('real', 'real_step'))).toEqual(
      expect.objectContaining({ outcome: 'available', connector: 'all', conditions: [
        { id: 'real:condition', type: 'real_step_complete', operator: 'is' },
      ] }),
    );
    expect(migrateLegacyPersonalRule(makeLegacy('focus', 'focus'))).toEqual(
      expect.objectContaining({ outcome: 'pause', conditions: [
        { id: 'focus:condition', type: 'focus_active', operator: 'is', value: true },
      ] }),
    );
    expect(migrateLegacyPersonalRule(makeLegacy('limit', 'daily_limit'))).toEqual(
      expect.objectContaining({ outcome: 'pause', conditions: [
        { id: 'limit:condition', type: 'daily_usage', operator: 'reaches', minutes: 25 },
      ] }),
    );
  });
});
