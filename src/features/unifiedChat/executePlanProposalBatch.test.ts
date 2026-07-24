import type { UnifiedChatProposal } from './types';
import { executePlanProposalBatch } from './executePlanProposalBatch';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;

function planProposal(id: string, version = 1): PlanProposal {
  return {
    id, threadId: 'thread-1', runId: 'run-1', messageId: 'message-1', capabilityId: 'plan',
    title: id, body: 'Tomorrow', status: 'pending', version,
    createdAt: '2026-07-23T12:00:00.000Z', updatedAt: '2026-07-23T12:00:00.000Z',
    operation: {
      id: `operation-${id}`, proposalId: id, capabilityId: 'plan', type: 'schedule_activity',
      targetId: `activity-${id}`, summary: `Schedule ${id}`, sequence: 1,
      idempotencyKey: `run-1:${id}`,
      payload: {
        activityId: `activity-${id}`, expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
        startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z',
        targetDateKey: '2026-07-24',
        writeCalendarRef: { provider: 'google', accountId: 'account-1', calendarId: 'primary' },
      },
    },
  };
}

describe('executePlanProposalBatch', () => {
  test('validates the entire selection before making any change', async () => {
    const execute = jest.fn(async () => undefined);

    await expect(executePlanProposalBatch({
      proposals: [planProposal('one'), planProposal('two', 2)],
      items: [
        { proposalId: 'one', action: 'approve', expectedVersion: 1 },
        { proposalId: 'two', action: 'approve', expectedVersion: 1 },
      ],
      execute,
    })).rejects.toThrow('changed');

    expect(execute).not.toHaveBeenCalled();
  });

  test('executes selected proposals sequentially and keeps independent outcomes', async () => {
    const active: string[] = [];
    let simultaneous = 0;
    let maxSimultaneous = 0;
    const execute = jest.fn(async (proposal: PlanProposal) => {
      active.push(proposal.id);
      simultaneous += 1;
      maxSimultaneous = Math.max(maxSimultaneous, simultaneous);
      await Promise.resolve();
      simultaneous -= 1;
      if (proposal.id === 'two') throw new Error('Calendar unavailable');
    });

    const result = await executePlanProposalBatch({
      proposals: [planProposal('one'), planProposal('two'), planProposal('three')],
      items: ['one', 'two', 'three'].map((proposalId) => ({
        proposalId, action: 'approve' as const, expectedVersion: 1,
      })),
      execute,
    });

    expect(active).toEqual(['one', 'two', 'three']);
    expect(maxSimultaneous).toBe(1);
    expect(result).toEqual({
      applied: ['one', 'three'],
      failed: [{ proposalId: 'two', message: 'Calendar unavailable' }],
    });
  });
});
