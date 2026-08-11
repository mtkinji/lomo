import { buildPlanPriorityChatBody } from './planPriorityChatPresentation';

const placedRecommendation = {
  activityId: 'activity-1',
  expectedUpdatedAt: '2026-08-11T16:00:00.000Z',
  title: 'Prepare the family plan',
  goalTitle: 'Family systems',
  priorityPosition: 0,
  placement: {
    status: 'placed' as const,
    startDate: '2026-08-12T15:00:00.000Z',
    endDate: '2026-08-12T16:00:00.000Z',
    calendarId: 'primary',
  },
};

describe('Plan priority Chat presentation', () => {
  test('keeps an analysis-only recommendation informational', () => {
    const body = buildPlanPriorityChatBody(
      [placedRecommendation],
      'tomorrow',
      [],
      { canPrepareChanges: false },
    );

    expect(body).toContain('Prepare the family plan');
    expect(body).not.toContain('ready to review below');
    expect(body).toContain('If you want, I can prepare these placements for review.');
  });

  test('points to the review surface only when the turn can prepare changes', () => {
    const body = buildPlanPriorityChatBody(
      [placedRecommendation],
      'tomorrow',
      [],
      { canPrepareChanges: true },
    );

    expect(body).toContain('The items with times are ready to review below.');
  });
});
