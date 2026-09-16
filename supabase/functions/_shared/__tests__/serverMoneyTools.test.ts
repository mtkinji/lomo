import { executeServerMoneyTool } from '../serverMoneyTools';

const MONEY_TOOLS = [
  'money.budget.update', 'money.transaction.get',
  'money.transaction.meaning.update', 'money.transaction.plan_treatment.update',
  'money.connection.disconnect', 'money.connection.repair.open', 'money.transfer.list',
  'money.transfer.get', 'money.transfer.review',
] as const;

const LEGACY_MONEY_HANDOFFS = [
  ['money.review_transaction', { transactionId: 'transaction-1' }, 'money_transaction'],
  ['money.category.create', { name: 'Gifts', budgetCents: 10000 }, 'money'],
  ['money.category.update', { categoryId: 'category-1', fields: { budgetCents: 20000 } }, 'money_category'],
  ['money.privacy.configure', { enabled: true }, 'money'],
  ['money.connection.connect', {}, 'money'],
  ['money.connection.sync', { connectionId: 'connection-1' }, 'money_connection'],
] as const;

function moneyReadClient(rowsByTable: Record<string, unknown[]>) {
  const calls: Array<[string, string, ...unknown[]]> = [];
  type QueryStub = Record<string, (...args: unknown[]) => unknown>;
  return {
    calls,
    client: {
      from: jest.fn((table: string) => {
        const query: QueryStub = {};
        for (const method of ['select', 'eq', 'gte', 'lt', 'order']) {
          query[method] = (...args: unknown[]) => {
            calls.push([table, method, ...args]);
            return query;
          };
        }
        query.range = async (from: number, to: number) => {
          calls.push([table, 'range', from, to]);
          return { data: rowsByTable[table] ?? [], error: null };
        };
        query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
          data: rowsByTable[table] ?? [], error: null,
        }).then(resolve);
        return query;
      }),
    },
  };
}

function moneyCategoryRenameClient(result: { data: unknown; error: unknown }) {
  const client = {
    marker: 'money-client',
    rpc: jest.fn(async function (this: { marker?: string }) {
      if (this.marker !== 'money-client') throw new Error('Money RPC lost its client binding');
      return result;
    }),
  };
  return {
    rpc: client.rpc,
    client,
  };
}

test('money.budget.read completes with the private monthly plan instead of staging a device handoff', async () => {
  const { client, calls } = moneyReadClient({
    budget_categories: [
      { id: 'category-1', name: 'Shopping', sort_order: 2, updated_at: '2026-09-14T12:00:00.000Z' },
      { id: 'category-2', name: 'Clothing', sort_order: 1, updated_at: '2026-09-13T12:00:00.000Z' },
    ],
    budget_plans: [
      { category_id: 'category-1', base_budget_cents: 30000, updated_at: '2026-09-14T12:00:00.000Z' },
      { category_id: 'category-2', base_budget_cents: 10000, updated_at: '2026-09-13T12:00:00.000Z' },
    ],
  });
  const stageDeviceAction = jest.fn(async () => undefined);

  await expect(executeServerMoneyTool({
    client, userId: 'user-1',
    call: { id: 'budget-read', toolId: 'money.budget.read', arguments: {} },
    stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'completed',
    output: {
      plannedCents: 40000,
      categories: [
        { id: 'category-2', name: 'Clothing', plannedCents: 10000 },
        { id: 'category-1', name: 'Shopping', plannedCents: 30000 },
      ],
    },
  });
  expect(calls).toContainEqual(['budget_categories', 'eq', 'user_id', 'user-1']);
  expect(calls).toContainEqual(['budget_plans', 'eq', 'user_id', 'user-1']);
  expect(stageDeviceAction).not.toHaveBeenCalled();
});

test('money.read returns bounded current-month aggregates without merchant or account details', async () => {
  const { client } = moneyReadClient({
    budget_categories: [{
      id: 'category-1', slug: 'shopping', legacy_budget_id: 'shopping', name: 'Shopping',
      description: null, accent_color: null, sort_order: 1, mapping_tags: [],
      updated_at: '2026-09-14T12:00:00.000Z',
    }],
    budget_plans: [{
      category_id: 'category-1', base_budget_cents: 50000, rollover_enabled: false,
      updated_at: '2026-09-14T12:00:00.000Z',
    }],
    budget_financial_connections: [{
      id: 'connection-1', environment: 'production', institution_name: 'Private Bank',
      status: 'healthy', last_synced_at: '2026-09-15T08:00:00.000Z',
      updated_at: '2026-09-15T08:00:00.000Z',
    }],
    budget_financial_accounts: [{
      id: 'account-1', connection_id: 'connection-1', name: 'Private Checking', official_name: null,
      mask: '1234', type: 'depository', subtype: 'checking',
      budget_financial_connections: {
        environment: 'production', institution_name: 'Private Bank', status: 'healthy',
        last_synced_at: '2026-09-15T08:00:00.000Z',
      },
    }],
    budget_transactions: [{
      id: 'transaction-1', financial_account_id: 'account-1', name: 'Private merchant',
      merchant_name: 'Private merchant', amount_cents: 12000, direction: 'outflow',
      date: '2026-09-12', pending: false, iso_currency_code: 'USD', budget_id: 'shopping',
      money_meaning: 'unknown', updated_at: '2026-09-12T12:00:00.000Z',
    }],
  });

  const result = await executeServerMoneyTool({
    client, userId: 'user-1', call: { id: 'money-read', toolId: 'money.read', arguments: {} },
    stageDeviceAction: jest.fn(), now: new Date('2026-09-15T12:00:00.000Z'),
  });

  expect(result).toMatchObject({
    status: 'completed',
    output: { money: {
      totals: { plannedCents: 50000, spentCents: 12000, remainingCents: 38000 },
      categories: [{ id: 'category-1', name: 'Shopping', plannedCents: 50000, spentCents: 12000 }],
      accountCount: 1,
    } },
  });
  expect(JSON.stringify(result)).not.toContain('Private merchant');
  expect(JSON.stringify(result)).not.toContain('Private Checking');
  expect(JSON.stringify(result)).not.toContain('1234');
});

test('money.category.rename updates only the authenticated user category and completes without a device handoff', async () => {
  const { client, rpc } = moneyCategoryRenameClient({
    data: {
      status: 'applied', categoryId: 'category-1', receiptId: 'receipt-1',
      updatedAt: '2026-09-15T17:30:00.000Z', replayed: false,
    },
    error: null,
  });
  const stageDeviceAction = jest.fn(async () => undefined);

  await expect(executeServerMoneyTool({
    client, userId: 'user-1',
    call: {
      id: 'rename-category', toolId: 'money.category.rename',
      arguments: { categoryId: 'category-1', name: '  Household & General Purchases  ' },
    },
    stageDeviceAction,
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
    actionSource: 'mcp',
  })).resolves.toEqual({
    status: 'completed',
    receipt: expect.objectContaining({
      receiptId: 'receipt-1', operationId: 'money.category.rename', requestId: 'rename-category',
      actorId: 'user-1', source: 'mcp', status: 'completed',
      resultRefs: [{ kind: 'money_category', id: 'category-1' }], reversible: true,
    }),
    output: {
      receiptId: 'receipt-1', replayed: false,
      resultRefs: [{ kind: 'money_category', id: 'category-1' }],
    },
  });
  expect(rpc).toHaveBeenCalledWith('rename_budget_category_from_agent', {
    p_user_id: 'user-1', p_thread_id: 'thread-1', p_run_id: 'run-1', p_message_id: 'message-1',
    p_call_id: 'rename-category', p_category_id: 'category-1', p_name: 'Household & General Purchases',
  });
  expect(stageDeviceAction).not.toHaveBeenCalled();
});

test('money.category.rename does not report completion when the user-owned category is absent', async () => {
  const { client } = moneyCategoryRenameClient({ data: { status: 'not_found' }, error: null });
  const stageDeviceAction = jest.fn(async () => undefined);

  await expect(executeServerMoneyTool({
    client, userId: 'user-1',
    call: {
      id: 'rename-missing-category', toolId: 'money.category.rename',
      arguments: { categoryId: 'category-other-user', name: 'Private category' },
    },
    stageDeviceAction,
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
    actionSource: 'mcp',
  })).resolves.toMatchObject({
    status: 'failed', code: 'money_category_not_found', retryable: false,
  });
  expect(stageDeviceAction).not.toHaveBeenCalled();
});

test('stages Money-linked app control in the canonical Screen Time rule review', async () => {
  const stageDeviceAction = jest.fn(async () => undefined);
  await expect(executeServerMoneyTool({
    client: {}, userId: 'user-1', call: {
      id: 'app-control', toolId: 'money.app_control.review', arguments: {
        subject: { kind: 'self' },
        condition: { owner: 'money', categoryId: 'shopping', preset: 'when_hot' },
        effect: { owner: 'screenTime', kind: 'pause_selected_apps', suggestedAppLabels: ['Amazon'] },
      },
    }, stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', request: {
      actionType: 'review_money_app_control', targetType: 'money_category', targetId: 'shopping',
      payload: { preset: 'when_hot', suggestedAppLabels: ['Amazon'] },
    },
  });
});

test.each(LEGACY_MONEY_HANDOFFS)('%s stages its existing authenticated Money surface', async (
  toolId, args, targetType,
) => {
  const stageDeviceAction = jest.fn(async () => undefined);
  await expect(executeServerMoneyTool({
    client: { from: jest.fn(() => { throw new Error('private Money read'); }) }, userId: 'user-1',
    call: { id: `call-${toolId}`, toolId, arguments: args }, stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: { actionType: 'open_money_control', targetType, payload: { toolId } },
  });
});

test.each(MONEY_TOOLS)('%s stages a private device handoff without reading Money server-side', async (toolId) => {
  const stageDeviceAction = jest.fn(async () => undefined);
  const client = { from: jest.fn(() => { throw new Error('Money must not be read by the connector'); }) };
  const result = await executeServerMoneyTool({
    client, userId: 'user-1',
    call: {
      id: `call-${toolId}`, toolId,
      arguments: toolId.includes('transaction')
        ? { transactionId: 'transaction-1', expectedUpdatedAt: '2026-08-27T12:00:00.000Z', meaning: 'groceries' }
        : toolId.includes('connection')
          ? { connectionId: 'connection-1', expectedUpdatedAt: '2026-08-27T12:00:00.000Z' }
          : toolId.includes('transfer') && toolId !== 'money.transfer.list'
            ? { transferId: 'transfer-1', expectedUpdatedAt: '2026-08-27T12:00:00.000Z', decision: 'confirm_pair' }
            : toolId === 'money.budget.update'
              ? { month: '2026-08', categoryId: 'category-1', plannedCents: 50000, expectedUpdatedAt: '2026-08-27T12:00:00.000Z' }
              : {},
    },
    stageDeviceAction,
  });
  expect(result).toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: {
      capabilityId: 'money',
      actionType: toolId === 'money.connection.repair.open'
        ? 'open_money_connection_repair'
        : 'open_money_control',
      payload: { toolId },
    },
  });
  expect(stageDeviceAction).toHaveBeenCalledTimes(1);
  expect(client.from).not.toHaveBeenCalled();
});

test('rejects malformed Money targets before staging a device action', async () => {
  const stageDeviceAction = jest.fn(async () => undefined);
  await expect(executeServerMoneyTool({
    client: {}, userId: 'user-1',
    call: { id: 'call-invalid', toolId: 'money.transaction.get', arguments: { transactionId: '' } },
    stageDeviceAction,
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_money_target' });
  expect(stageDeviceAction).not.toHaveBeenCalled();
});

test('returns null for tools outside Money', async () => {
  await expect(executeServerMoneyTool({
    client: {}, userId: 'user-1',
    call: { id: 'call-other', toolId: 'activities.read', arguments: {} },
    stageDeviceAction: jest.fn(),
  })).resolves.toBeNull();
});
