import { executeExternalAuthorizedTool, applyExternalLifeOperations, readExternalExecutionReceipt } from '../externalMcpExecution';
import { executeServerAgentTool } from '../serverAgentTools';
import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';

test('an explicit MCP goal creation executes and returns a receipt without a mobile proposal', async () => {
  const apply = jest.fn(async () => ({
    status: 'completed' as const, output: {},
    receipt: { receiptId: 'receipt-1', resultRefs: [{ kind: 'goal', id: 'goal-1' }] },
  }));
  const result = await executeExternalAuthorizedTool({
    execute: (planning) => executeServerAgentTool({
      client: { from: jest.fn() }, userId: 'user-1',
      call: { id: 'request-1', toolId: 'goals.create', arguments: {
        title: 'Secure Avetta leadership approval', targetDate: '2027-01-11',
      } },
      tool: SERVER_AGENT_TOOL_CATALOG.find((tool) => tool.id === 'goals.create')!,
      stageDeviceAction: jest.fn(), actionSource: 'mcp', ...planning,
    }),
    apply,
  });
  expect(result).toMatchObject({ status: 'completed', receipt: { receiptId: 'receipt-1' } });
  expect(apply).toHaveBeenCalledWith([expect.objectContaining({
    operation: expect.objectContaining({ type: 'create_goal', payload: expect.objectContaining({
      title: 'Secure Avetta leadership approval', targetDate: '2027-01-11',
    }) }),
  })]);
});

const proposal = { capabilityId: 'goals', title: 'Create goal', body: '', operation: {
  type: 'create_goal', targetType: 'goal', targetId: null, summary: '', payload: { title: 'Avetta' },
} };
const call = { id: 'request-1', toolId: 'goals.create', arguments: { title: 'Avetta', targetDate: '2027-01-11' } };
const receipt = { receiptId: 'receipt-1', requestId: call.id, operationId: call.toolId,
  status: 'completed', resultRefs: [{ kind: 'goal', id: 'goal-1' }] };

test('submits a planned batch once and propagates failure instead of declaring partial success', async () => {
  const apply = jest.fn(async () => ({ status: 'failed' as const, code: 'stale', message: 'Target changed', retryable: true }));
  expect(await executeExternalAuthorizedTool({
    execute: async ({ stageProposals }) => ({ status: 'proposed', proposal: { proposals: await stageProposals([proposal, proposal]) } }),
    apply,
  })).toMatchObject({ status: 'failed' });
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply).toHaveBeenCalledWith([proposal, proposal]);
});

test('does not apply an intermediate plan after validation fails', async () => {
  const apply = jest.fn();
  expect(await executeExternalAuthorizedTool({
    execute: async ({ stageProposal }) => {
      await stageProposal(proposal);
      return { status: 'refused', reason: 'Wrong owner' };
    }, apply,
  })).toMatchObject({ status: 'refused' });
  expect(apply).not.toHaveBeenCalled();
});

test('device-only actions are honest limitations, not mobile review tasks', async () => {
  const apply = jest.fn();
  expect(await executeExternalAuthorizedTool({
    execute: async () => ({ status: 'pending_client_action', provider: 'device', request: { title: 'Choose apps' } }),
    apply,
  })).toMatchObject({ status: 'unavailable' });
  expect(apply).not.toHaveBeenCalled();
});

test('a capability without a server executor does not fall back to a mobile approval', async () => {
  const rpc = jest.fn();
  expect(await applyExternalLifeOperations({ client: { rpc, from: jest.fn() }, userId: 'user-1', clientId: 'client-1',
    call: { ...call, toolId: 'household.member.remove' } }, [proposal])).toMatchObject({ status: 'unavailable' });
  expect(rpc).not.toHaveBeenCalled();
});

test('commits with the authenticated owner, OAuth client, canonical operation and exact arguments', async () => {
  const rpc = jest.fn(async () => ({ data: receipt, error: null }));
  expect(await applyExternalLifeOperations({ client: { rpc, from: jest.fn() }, userId: 'user-1', clientId: 'client-1', call }, [proposal]))
    .toMatchObject({ status: 'completed', receipt });
  expect(rpc).toHaveBeenCalledWith('execute_kwilt_external_life_operations', {
    p_user_id: 'user-1', p_oauth_client_id: 'client-1', p_request_id: 'request-1',
    p_operation_id: 'goals.create', p_arguments: call.arguments, p_operations: [proposal.operation],
  });
});

test.each([
  { data: null, error: { message: 'stale' } },
  { data: {}, error: null },
  { data: { ...receipt, operationId: 'goals.delete' }, error: null },
])('does not report completion without a matching durable receipt: %j', async (result) => {
  expect(await applyExternalLifeOperations({
    client: { rpc: async () => result, from: jest.fn() }, userId: 'user-1', clientId: 'client-1', call,
  }, [proposal])).toMatchObject({ status: 'failed' });
});

test('retries read an owner-and-client-scoped receipt before revalidating a deleted target', async () => {
  const eq = jest.fn(() => query);
  const query = { select: jest.fn(() => query), eq, maybeSingle: async () => ({
    data: { operation_id: call.toolId, arguments: { targetDate: '2027-01-11', title: 'Avetta' }, result: receipt }, error: null,
  }) };
  const context = { client: { from: jest.fn(() => query), rpc: jest.fn() }, userId: 'user-1', clientId: 'client-1', call };
  expect(await readExternalExecutionReceipt(context)).toMatchObject({ status: 'completed', receipt: { replayed: true } });
  expect(eq.mock.calls).toEqual([['user_id','user-1'],['oauth_client_id','client-1'],['request_id','request-1']]);
  expect(await readExternalExecutionReceipt({ ...context, call: { ...call, arguments: { title: 'Changed' } } }))
    .toMatchObject({ status: 'refused' });
});
