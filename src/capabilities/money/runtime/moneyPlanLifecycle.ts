import type { SupabaseClient } from '@supabase/supabase-js';
import type { MoneyRepository } from '../data/moneyRepository';
import { reconcileLivingPlan, type LivingPlanReconciliationResult } from './livingPlanReconciliation';

type ReconcilePeriodBoundary = (
  client: SupabaseClient,
  trigger: 'period_rollover',
) => Promise<LivingPlanReconciliationResult>;

type MoneySnapshot = Awaited<ReturnType<MoneyRepository['loadSnapshot']>>;

export async function initializeGovernedMoneyPlan(
  repository: MoneyRepository,
  client: SupabaseClient,
  reconcile: ReconcilePeriodBoundary = reconcileLivingPlan,
  onSnapshotReady?: (snapshot: MoneySnapshot) => void,
): ReturnType<MoneyRepository['loadSnapshot']> {
  const snapshot = await repository.loadSnapshot();
  onSnapshotReady?.(snapshot);

  let foundationReady = true;
  try {
    await repository.ensureGovernedPlanFoundation();
  } catch {
    foundationReady = false;
  }
  if (!foundationReady) return snapshot;

  try {
    const result = await reconcile(client, 'period_rollover');
    if (result.outcome !== 'promoted') return snapshot;
    const promotedSnapshot = await repository.loadSnapshot().catch(() => snapshot);
    if (promotedSnapshot !== snapshot) onSnapshotReady?.(promotedSnapshot);
    return promotedSnapshot;
  } catch {
    return snapshot;
  }
}
