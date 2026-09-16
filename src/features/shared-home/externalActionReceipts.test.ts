import { selectExternalActionReceipts } from './externalActionReceipts';

const now = new Date('2026-09-16T18:00:00.000Z');

function action(overrides: Record<string, unknown> = {}) {
  return {
    id: 'action-1',
    client_id: 'client-1',
    surface: 'custom',
    tool_name: 'money.category.rename',
    tool_kind: 'write',
    object_type: 'money_category',
    object_id: 'category-1',
    success: true,
    error_code: null,
    result_status: 'success',
    result_summary: 'Renamed “Auto” to “Transportation”.',
    created_at: '2026-09-16T17:58:00.000Z',
    ...overrides,
  };
}

const connections = [{
  client_id: 'client-1', client_name: 'Codex', surface: 'custom', scope: 'read write',
  connected_at: null, last_used_at: null, revoked_at: null, write_count: 1, last_action_at: null,
}];

it('selects only recent terminal writes and names their originating app', () => {
  const receipts = selectExternalActionReceipts({
    connections,
    actions: [
      action(),
      action({ id: 'proposal', object_type: 'proposal', object_id: 'proposal-1' }),
      action({ id: 'handoff', object_type: 'client_action', object_id: 'handoff-1' }),
      action({ id: 'failure', success: false, result_status: 'error' }),
      action({ id: 'read', tool_kind: 'read' }),
    ],
  }, now);

  expect(receipts).toEqual([expect.objectContaining({
    id: 'action-1',
    summary: 'Renamed “Auto” to “Transportation”.',
    sourceName: 'Codex',
  })]);
});

it('deduplicates idempotent retries and limits the region to three receipts', () => {
  const receipts = selectExternalActionReceipts({
    connections,
    actions: [
      action({ id: 'replay', result_status: 'idempotent_replay', created_at: '2026-09-16T17:59:00.000Z' }),
      action(),
      action({ id: 'two', object_id: 'category-2', created_at: '2026-09-16T17:50:00.000Z' }),
      action({ id: 'three', object_id: 'category-3', created_at: '2026-09-16T17:40:00.000Z' }),
      action({ id: 'four', object_id: 'category-4', created_at: '2026-09-16T17:30:00.000Z' }),
    ],
  }, now);

  expect(receipts.map((receipt) => receipt.id)).toEqual(['replay', 'two', 'three']);
});

it('omits completed writes older than fourteen days', () => {
  expect(selectExternalActionReceipts({
    connections,
    actions: [action({ created_at: '2026-09-01T17:00:00.000Z' })],
  }, now)).toEqual([]);
});
