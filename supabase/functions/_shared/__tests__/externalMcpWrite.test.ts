import { resolveExternalMcpTool } from '../externalMcp';
import {
  executeExternalMcpWrite,
  externalMcpIdempotencyMaterial,
  prepareExternalMcpAction,
  projectExternalMcpWriteResult,
} from '../externalMcpWrite';

const tool = (name: string) => {
  const found = resolveExternalMcpTool(name);
  if (!found) throw new Error(`missing test tool ${name}`);
  return found;
};

describe('externalMcpWrite canonical adapter', () => {
  test('passes canonical Plan and Relationships arguments without a second compatibility mapper', () => {
    expect(prepareExternalMcpAction(tool('kwilt_plan_schedule_activity'), {
      idempotency_key: 'plan-request-1',
      activityId: 'activity-1',
      startDate: '2026-08-28T15:00:00.000Z',
      endDate: '2026-08-28T16:00:00.000Z',
      targetDateKey: '2026-08-28',
    }, 'request-1')).toEqual({
      id: 'request-1', toolId: 'plan.schedule_activity', arguments: {
        activityId: 'activity-1',
        startDate: '2026-08-28T15:00:00.000Z',
        endDate: '2026-08-28T16:00:00.000Z',
        targetDateKey: '2026-08-28',
      },
    });

    expect(prepareExternalMcpAction(tool('kwilt_relationships_forget'), {
      idempotency_key: 'relationship-request-1',
      recordType: 'memory', recordId: 'memory-1', expectedUpdatedAt: '2026-08-27T00:00:00.000Z',
    }, 'request-2')).toEqual({
      id: 'request-2', toolId: 'relationships.forget', arguments: {
        recordType: 'memory', recordId: 'memory-1', expectedUpdatedAt: '2026-08-27T00:00:00.000Z',
      },
    });
  });

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
