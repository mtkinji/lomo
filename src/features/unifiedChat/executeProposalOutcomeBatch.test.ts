import type { UnifiedChatProposal } from './types';
import { executeProposalOutcomeBatch } from './executeProposalOutcomeBatch';

function proposal(
  id: string,
  capabilityId: UnifiedChatProposal['capabilityId'],
  sequence: number,
  dependsOnSequence: number | null = null,
  runId = 'run-1',
): UnifiedChatProposal {
  return {
    id, threadId: 'thread-1', runId, messageId: 'message-1', capabilityId,
    title: id, body: id, status: 'pending', version: 1,
    createdAt: '2026-08-04T12:00:00.000Z', updatedAt: '2026-08-04T12:00:00.000Z',
    operation: {
      id: `operation-${id}`, proposalId: id, capabilityId, type: 'create_activity',
      targetId: null, summary: id, sequence: 1, idempotencyKey: `run-1:${id}`,
      outcomeStep: { sequence, dependsOnSequence },
      payload: { title: id },
    },
  } as UnifiedChatProposal;
}

const select = (...ids: string[]) => ids.map((proposalId) => ({
  proposalId, action: 'approve' as const, expectedVersion: 1,
}));

describe('executeProposalOutcomeBatch', () => {
  test('orders mixed-capability proposals by their outcome sequence', async () => {
    const executed: string[] = [];
    const proposals = [proposal('plan', 'plan', 3, 2), proposal('todo', 'todos', 1), proposal('money', 'money', 2, 1)];

    const result = await executeProposalOutcomeBatch({
      proposals,
      items: select('plan', 'todo', 'money'),
      execute: async (candidate) => { executed.push(candidate.id); },
    });

    expect(executed).toEqual(['todo', 'money', 'plan']);
    expect(result).toEqual({ applied: ['todo', 'money', 'plan'], failed: [], skipped: [] });
  });

  test('skips downstream work after a failed dependency while independent work continues', async () => {
    const executed: string[] = [];
    const proposals = [
      proposal('first', 'todos', 1), proposal('dependent', 'plan', 2, 1), proposal('independent', 'money', 3),
    ];

    const result = await executeProposalOutcomeBatch({
      proposals,
      items: select('first', 'dependent', 'independent'),
      execute: async (candidate) => {
        executed.push(candidate.id);
        if (candidate.id === 'first') throw new Error('Could not create prerequisite');
      },
    });

    expect(executed).toEqual(['first', 'independent']);
    expect(result).toEqual({
      applied: ['independent'],
      failed: [{ proposalId: 'first', message: 'Could not create prerequisite' }],
      skipped: [{ proposalId: 'dependent', reason: 'Its prerequisite did not complete.' }],
    });
  });

  test('does not run a dependent proposal when its prerequisite was not selected', async () => {
    const execute = jest.fn(async () => undefined);
    const result = await executeProposalOutcomeBatch({
      proposals: [proposal('first', 'todos', 1), proposal('dependent', 'plan', 2, 1)],
      items: select('dependent'),
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.skipped).toEqual([{
      proposalId: 'dependent', reason: 'Select its prerequisite to apply this change.',
    }]);
  });

  test('validates every selected proposal and one outcome before executing', async () => {
    const execute = jest.fn(async () => undefined);
    await expect(executeProposalOutcomeBatch({
      proposals: [proposal('one', 'todos', 1), proposal('two', 'money', 2, null, 'run-2')],
      items: select('one', 'two'),
      execute,
    })).rejects.toThrow('same outcome');
    expect(execute).not.toHaveBeenCalled();
  });
});
