import type { ChoreControlSnapshot } from '../data/choreRepository';
import { projectProductionChoresToPresentation } from './choreProductionProjection';

it('preserves Activity identities while carrying exact Chore control identities and actor authority', () => {
  const snapshot = {
    household: { id: 'h1', name: 'House' },
    actor: { membershipId: 'm1', displayName: 'Kid', role: 'child' },
    members: [{ membershipId: 'm1', displayName: 'Kid', role: 'child' }],
    definitions: [{ id: 'p1', activitySeriesId: 'a-series', title: 'Dishes', definitionOfDone: 'Dry', status: 'active', participation: 'assigned', assignedMembershipId: 'm1', repeatRule: 'daily', repeatCustom: null, repeatBasis: 'scheduled', photoPolicy: 'required', reviewPolicy: 'caregiver_review', tokenValue: 2, updatedAt: 'pv1' }],
    occurrences: [{ id: 'o1', definitionId: 'p1', activityId: 'a-occ', scheduledDate: '2026-08-27', title: 'Dishes', status: 'ready', assignedMembershipId: 'm1', performedByMembershipId: null, performedAt: null, evidenceRefs: [], reviewNote: null, tokenCredited: false, updatedAt: 'ov1' }],
    reward: { enabled: true, centsPerToken: 50, version: 'rv1', balances: [{ membershipId: 'm1', availableTokens: 7, reservedTokens: 2 }], reservations: [] },
    observedAt: '2026-08-27T00:00:00Z',
  } satisfies ChoreControlSnapshot;
  const record = projectProductionChoresToPresentation(snapshot);
  expect(record.activeMemberId).toBe('m1');
  expect(record.series[0]).toMatchObject({ controlId: 'p1', activitySeriesId: 'a-series', updatedAt: 'pv1' });
  expect(record.occurrences[0]).toMatchObject({ controlId: 'o1', activityOccurrenceId: 'a-occ', updatedAt: 'ov1' });
  expect(record.rewardEvents[0].tokenDelta).toBe(9);
});
