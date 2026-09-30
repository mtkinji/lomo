import { navigateWhenReady } from '../../../navigation/rootNavigationRef';
import { getScreenTimeBudgetSetup } from './screenTimeBudgetSetupSession';

export function returnFromScreenTimeBudgetSetup(id: string | undefined, userId: string | null | undefined): boolean {
  const session = getScreenTimeBudgetSetup(id, userId);
  if (!session) return false;
  navigateWhenReady('Settings', { screen: 'SettingsScreenTimeRuleBuilder', params: {
    entry: session.params.entry, budgetSetupResumeId: session.id,
  } });
  return true;
}
