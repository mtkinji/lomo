import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../../services/screenTimeProtection';
import { projectRulesForScreenTimeHandoff, routeForScreenTimeRuleRequirement } from './screenTimeHandoffProjection';

describe('projectRulesForScreenTimeHandoff', () => {
  it('resolves a native restriction to its canonical composite rule', () => {
    const personalRule = {
      id: 'social-rule', selectionId: 'social-rule', selectedApps: [{ token: 'app', label: 'Social' }],
      selectedCategories: [], enabled: true, setupCompleted: true, connector: 'all' as const,
      outcome: 'pause' as const,
      conditions: [{ id: 'focus', type: 'focus_active' as const, operator: 'is' as const, value: true as const }],
      lastUpdated: null,
    };
    const result = projectRulesForScreenTimeHandoff({
      handoff: {
        requestedAtMs: 1,
        reason: 'personal_composite_rule',
        restrictions: [
          { restrictionId: 'p', ruleId: personalRule.id, selectionId: personalRule.selectionId, reason: 'personal_composite_rule', label: null, appliedAtMs: 1 },
        ],
      },
      personalSettings: { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, personalCompositeRules: [personalRule] },
    });
    expect(result.rules.map((rule) => [rule.id, rule.title])).toEqual([
      [personalRule.id, 'Social'],
    ]);
    expect(result.unresolvedRestrictions).toEqual([]);
  });

  it('keeps unknown rules unresolved so the guide cannot offer an unsafe bypass', () => {
    const result = projectRulesForScreenTimeHandoff({
      handoff: {
        requestedAtMs: 1, reason: 'family_prerequisite',
        restrictions: [{ restrictionId: 'x', ruleId: 'family_x', selectionId: 'selection-x', reason: 'family_prerequisite', label: 'Finish homework', appliedAtMs: 1 }],
      },
      personalSettings: DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
    });
    expect(result.rules).toEqual([]);
    expect(result.unresolvedRestrictions).toHaveLength(1);
  });

  it('routes a budget-backed rule to its Money evidence without giving Money rule ownership', () => {
    expect(routeForScreenTimeRuleRequirement({
      ruleId: 'shopping-rule', reason: 'personal_composite_rule',
      personalSettings: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        personalCompositeRules: [{
          id: 'shopping-rule', selectionId: 'shopping-rule', selectedApps: [{ token: 'amazon' }],
          selectedCategories: [], enabled: true, setupCompleted: true, connector: 'all', outcome: 'pause',
          conditions: [{ id: 'budget', type: 'budget', categorySourceId: 'category-shopping', categoryName: 'Shopping', preset: 'when_over' }],
          lastUpdated: null,
        }],
      },
    })).toBe('kwilt://money/category/category-shopping?source=screen-time');
  });
});
