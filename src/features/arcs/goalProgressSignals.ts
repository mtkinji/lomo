import type { Activity, Goal } from '../../domain/types';
import { colors } from '../../theme';
import type { GoalProgressSignal } from '../../ui/GoalProgressSignalsRow';

type GoalProgressSignalSummary = Omit<GoalProgressSignal, 'onPress'>;

type BuildGoalProgressSignalSummariesParams = {
  goal: Goal | null | undefined;
  goalActivities: Activity[];
  completedGoalActivities: Activity[];
  now?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });
}

export function buildGoalProgressSignalSummaries({
  goal,
  goalActivities,
  completedGoalActivities,
  now = new Date(),
}: BuildGoalProgressSignalSummariesParams): GoalProgressSignalSummary[] {
  const nowMs = now.getTime();
  const weekAgoMs = nowMs - 7 * DAY_MS;
  const targetDateLabelLocal = goal?.targetDate ? formatShortDate(new Date(goal.targetDate)) : undefined;

  const doneWithTimestamps = completedGoalActivities
    .map((activity) => {
      const completedAt = activity.completedAt ?? activity.updatedAt ?? activity.createdAt ?? null;
      const completedAtMs = completedAt ? Date.parse(completedAt) : NaN;
      return { activity, completedAtMs };
    })
    .filter((entry) => Number.isFinite(entry.completedAtMs));

  const doneLast7Days = doneWithTimestamps.filter((entry) => entry.completedAtMs >= weekAgoMs).length;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const nextScheduled = goalActivities
    .map((activity) => {
      const scheduledAt = activity.scheduledDate ?? null;
      const scheduledAtMs = scheduledAt ? Date.parse(scheduledAt) : NaN;
      return { scheduledAt, scheduledAtMs };
    })
    .filter((entry) => Number.isFinite(entry.scheduledAtMs) && entry.scheduledAtMs >= todayStartMs)
    .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs)[0]?.scheduledAt;

  const nextScheduledLabel = nextScheduled
    ? (() => {
        const d = new Date(nextScheduled);
        const diffDays = Math.round((d.getTime() - todayStartMs) / DAY_MS);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        return formatShortDate(d);
      })()
    : null;

  const targetValue = (() => {
    if (!goal?.targetDate) return 'No date';
    const targetMs = Date.parse(goal.targetDate);
    if (!Number.isFinite(targetMs)) return targetDateLabelLocal ?? 'No date';
    const diffDays = Math.ceil((targetMs - nowMs) / DAY_MS);
    const absDiff = Math.abs(diffDays);
    if (absDiff <= 21) {
      if (diffDays === 0) return 'Due today';
      if (diffDays > 0) return `${diffDays}d left`;
      return `${absDiff}d overdue`;
    }
    return targetDateLabelLocal ?? formatShortDate(new Date(goal.targetDate));
  })();

  const targetValueColor =
    typeof targetValue === 'string' && targetValue.includes('overdue')
      ? colors.destructive
      : targetValue === 'No date'
        ? colors.gray600
        : typeof targetValue === 'string' && (targetValue.includes('left') || targetValue.includes('Due today'))
          ? colors.indigo600
          : colors.textPrimary;
  const momentumValueColor = doneLast7Days > 0 ? colors.indigo600 : colors.gray600;

  const signals: GoalProgressSignalSummary[] = [
    {
      id: 'goal-signal-plan',
      value: `${completedGoalActivities.length}/${goalActivities.length}`,
      label: 'Done',
      accessibilityLabel: `Plan: ${completedGoalActivities.length} of ${goalActivities.length} done`,
      valueColor:
        goalActivities.length > 0 && completedGoalActivities.length === goalActivities.length
          ? colors.indigo600
          : colors.textPrimary,
    },
    {
      id: 'goal-signal-momentum',
      value: `${doneLast7Days}`,
      label: 'This week',
      accessibilityLabel: `${doneLast7Days} activities done in the last 7 days`,
      valueColor: momentumValueColor,
    },
    {
      id: 'goal-signal-target',
      value: targetValue,
      label: 'Finish by',
      accessibilityLabel: `Finish by: ${targetValue}. Tap to set a finish date.`,
      valueColor: targetValueColor,
    },
  ];

  if (nextScheduledLabel) {
    signals.push({
      id: 'goal-signal-next',
      value: nextScheduledLabel,
      label: 'Next',
    });
  }

  return signals;
}
