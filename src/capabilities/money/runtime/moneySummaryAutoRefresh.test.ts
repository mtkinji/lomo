import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { syncMoneyTransactions } from '../data/moneyPlaidApi';
import { reconcileLivingPlan } from './livingPlanReconciliation';
import { refreshStaleMoneySummary } from './moneySummaryAutoRefresh';

jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../data/moneyPlaidApi', () => ({ syncMoneyTransactions: jest.fn() }));
jest.mock('./livingPlanReconciliation', () => ({ reconcileLivingPlan: jest.fn() }));

describe('refreshStaleMoneySummary', () => {
  it('checks connected activity and rebuilds the visible projection without user involvement', async () => {
    const client = { client: true };
    const reconcileGovernedPlanFoundation = jest.fn(async () => undefined);
    const refreshSnapshot = jest.fn(async () => undefined);
    jest.mocked(getSupabaseClient).mockReturnValue(client as never);
    jest.mocked(syncMoneyTransactions).mockResolvedValue({ connectionId: 'connection-1', transactionCount: 4, added: 1, modified: 0, removed: 0 });
    jest.mocked(reconcileLivingPlan).mockResolvedValue({ outcome: 'no_change', reason: 'unchanged' } as never);

    await refreshStaleMoneySummary({ reconcileGovernedPlanFoundation, refreshSnapshot });

    expect(syncMoneyTransactions).toHaveBeenCalledWith(client);
    expect(reconcileGovernedPlanFoundation).toHaveBeenCalledTimes(1);
    expect(reconcileLivingPlan).toHaveBeenCalledWith(client, 'sync_evidence_changed');
    expect(refreshSnapshot).toHaveBeenCalledTimes(1);
  });
});
