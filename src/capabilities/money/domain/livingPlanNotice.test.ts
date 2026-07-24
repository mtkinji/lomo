import { getLivingPlanNoticeContent } from './living-plan-notice';

describe('getLivingPlanNoticeContent', () => {
  it('surfaces an unseen material automatic update', () => {
    expect(getLivingPlanNoticeContent({
      trigger: 'sync_evidence_changed',
      outcome: 'material',
      cause: 'New account history updated 3 monthly budgets.',
      seenAtIso: null,
    })).toEqual({
      title: 'Monthly plans changed',
      body: 'New account history updated 3 monthly budgets.',
    });
  });

  it('uses explicit copy for a user override', () => {
    expect(getLivingPlanNoticeContent({
      trigger: 'override_changed',
      outcome: 'routine',
      cause: 'An amount you set was preserved.',
      seenAtIso: null,
    })?.title).toBe('Your change adjusted the plan');
  });

  it.each([
    null,
    { outcome: 'initial' as const, cause: 'Initial', seenAtIso: null },
    { outcome: 'reversal' as const, cause: 'Reversed', seenAtIso: null },
    { outcome: 'material' as const, cause: 'Seen', seenAtIso: '2026-07-24T12:00:00.000Z' },
  ])('does not interrupt the summary for %p', (receipt) => {
    expect(getLivingPlanNoticeContent(receipt)).toBeNull();
  });
});
