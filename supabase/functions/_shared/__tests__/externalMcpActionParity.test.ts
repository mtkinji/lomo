import { resolveExternalMcpTool } from '../externalMcp';
import { EXTERNAL_ACTION_REGISTRATIONS } from '../../../../packages/kwilt-agent-runtime/src/externalActionCatalog';
import { executeExternalMcpWrite, prepareExternalMcpAction } from '../externalMcpWrite';

const cases: Array<[string, Record<string, unknown>, string, Record<string, unknown>]> = [
  ['create_arc', { name: 'Parenting', identity_statement: 'Present' }, 'arcs.create', { name: 'Parenting', identityStatement: 'Present' }],
  ['update_arc', { arc_id: 'arc-1', name: 'Family' }, 'arcs.update', { arcId: 'arc-1', fields: { name: 'Family' } }],
  ['delete_arc', { arc_id: 'arc-1' }, 'arcs.delete', { arcId: 'arc-1' }],
  ['create_goal', { title: 'Calm mornings', arc_id: 'arc-1' }, 'goals.create', { title: 'Calm mornings', arcId: 'arc-1' }],
  ['update_goal', { goal_id: 'goal-1', title: 'Calmer mornings' }, 'goals.update', { goalId: 'goal-1', fields: { title: 'Calmer mornings' } }],
  ['delete_goal', { goal_id: 'goal-1' }, 'goals.delete', { goalId: 'goal-1' }],
  ['add_goal_checkin', { goal_id: 'goal-1', preset: 'made_progress' }, 'goals.check_in', { goalId: 'goal-1', text: 'Made progress.' }],
  ['capture_activity', { title: 'Pack lunch', scheduled_date: '2026-08-27' }, 'activities.capture', { title: 'Pack lunch', scheduledDate: '2026-08-27' }],
  ['update_activity', { activity_id: 'activity-1', title: 'Pack lunches' }, 'activities.update', { activityId: 'activity-1', fields: { title: 'Pack lunches' } }],
  ['create_activity_step', { activity_id: 'activity-1', title: 'Find box', is_optional: true }, 'activities.steps.create', { activityId: 'activity-1', title: 'Find box', optional: true }],
  ['update_activity_step', { activity_id: 'activity-1', step_id: 'step-1', title: 'Find boxes' }, 'activities.steps.update', { activityId: 'activity-1', stepId: 'step-1', title: 'Find boxes' }],
  ['mark_activity_step_done', { activity_id: 'activity-1', step_id: 'step-1' }, 'activities.steps.complete', { activityId: 'activity-1', stepId: 'step-1', completed: true }],
  ['delete_activity_step', { activity_id: 'activity-1', step_id: 'step-1' }, 'activities.steps.delete', { activityId: 'activity-1', stepId: 'step-1' }],
  ['reorder_activity_steps', { activity_id: 'activity-1', step_ids: ['step-2', 'step-1'] }, 'activities.steps.reorder', { activityId: 'activity-1', stepIds: ['step-2', 'step-1'] }],
  ['mark_activity_done', { activity_id: 'activity-1' }, 'activities.update', { activityId: 'activity-1', fields: { status: 'done' } }],
  ['set_focus_today', { activity_id: 'activity-1' }, 'activities.focus_today', { activityId: 'activity-1' }],
  ['delete_activity', { activity_id: 'activity-1' }, 'activities.delete', { activityId: 'activity-1' }],
  ['update_chapter_user_note', { chapter_id: 'chapter-1', note: 'Protect mornings.' }, 'chapters.note.update', { chapterId: 'chapter-1', note: 'Protect mornings.' }],
];

test.each(cases)('%s produces the same canonical call consumed by mobile Chat', (name, args, toolId, canonicalArguments) => {
  const tool = resolveExternalMcpTool(name);
  expect(tool).toBeDefined();
  expect(prepareExternalMcpAction(tool!, { ...args, idempotency_key: 'stable-key' }, 'request-1')).toEqual({
    id: 'request-1', toolId, arguments: canonicalArguments,
  });
});

test('parity covers every retained v1 compatibility write', () => {
  const compatibilityWrites = EXTERNAL_ACTION_REGISTRATIONS
    .filter((registration) => registration.requiredScopes.some((scope) => scope.endsWith('.write')))
    .flatMap((registration) => registration.compatibilityAliases.map((item) => item.name));
  expect(cases.map(([name]) => name)).toEqual(compatibilityWrites);
});

test('MCP projects the exact canonical receipt returned to mobile Chat', async () => {
  const tool = resolveExternalMcpTool('capture_activity');
  if (!tool) throw new Error('missing capture tool');
  const canonicalExecute = jest.fn(async (call: ReturnType<typeof prepareExternalMcpAction>) => ({
    status: 'completed' as const,
    output: { receiptId: 'receipt-1' },
    receipt: {
      receiptId: 'receipt-1', operationId: call.toolId, requestId: call.id,
      resultRefs: [{ kind: 'activity', id: 'activity-1' }], status: 'completed',
    },
  }));

  const mobileResult = await canonicalExecute({
    id: 'request-1', toolId: 'activities.capture', arguments: { title: 'Pack lunch' },
  });
  const mcpResult = await executeExternalMcpWrite({
    tool, args: { title: 'Pack lunch' }, requestId: 'request-1', execute: canonicalExecute,
  });

  expect(mcpResult.structured).toMatchObject({
    receipt_id: mobileResult.receipt.receiptId,
    operation: 'activities.capture',
    status: mobileResult.receipt.status,
    result_references: mobileResult.receipt.resultRefs,
  });
});
