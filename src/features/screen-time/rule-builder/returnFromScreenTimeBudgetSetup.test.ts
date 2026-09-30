import { beginScreenTimeBudgetSetup, clearScreenTimeBudgetSetup } from './screenTimeBudgetSetupSession';
import { returnFromScreenTimeBudgetSetup } from './returnFromScreenTimeBudgetSetup';
const mockNavigate = jest.fn();
jest.mock('../../../navigation/rootNavigationRef', () => ({ navigateWhenReady: (...args: unknown[]) => mockNavigate(...args) }));
describe('Money return to app-limit draft', () => {
  beforeEach(() => { mockNavigate.mockClear(); clearScreenTimeBudgetSetup(); });
  it('returns the owner to the existing draft using only its reference', () => {
    const id = beginScreenTimeBudgetSetup('owner', { entry: 'contextual' }, {
      expectedUpdatedAt: null,
      draftRuleId: 'draft', targets: { selectedApps: [], selectedCategories: [] }, enabled: true,
      connector: 'all', outcome: 'pause', conditions: [], activeConditionId: null,
    });
    expect(returnFromScreenTimeBudgetSetup(id, 'other')).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(returnFromScreenTimeBudgetSetup(id, 'owner')).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('Settings', { screen: 'SettingsScreenTimeRuleBuilder', params: { entry: 'contextual', budgetSetupResumeId: id } });
  });
  it('leaves ordinary Money setup alone', () => {
    expect(returnFromScreenTimeBudgetSetup(undefined, 'owner')).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
