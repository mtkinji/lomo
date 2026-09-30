import type { ScreenTimeToken } from '../../../services/screenTimeProtection';
import type { PersonalRuleCondition, PersonalRuleConnector, PersonalRuleOutcome } from '../domain/personalCompositeScreenTimeRule';
import type { PersonalScreenTimeRuleBuilderParams } from './personalRuleBuilderLaunch';

export type ScreenTimeBudgetDraft = {
  draftRuleId: string;
  expectedUpdatedAt: string | null;
  targets: { selectedApps: ScreenTimeToken[]; selectedCategories: ScreenTimeToken[] };
  enabled: boolean;
  connector: PersonalRuleConnector;
  outcome: PersonalRuleOutcome;
  conditions: PersonalRuleCondition[];
  activeConditionId: string | null;
};
type Session = { id: string; userId: string; params: PersonalScreenTimeRuleBuilderParams; draft: ScreenTimeBudgetDraft };
// Deliberately memory-only: native app tokens and unfinished rules never enter
// Money route params, analytics, backend storage, or a persisted navigation state.
let pending: Session | null = null;
let sequence = 0;
export function beginScreenTimeBudgetSetup(userId: string, params: PersonalScreenTimeRuleBuilderParams, draft: ScreenTimeBudgetDraft): string {
  const id = `screen-time-budget-${++sequence}`;
  pending = { id, userId, params: JSON.parse(JSON.stringify(params)), draft: JSON.parse(JSON.stringify(draft)) };
  return id;
}
export function getScreenTimeBudgetSetup(id: string | undefined, userId: string | null | undefined): Session | null {
  return pending && id === pending.id && userId === pending.userId ? pending : null;
}
export function clearScreenTimeBudgetSetup(id?: string): void {
  if (!id || pending?.id === id) pending = null;
}
