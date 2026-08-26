import { EXTERNAL_MCP_WRITE_TOOLS } from '../externalMcp';
import {
  executeExternalMcpWrite,
  externalMcpIdempotencyMaterial,
  prepareExternalMcpAction,
  projectExternalMcpWriteResult,
} from '../externalMcpWrite';

const tool = (name: string) => {
  const found = EXTERNAL_MCP_WRITE_TOOLS.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`missing test tool ${name}`);
  return found;
};

describe('externalMcpWrite canonical adapter', () => {
  test('rejects undeclared arguments, including legacy compound fields that canonical actions cannot preserve', () => {
    expect(() => prepareExternalMcpAction(tool('create_goal'), { title: 'Goal', surprise: true }, 'request-1'))
      .toThrow('unsupported_external_argument:surprise');
    expect(() => prepareExternalMcpAction(tool('capture_activity'), { title: 'Todo', steps: [] }, 'request-1'))
      .toThrow('unsupported_external_argument:steps');
  });

  test('binds idempotency to the operation rather than a compatibility alias', () => {
    const compatibilityTool = tool('capture_activity');
    const canonicalAlias = { ...compatibilityTool, name: compatibilityTool.canonicalName };
    expect(externalMcpIdempotencyMaterial(compatibilityTool, 'same-key'))
      .toBe(externalMcpIdempotencyMaterial(canonicalAlias, 'same-key'));
  });

  test('returns canonical receipt fields for completed actions', async () => {
    const result = await executeExternalMcpWrite({
      tool: tool('capture_activity'), args: { title: 'Pack lunch', idempotency_key: 'same-request' }, requestId: 'request-1',
      execute: async (call) => ({
        status: 'completed', output: {},
        receipt: { receiptId: 'receipt-1', operationId: call.toolId, resultRefs: [{ kind: 'activity', id: 'activity-1' }] },
      }),
    });
    expect(result).toEqual({
      object_type: 'activity', object_id: 'activity-1', result_summary: 'Completed Capture To-do.',
      structured: {
        receipt_id: 'receipt-1', operation: 'activities.capture', status: 'completed',
        result_references: [{ kind: 'activity', id: 'activity-1' }], confirmation: null, handoff: null,
        summary: 'Completed Capture To-do.',
      },
    });
  });

  test('keeps proposal and device handoff states explicit without inventing a receipt', () => {
    expect(projectExternalMcpWriteResult({
      tool: tool('update_goal'), requestId: 'request-1',
      result: { status: 'proposed', proposal: { id: 'proposal-1', status: 'pending' } },
    }).structured).toMatchObject({
      receipt_id: null, operation: 'goals.update', status: 'proposed',
      confirmation: { required: true, state: 'pending', proposal_id: 'proposal-1' },
    });
    expect(projectExternalMcpWriteResult({
      tool: tool('add_goal_checkin'), requestId: 'request-2',
      result: { status: 'pending_client_action', provider: 'device', request: { actionType: 'goal_check_in' } },
    }).structured).toMatchObject({
      receipt_id: null, status: 'pending_client_action', handoff: { required: true, provider: 'device' },
    });
  });
});
