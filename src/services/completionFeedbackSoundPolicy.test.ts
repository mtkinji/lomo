import {
  allActivitiesDoneCelebrationId,
  chooseCompletionFeedbackSound,
  willCompleteAllScheduledActivitiesToday,
} from './completionFeedbackSoundPolicy';

describe('completion feedback sound policy', () => {
  it('keeps ordinary completion feedback small', () => {
    expect(
      chooseCompletionFeedbackSound({
        baseSound: 'activity',
        streakMoment: 'none',
        allScheduledActivitiesDone: false,
      }),
    ).toBe('activity');

    expect(
      chooseCompletionFeedbackSound({
        baseSound: 'step',
        streakMoment: 'none',
        allScheduledActivitiesDone: false,
      }),
    ).toBe('step');
  });

  it('replaces the base sound when an ordinary streak continues', () => {
    expect(
      chooseCompletionFeedbackSound({
        baseSound: 'activity',
        streakMoment: 'continued',
        allScheduledActivitiesDone: false,
      }),
    ).toBe('tinyCrowdWarm');
  });

  it.each(['milestone', 'repaired'] as const)(
    'uses one prominent cue when the streak is %s',
    (streakMoment) => {
      expect(
        chooseCompletionFeedbackSound({
          baseSound: 'activity',
          streakMoment,
          allScheduledActivitiesDone: false,
        }),
      ).toBe('tinyCrowdProminent');
    },
  );

  it('lets all scheduled work outrank an ordinary streak without stacking sounds', () => {
    expect(
      chooseCompletionFeedbackSound({
        baseSound: 'activity',
        streakMoment: 'continued',
        allScheduledActivitiesDone: true,
      }),
    ).toBe('tinyCrowdProminent');
  });

  it.each(['savedByGrace', 'repairOpportunity'] as const)(
    'does not applaud when the streak is %s',
    (streakMoment) => {
      expect(
        chooseCompletionFeedbackSound({
          baseSound: 'activity',
          streakMoment,
          allScheduledActivitiesDone: false,
        }),
      ).toBe('activity');
    },
  );

  it('uses one stable all-done id for the local day', () => {
    expect(allActivitiesDoneCelebrationId('2026-08-10')).toBe('all-done-2026-08-10');
  });

  it('recognizes the last of at least three scheduled activities from any completion surface', () => {
    const activities = [
      { id: 'one', status: 'done', scheduledDate: '2026-08-10T15:00:00.000Z' },
      { id: 'two', status: 'skipped', scheduledDate: '2026-08-10T16:00:00.000Z' },
      { id: 'three', status: 'planned', scheduledDate: '2026-08-10T17:00:00.000Z' },
      { id: 'tomorrow', status: 'planned', scheduledDate: '2026-08-11T17:00:00.000Z' },
    ];

    expect(
      willCompleteAllScheduledActivitiesToday({
        activities,
        completingActivityId: 'three',
        now: new Date('2026-08-10T18:00:00.000Z'),
      }),
    ).toBe(true);

    expect(
      willCompleteAllScheduledActivitiesToday({
        activities,
        completingActivityId: 'one',
        now: new Date('2026-08-10T18:00:00.000Z'),
      }),
    ).toBe(false);

    expect(
      willCompleteAllScheduledActivitiesToday({
        activities: activities.map((activity) =>
          activity.id === 'three' ? { ...activity, status: 'done' } : activity,
        ),
        completingActivityId: 'unscheduled',
        now: new Date('2026-08-10T18:00:00.000Z'),
      }),
    ).toBe(false);
  });
});
