import type { SupabaseClient } from '@supabase/supabase-js';
import type { MoneyRepository } from '../data/moneyRepository';
import { reconcileLivingPlan, type LivingPlanReconciliationResult } from './livingPlanReconciliation';

type ReconcilePeriodBoundary = (
  client: SupabaseClient,
  trigger: 'period_rollover',
) => Promise<LivingPlanReconciliationResult>;

export async function initializeGovernedMoneyPlan(
  repository: MoneyRepository,
  client: SupabaseClient,
  reconcile: ReconcilePeriodBoundary = reconcileLivingPlan,
): ReturnType<MoneyRepository['loadSnapshot']> {
  await repository.ensureGovernedPlanFoundation();
  const snapshot = await repository.loadSnapshot();
  const result = await reconcile(client, 'period_rollover');
  return result.outcome === 'promoted'
    ? repository.loadSnapshot()
    : snapshot;
}
