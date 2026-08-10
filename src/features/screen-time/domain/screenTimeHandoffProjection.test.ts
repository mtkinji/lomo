import { DEFAULT_MONEY_APP_CONTROL_SETTINGS } from '../../../capabilities/money/domain/moneyAppControl';
import {
  createPersonalScreenTimeRule,
  DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
} from '../../../services/screenTimeProtection';
import { projectRulesForScreenTimeHandoff } from './screenTimeHandoffProjection';

describe('projectRulesForScreenTimeHandoff', () => {
  it('resolves each overlapping restriction to its owning rule', () => {
    const personalRule = createPersonalScreenTimeRule({
      kind: 'real_step', selectedApps: [{ token: 'app' }], selectedCategories: [], enabled: true,
    });
    const moneySettings = {
      ...DEFAULT_MONEY_APP_CONTROL_SETTINGS,
      authorizationStatus: 'approved' as const,
      policies: {
        groceries: {
          enabled: true, preset: 'always_review' as const, unlockWindowMinutes: 20,
          selectedApps: [{ token: 'app' }], selectedCategories: [], lastReview: null,
        },
      },
    };
    const result = projectRulesForScreenTimeHandoff({
      handoff: {
        requestedAtMs: 1,
        reason: 'meaningful_first_locked',
        restrictions: [
          { restrictionId: 'p', ruleId: personalRule.id, selectionId: personalRule.selectionId, reason: 'meaningful_first_locked', label: null, appliedAtMs: 1 },
          { restrictionId: 'm', ruleId: 'money_groceries', selectionId: 'money_groceries', reason: 'money_review_required', label: 'Groceries', appliedAtMs: 1 },
        ],
      },
      personalSettings: { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, personalRules: [personalRule] },
      moneySettings,
    });
    expect(result.rules.map((rule) => [rule.id, rule.title])).toEqual([
      [personalRule.id, 'Do a real step'],
      ['money_groceries', 'Review Groceries'],
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
      moneySettings: DEFAULT_MONEY_APP_CONTROL_SETTINGS,
    });
    expect(result.rules).toEqual([]);
    expect(result.unresolvedRestrictions).toHaveLength(1);
  });
});
