import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { createMoneyToolProvider } from './moneyToolProvider';

const tool = (id: string) => UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id)!;
const snapshot = {
  generatedAt: '2026-08-27T12:00:00.000Z', periodLabel: 'August 2026', lastSyncedAt: null,
  totals: { plannedCents: 50_000, spentCents: 20_000, remainingCents: 30_000, needsReviewCount: 0 },
  forecast: {}, outsidePlan: { spentCents: 0, transactionCount: 0 },
  categories: [{ id: 'groceries', sourceId: 'category-groceries', name: 'Groceries', plannedCents: 50_000, updatedAt: 'budget-v1' }],
  transactions: [{
    id: 'transaction-1', merchantName: 'Market', amountCents: 2_500, direction: 'outflow',
    date: '2026-08-27', pending: false, currencyCode: 'USD', moneyMeaning: null,
    updatedAt: 'transaction-v1',
  }],
  accounts: [],
  connections: [{
    id: 'connection-1', institutionName: 'Bank', status: 'error', lastSyncedAt: null,
    accountCount: 2, updatedAt: 'connection-v1',
  }],
} as never;

function actions() {
  return {
    readBudget: jest.fn(async () => ({ operationId: 'money.budget.read', status: 'completed', result: { month: '2026-08' } })),
    getTransaction: jest.fn(async () => ({ operationId: 'money.transaction.get', status: 'completed', result: { id: 'transaction-1' } })),
    listTransfers: jest.fn(async () => ({ operationId: 'money.transfer.list', status: 'completed', result: [] })),
    getTransfer: jest.fn(async () => ({ operationId: 'money.transfer.get', status: 'completed', result: { id: 'one:two' } })),
  };
}

describe('moneyToolProvider', () => {
  it('uses the capability action for bounded Money reads', async () => {
    const control = actions();
    const provider = createMoneyToolProvider({ snapshot, actions: control as never });
    await expect(provider.execute({
      id: 'read-1', toolId: 'money.budget.read', arguments: {},
    }, tool('money.budget.read'))).resolves.toMatchObject({
      status: 'completed', output: { month: '2026-08' },
    });
    expect(control.readBudget).toHaveBeenCalledTimes(1);
  });

  it('creates an exact native unlock handoff when Money privacy is locked', async () => {
    const control = actions();
    const provider = createMoneyToolProvider({ snapshot: null, actions: control as never, privacyLocked: true });
    await expect(provider.execute({
      id: 'locked-1', toolId: 'money.transaction.get', arguments: { transactionId: 'transaction-1' },
    }, tool('money.transaction.get'))).resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device', request: {
        actionType: 'open_money_control', payload: { toolId: 'money.transaction.get' },
      },
    });
    expect(control.getTransaction).not.toHaveBeenCalled();
  });

  it('stages a reviewed budget diff only for the exact current category version', async () => {
    const provider = createMoneyToolProvider({ snapshot, actions: actions() as never });
    await expect(provider.execute({
      id: 'budget-1', toolId: 'money.budget.update', arguments: {
        month: '2026-08', expectedUpdatedAt: 'budget-v1',
        categoryId: 'category-groceries', plannedCents: 55_000,
      },
    }, tool('money.budget.update'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()[0]).toMatchObject({
      capabilityId: 'money', operation: {
        type: 'update_money_budget', targetId: 'category-groceries', expectedUpdatedAt: 'budget-v1',
        payload: { month: '2026-08', plannedCents: 55_000 },
      },
    });

    await expect(provider.execute({
      id: 'budget-stale', toolId: 'money.budget.update', arguments: {
        month: '2026-08', expectedUpdatedAt: 'budget-old',
        categoryId: 'category-groceries', plannedCents: 55_000,
      },
    }, tool('money.budget.update'))).resolves.toMatchObject({
      status: 'failed', code: 'money_target_stale', retryable: true,
    });
  });

  it('keeps meaning, plan treatment, transfer review, and disconnect as distinct proposals', async () => {
    const provider = createMoneyToolProvider({ snapshot, actions: actions() as never });
    const calls = [
      ['money.transaction.meaning.update', {
        transactionId: 'transaction-1', expectedUpdatedAt: 'transaction-v1', meaning: 'not_counted',
      }],
      ['money.transaction.plan_treatment.update', {
        transactionId: 'transaction-1', expectedUpdatedAt: 'transaction-v1', treatment: 'protected',
      }],
      ['money.connection.disconnect', {
        connectionId: 'connection-1', expectedUpdatedAt: 'connection-v1',
      }],
    ] as const;
    for (const [toolId, arguments_] of calls) {
      await expect(provider.execute({ id: toolId, toolId, arguments: arguments_ }, tool(toolId)))
        .resolves.toMatchObject({ status: 'proposed' });
    }
    expect(provider.proposals().map((proposal) => proposal.operation.type)).toEqual([
      'update_money_transaction_meaning',
      'update_money_transaction_plan_treatment',
      'disconnect_money_connection',
    ]);
  });

  it('opens provider repair without pretending credentials were handled in Chat', async () => {
    const provider = createMoneyToolProvider({ snapshot, actions: actions() as never });
    await expect(provider.execute({
      id: 'repair-1', toolId: 'money.connection.repair.open', arguments: { connectionId: 'connection-1' },
    }, tool('money.connection.repair.open'))).resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device', request: {
        actionType: 'open_money_connection_repair', targetId: 'connection-1',
      },
    });
  });
});
