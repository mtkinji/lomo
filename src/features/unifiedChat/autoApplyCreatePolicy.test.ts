import { findAutoApplyCreateProposal } from './autoApplyCreatePolicy';
import type { UnifiedChatThreadAggregate } from './types';

const aggregate = {
  thread: { id: 'thread-1' },
  runs: [{ id: 'run-1', requestClass: 'capability_action' }],
  proposals: [{
    id: 'proposal-1', runId: 'run-1', status: 'pending', version: 1, capabilityId: 'todos',
    operation: { type: 'create_activity', capabilityId: 'todos' },
  }],
} as unknown as UnifiedChatThreadAggregate;

describe('auto-apply create policy', () => {
  test('treats an explicit reversible create as its own approval', () => {
    expect(findAutoApplyCreateProposal(aggregate, 'run-1')).toMatchObject({ id: 'proposal-1' });
  });

  test.each([
    { requestClass: 'general', operation: 'create_activity', status: 'pending' },
    { requestClass: 'capability_action', operation: 'update_activity', status: 'pending' },
    { requestClass: 'capability_action', operation: 'create_activity', status: 'approved' },
  ])('keeps review for non-create or non-pending work: %o', ({ requestClass, operation, status }) => {
    const candidate = {
      ...aggregate,
      runs: [{ ...aggregate.runs[0], requestClass }],
      proposals: [{
        ...aggregate.proposals![0], status,
        operation: { ...aggregate.proposals![0]!.operation, type: operation },
      }],
    } as unknown as UnifiedChatThreadAggregate;
    expect(findAutoApplyCreateProposal(candidate, 'run-1')).toBeUndefined();
  });
});
