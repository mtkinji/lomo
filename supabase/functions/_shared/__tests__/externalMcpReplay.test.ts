import { projectExternalAuditReplay } from '../externalMcpReplay';

test('an old unavailable action never becomes completed on retry', () => {
  expect(projectExternalAuditReplay({ object_type: 'action', object_id: 'request-1' }, 'goals.create'))
    .toMatchObject({ status: 'unavailable', receipt_id: null, result_references: [] });
});
test.each(['proposal', 'client_action'])('an old %s does not redirect retries to an unavailable app review', (type) => {
  expect(projectExternalAuditReplay({ object_type: type, object_id: 'pending-1' }, 'goals.create')).toBeNull();
});
test('replays exact receipts and non-completion outcomes without reconstructing a success', () => {
  for (const status of ['completed', 'unavailable', 'refused', 'needs_input']) {
    expect(projectExternalAuditReplay({
      object_type: 'action', object_id: 'request-1',
      structured_result: { status, receipt_id: status === 'completed' ? 'receipt-1' : null },
    }, 'goals.create')).toEqual({ status, receipt_id: status === 'completed' ? 'receipt-1' : null, idempotent_replay: true });
  }
});
test('a legacy completed capture is not repeated after upgrading the server', () => {
  expect(projectExternalAuditReplay({ object_type: 'activity', object_id: 'activity-1' }, 'activities.capture'))
    .toMatchObject({ status: 'completed', result_references: [{ kind: 'activity', id: 'activity-1' }] });
});
