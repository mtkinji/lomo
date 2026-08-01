import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { syncMoneyTransactions } from '../data/moneyPlaidApi';
import { reconcileLivingPlan } from './livingPlanReconciliation';

export async function refreshStaleMoneySummary(input: {
  reconcileGovernedPlanFoundation: () => Promise<void>;
  refreshSnapshot: () => Promise<void>;
}): Promise<void> {
  const client = getSupabaseClient();
  await syncMoneyTransactions(client);
  await input.reconcileGovernedPlanFoundation();
  await reconcileLivingPlan(client, 'sync_evidence_changed');
  await input.refreshSnapshot();
}
