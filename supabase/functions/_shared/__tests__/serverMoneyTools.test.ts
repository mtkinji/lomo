import { executeServerMoneyTool } from '../serverMoneyTools';

const MONEY_TOOLS = [
  'money.budget.read', 'money.budget.update', 'money.transaction.get',
  'money.transaction.meaning.update', 'money.transaction.plan_treatment.update',
  'money.connection.disconnect', 'money.connection.repair.open', 'money.transfer.list',
  'money.transfer.get', 'money.transfer.review',
] as const;

const LEGACY_MONEY_HANDOFFS = [
  ['money.read', {}, 'money'],
  ['money.review_transaction', { transactionId: 'transaction-1' }, 'money_transaction'],
  ['money.category.create', { name: 'Gifts', budgetCents: 10000 }, 'money'],
  ['money.category.rename', { categoryId: 'category-1', name: '🎁 Gifts' }, 'money_category'],
  ['money.category.update', { categoryId: 'category-1', fields: { budgetCents: 20000 } }, 'money_category'],
  ['money.privacy.configure', { enabled: true }, 'money'],
  ['money.connection.connect', {}, 'money'],
  ['money.connection.sync', { connectionId: 'connection-1' }, 'money_connection'],
] as const;

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
