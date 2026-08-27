import { executeServerMoneyTool } from '../serverMoneyTools';

const MONEY_TOOLS = [
  'money.budget.read', 'money.budget.update', 'money.transaction.get',
  'money.transaction.meaning.update', 'money.transaction.plan_treatment.update',
  'money.connection.disconnect', 'money.connection.repair.open', 'money.transfer.list',
  'money.transfer.get', 'money.transfer.review',
] as const;

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
