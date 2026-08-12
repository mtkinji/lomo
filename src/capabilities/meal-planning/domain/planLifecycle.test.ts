import { getPlanLifecycleSignature, groupPlanCandidates, reconcilePlanCandidateOrder, sortPlanCandidates } from './planLifecycle';

const candidate = (id: string, lifecycle: 'idea' | 'sent' | 'ready', voteCount: number, createdAt: string, downvoteCount = 0) => ({ id, lifecycle, voteCount, downvoteCount, createdAt });

describe('household Plan lifecycle ordering', () => {
  const candidates = [
    candidate('idea-popular', 'idea', 5, '2026-08-11T04:00:00Z'),
    candidate('sent-one', 'sent', 1, '2026-08-11T01:00:00Z'),
    candidate('ready-one', 'ready', 1, '2026-08-11T02:00:00Z'),
    candidate('sent-new', 'sent', 1, '2026-08-11T03:00:00Z'),
    candidate('idea-new', 'idea', 1, '2026-08-11T05:00:00Z'),
    candidate('idea-downvoted', 'idea', 1, '2026-08-11T06:00:00Z', 1),
  ];

  it('sorts by lifecycle, then support, then recency', () => {
    expect(sortPlanCandidates(candidates).map((item) => item.id)).toEqual([
      'ready-one', 'sent-new', 'sent-one', 'idea-popular', 'idea-new', 'idea-downvoted',
    ]);
  });

  it('keeps the tapped row stable for reaction-only changes', () => {
    const current = ['ready-one', 'sent-one', 'sent-new', 'idea-popular', 'idea-new', 'idea-downvoted'];
    expect(reconcilePlanCandidateOrder(current, candidates, 'reaction')).toEqual(current);
    expect(reconcilePlanCandidateOrder(current, candidates, 'lifecycle')).toEqual([
      'ready-one', 'sent-new', 'sent-one', 'idea-popular', 'idea-new', 'idea-downvoted',
    ]);
  });

  it('does not mistake a server vote re-sort for a lifecycle transition', () => {
    expect(getPlanLifecycleSignature([
      candidate('first', 'idea', 2, '2026-08-11T02:00:00Z'),
      candidate('second', 'idea', 1, '2026-08-11T01:00:00Z'),
    ])).toBe(getPlanLifecycleSignature([
      candidate('second', 'idea', 2, '2026-08-11T01:00:00Z'),
      candidate('first', 'idea', 1, '2026-08-11T02:00:00Z'),
    ]));
  });

  it('groups candidates without inventing a partial-ready state', () => {
    expect(groupPlanCandidates(candidates).map((group) => [group.lifecycle, group.items.length])).toEqual([
      ['ready', 1], ['sent', 2], ['idea', 3],
    ]);
  });
});
