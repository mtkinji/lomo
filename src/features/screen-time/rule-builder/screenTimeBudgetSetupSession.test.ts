import { beginScreenTimeBudgetSetup, getScreenTimeBudgetSetup, clearScreenTimeBudgetSetup } from './screenTimeBudgetSetupSession';

const draft = {
  expectedUpdatedAt: null,
  draftRuleId: 'draft-1', targets: { selectedApps: [], selectedCategories: [{ token: 'social', label: 'Social' }] },
  enabled: true, connector: 'all' as const, outcome: 'pause' as const,
  conditions: [{ id: 'daily', type: 'daily_usage' as const, operator: 'reaches' as const, minutes: 20 }],
  activeConditionId: null,
};
describe('optional Money setup draft', () => {
  it('preserves the complete unsaved rule without writing or activating it', () => {
    const id = beginScreenTimeBudgetSetup('user-a', { entry: 'contextual' }, draft);
    expect(getScreenTimeBudgetSetup(id, 'user-a')?.draft).toEqual(draft);
    expect(getScreenTimeBudgetSetup(id, 'user-b')).toBeNull();
    expect(getScreenTimeBudgetSetup(id, null)).toBeNull();
  });
  it('does not let an old return replace a newer draft', () => {
    const oldId = beginScreenTimeBudgetSetup('user-a', { entry: 'contextual' }, draft);
    const id = beginScreenTimeBudgetSetup('user-a', { entry: 'contextual' }, { ...draft, draftRuleId: 'new' });
    clearScreenTimeBudgetSetup(oldId);
    expect(getScreenTimeBudgetSetup(oldId, 'user-a')).toBeNull();
    expect(getScreenTimeBudgetSetup(id, 'user-a')?.draft.draftRuleId).toBe('new');
    clearScreenTimeBudgetSetup(id);
    expect(getScreenTimeBudgetSetup(id, 'user-a')).toBeNull();
  });
  it('copies nested draft values rather than retaining mutable caller arrays', () => {
    const mutable = { ...draft, conditions: [...draft.conditions] };
    const id = beginScreenTimeBudgetSetup('user-a', { entry: 'contextual' }, mutable);
    mutable.conditions.splice(0);
    expect(getScreenTimeBudgetSetup(id, 'user-a')?.draft.conditions).toHaveLength(1);
  });
});
