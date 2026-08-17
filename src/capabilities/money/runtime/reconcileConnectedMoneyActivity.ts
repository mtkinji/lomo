import type { SupabaseClient } from '@supabase/supabase-js';
import type { MoneyClassificationReceipt, MoneyRepository } from '../data/moneyRepository';
import { syncMoneyTransactions, type MoneyPlaidSyncResult } from '../data/moneyPlaidApi';
import { reconcileLivingPlan } from './livingPlanReconciliation';

export type ConnectedMoneyActivityTrigger =
  | 'initialization'
  | 'manual_sync'
  | 'account_connected'
  | 'stale_summary';

export type MoneyClassificationRun =
  | { outcome: 'succeeded'; receipt: MoneyClassificationReceipt }
  | { outcome: 'failed' };

export async function reconcileConnectedMoneyActivity(input: {
  client: SupabaseClient;
  repository: Pick<MoneyRepository,
    'ensureGovernedPlanFoundation' | 'classifyUnresolvedTransactions' | 'loadSnapshot'>;
  trigger: ConnectedMoneyActivityTrigger;
  sync: boolean;
}) {
  const syncResult: MoneyPlaidSyncResult | null = input.sync
    ? await syncMoneyTransactions(input.client)
    : null;
  await input.repository.ensureGovernedPlanFoundation();

  let classification: MoneyClassificationRun;
  try {
    classification = {
      outcome: 'succeeded',
      receipt: await input.repository.classifyUnresolvedTransactions(),
    };
  } catch {
    classification = { outcome: 'failed' };
  }

  await reconcileLivingPlan(
    input.client,
    input.trigger === 'account_connected' ? 'account_scope_changed' : 'sync_evidence_changed',
  );
  const snapshot = await input.repository.loadSnapshot();
  return { snapshot, syncResult, classification };
}
