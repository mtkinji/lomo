import {
  getPlanCandidateEligibility,
  getRecommendedPriorityActivities,
  rankActivitiesBySmartOrder,
  type PlanPriorityActivity,
  type PlanPriorityGoal,
} from './index';

function activity(overrides: Partial<PlanPriorityActivity> = {}): PlanPriorityActivity {
  return {
    id: 'activity-1', title: 'Pack lunch', status: 'planned', type: 'task', tags: [],
    goalId: null, createdAt: '2026-07-01T12:00:00.000Z', updatedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

const goals: PlanPriorityGoal[] = [{ id: 'goal-1', priority: 1 }];

describe('shared Plan priority kernel', () => {
  test('keeps hard urgency ahead of easier calendar fit or lower-ranked work', () => {
    const ranked = rankActivitiesBySmartOrder({
      activities: [
        activity({ id: 'easy', title: 'Easy errand', priority: 2, estimateMinutes: 10 }),
        activity({
          id: 'urgent', title: 'Important deep work', goalId: 'goal-1',
          scheduledDate: '2026-07-24', estimateMinutes: 120,
        }),
      ],
      goals,
      now: new Date('2026-07-24T12:00:00.000Z'),
    });

    expect(ranked.map((row) => row.activity.id)).toEqual(['urgent', 'easy']);
  });

  test('returns the same bounded positive recommendations used by native Plan', () => {
    expect(getRecommendedPriorityActivities({
      activities: [
        activity({ id: 'priority-1', priority: 1 }),
        activity({ id: 'closed', priority: 1, status: 'done' }),
        activity({ id: 'later', priority: 1, priorityState: 'later' }),
      ],
      goals: [],
      now: new Date('2026-07-24T12:00:00.000Z'),
      limit: 3,
    }).map((row) => row.activity.id)).toEqual(['priority-1']);
  });

  test('shares native Plan eligibility so server channels do not recommend closed or already placed work', () => {
    const now = new Date('2026-07-24T12:00:00.000Z');
    expect(getPlanCandidateEligibility({ activity: activity({ status: 'done' }), now }))
      .toMatchObject({ eligible: false, reason: 'closed' });
    expect(getPlanCandidateEligibility({
      activity: activity({ scheduledAt: '2026-07-24T13:00:00.000Z', estimateMinutes: 30 }), now,
    })).toMatchObject({ eligible: false, reason: 'already_scheduled' });
    expect(getPlanCandidateEligibility({ activity: activity({ priorityState: 'later' }), now }))
      .toMatchObject({ eligible: false, reason: 'not_active' });
  });
});
