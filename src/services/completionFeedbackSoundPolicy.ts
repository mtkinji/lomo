export type CompletionBaseSound = 'none' | 'step' | 'activity';

export type StreakSoundMoment =
  | 'none'
  | 'continued'
  | 'milestone'
  | 'savedByGrace'
  | 'repairOpportunity'
  | 'repaired';

export type CompletionFeedbackSound =
  | CompletionBaseSound
  | 'tinyCrowdWarm'
  | 'tinyCrowdProminent';

export function chooseCompletionFeedbackSound(input: {
  baseSound: CompletionBaseSound;
  streakMoment: StreakSoundMoment;
  allScheduledActivitiesDone: boolean;
}): CompletionFeedbackSound {
  if (
    input.allScheduledActivitiesDone ||
    input.streakMoment === 'milestone' ||
    input.streakMoment === 'repaired'
  ) {
    return 'tinyCrowdProminent';
  }

  if (input.streakMoment === 'continued') {
    return 'tinyCrowdWarm';
  }

  return input.baseSound;
}

export function allActivitiesDoneCelebrationId(localDate: string): string {
  return `all-done-${localDate}`;
}

export function willCompleteAllScheduledActivitiesToday(input: {
  activities: ReadonlyArray<{
    id: string;
    status: string;
    scheduledDate?: string | null;
  }>;
  completingActivityId: string;
  now?: Date;
}): boolean {
  const todayStart = new Date(input.now ?? new Date());
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const scheduledToday = input.activities.filter((activity) => {
    if (!activity.scheduledDate) return false;
    const scheduled = new Date(activity.scheduledDate);
    return scheduled >= todayStart && scheduled < todayEnd;
  });
  if (scheduledToday.length < 3) return false;
  if (!scheduledToday.some((activity) => activity.id === input.completingActivityId)) return false;

  return scheduledToday.every(
    (activity) =>
      activity.id === input.completingActivityId ||
      activity.status === 'done' ||
      activity.status === 'skipped' ||
      activity.status === 'cancelled',
  );
}
