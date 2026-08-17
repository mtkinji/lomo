import { syncMoneyTransactions } from '../data/moneyPlaidApi';
import { reconcileLivingPlan } from './livingPlanReconciliation';
import { reconcileConnectedMoneyActivity } from './reconcileConnectedMoneyActivity';

jest.mock('../data/moneyPlaidApi', () => ({ syncMoneyTransactions: jest.fn() }));
jest.mock('./livingPlanReconciliation', () => ({ reconcileLivingPlan: jest.fn() }));

const receipt = {
  policyVersion: 'money-category-v2',
  consideredCount: 2,
  assignedCount: 1,
  deterministicAssignedCount: 1,
  aiAssignedCount: 0,
  unresolvedCount: 1,
  retryableCount: 0,
};

describe('reconcileConnectedMoneyActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('syncs, reconciles precedence, classifies, rebuilds the living plan, and loads one visible snapshot in order', async () => {
    const order: string[] = [];
    const client = { client: true };
    const snapshot = { generatedAt: 'after' };
    jest.mocked(syncMoneyTransactions).mockImplementation(async () => {
      order.push('sync');
      return { connectionId: 'connection-1', transactionCount: 4, added: 1, modified: 0, removed: 0 };
    });
    jest.mocked(reconcileLivingPlan).mockImplementation(async () => {
      order.push('living-plan');
      return { outcome: 'no_change', reason: 'unchanged' } as never;
    });
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(async () => { order.push('foundation'); }),
      classifyUnresolvedTransactions: jest.fn(async () => { order.push('classify'); return receipt; }),
      loadSnapshot: jest.fn(async () => { order.push('snapshot'); return snapshot; }),
    };

    const result = await reconcileConnectedMoneyActivity({
      client: client as never,
      repository: repository as never,
      trigger: 'manual_sync',
      sync: true,
    });

    expect(order).toEqual(['sync', 'foundation', 'classify', 'living-plan', 'snapshot']);
    expect(result).toMatchObject({ snapshot, classification: { outcome: 'succeeded', receipt } });
  });

  it('keeps rebuilding the authoritative snapshot when optional classification fails', async () => {
    const client = { client: true };
    const snapshot = { generatedAt: 'after-failure' };
    jest.mocked(reconcileLivingPlan).mockResolvedValue({ outcome: 'no_change', reason: 'unchanged' } as never);
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(async () => undefined),
      classifyUnresolvedTransactions: jest.fn(async () => { throw new Error('merchant details must not escape'); }),
      loadSnapshot: jest.fn(async () => snapshot),
    };

    const result = await reconcileConnectedMoneyActivity({
      client: client as never,
      repository: repository as never,
      trigger: 'account_connected',
      sync: false,
    });

    expect(syncMoneyTransactions).not.toHaveBeenCalled();
    expect(reconcileLivingPlan).toHaveBeenCalledWith(client, 'account_scope_changed');
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      snapshot,
      syncResult: null,
      classification: { outcome: 'failed' },
    });
  });
});
