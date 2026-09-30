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
          {
            restrictionId: 'p', ruleId: personalRule.id, selectionId: personalRule.selectionId,
            reason: 'personal_composite_rule', label: null,
            details: ['Focus is active. End Focus to continue.'], appliedAtMs: 1,
          },
        ],
      },
      personalSettings: { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, personalCompositeRules: [personalRule] },
    });
    expect(result.rules.map((rule) => [rule.id, rule.title, rule.blockingDetails])).toEqual([
      [personalRule.id, 'Social', ['Focus is active. End Focus to continue.']],
    ]);
    expect(result.rules[0].requirementAction).toEqual({
      kind: 'focus',
      label: 'Return to Focus',
      destination: 'kwilt://focus?source=screen-time',
    });
    expect(result.rules[0].temporaryOpen.allowed).toBe(false);
    expect(result.unresolvedRestrictions).toEqual([]);
  });

  it('keeps unknown rules unresolved so the guide cannot offer an unsafe bypass', () => {
    const result = projectRulesForScreenTimeHandoff({
      handoff: {
        requestedAtMs: 1, reason: 'family_prerequisite',
        restrictions: [{
          restrictionId: 'x', ruleId: 'family_x', selectionId: 'selection-x',
          reason: 'family_prerequisite', label: 'Finish homework', details: [], appliedAtMs: 1,
        }],
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

  it('projects one exact Money condition as the guide requirement action', () => {
    const rule = {
      id: 'shopping-rule', selectionId: 'shopping-rule', selectedApps: [{ token: 'amazon' }],
      selectedCategories: [], enabled: true, setupCompleted: true, connector: 'all' as const,
      outcome: 'pause' as const,
      conditions: [{
        id: 'budget', type: 'budget' as const, categorySourceId: 'category-shopping',
        categoryName: 'Shopping', preset: 'when_over' as const,
      }],
      lastUpdated: null,
    };
    const result = projectRulesForScreenTimeHandoff({
      handoff: {
        requestedAtMs: 1,
        reason: 'money_review_required',
        restrictions: [{
          restrictionId: 'money', ruleId: rule.id, selectionId: rule.selectionId,
          reason: 'money_review_required', label: null, details: ['Review Shopping.'], appliedAtMs: 1,
        }],
      },
      personalSettings: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        personalCompositeRules: [rule],
      },
    });

    expect(result.rules[0].requirementAction).toEqual({
      kind: 'money',
      label: 'Review Money',
      destination: 'kwilt://money/category/category-shopping?source=screen-time',
    });
  });

  it('does not project a prerequisite for compound conditions', () => {
    const rule = {
      id: 'compound-rule', selectionId: 'compound-rule', selectedApps: [{ token: 'social' }],
      selectedCategories: [], enabled: true, setupCompleted: true, connector: 'all' as const,
      outcome: 'pause' as const,
      conditions: [
        { id: 'focus', type: 'focus_active' as const, operator: 'is' as const, value: true as const },
        { id: 'time', type: 'time_of_day' as const, operator: 'before' as const, minuteOfDay: 1200 },
      ],
      lastUpdated: null,
    };
    const result = projectRulesForScreenTimeHandoff({
      handoff: {
        requestedAtMs: 1,
        reason: 'personal_composite_rule',
        restrictions: [{
          restrictionId: 'compound', ruleId: rule.id, selectionId: rule.selectionId,
          reason: 'personal_composite_rule', label: null, details: ['Two conditions apply.'], appliedAtMs: 1,
        }],
      },
      personalSettings: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        personalCompositeRules: [rule],
      },
    });

    expect(result.rules[0].requirementAction).toBeUndefined();
  });
});
