import type { PlanMode } from './planAvailability';
import type { PlanUnplacedPriorityReason } from './planScheduling';
import { formatMinutes } from '../../utils/formatMinutes';

export type ScheduledPlanPriority<T> = {
  kind: 'scheduled';
  priorityPosition: number;
  recommendation: T;
};

export type NeedsTimePlanPriority<T> = {
  kind: 'needs_time';
  priorityPosition: number;
  priority: T;
};

export function buildPlanPriorityPresentation<
  TScheduled extends { priorityPosition?: number },
  TNeedsTime extends { priorityPosition: number },
>({
  recommendations,
  unplacedPriorities,
}: {
  recommendations: readonly TScheduled[];
  unplacedPriorities: readonly TNeedsTime[];
}): Array<ScheduledPlanPriority<TScheduled> | NeedsTimePlanPriority<TNeedsTime>> {
  return [
    ...recommendations.map((recommendation) => ({
      kind: 'scheduled' as const,
      priorityPosition: recommendation.priorityPosition ?? Number.MAX_SAFE_INTEGER,
      recommendation,
    })),
    ...unplacedPriorities.map((priority) => ({
      kind: 'needs_time' as const,
      priorityPosition: priority.priorityPosition,
      priority,
    })),
  ].sort((left, right) => left.priorityPosition - right.priorityPosition);
}

export function formatPlanNeedsTimeReason(item: {
  reason: PlanUnplacedPriorityReason;
  durationMinutes?: number;
  mode?: PlanMode;
}): string {
  const duration = item.durationMinutes ? formatMinutes(item.durationMinutes) : null;
  switch (item.reason) {
    case 'no_matching_window':
      return item.mode ? `No obvious time in your ${item.mode} hours.` : 'No matching availability window yet.';
    case 'needs_larger_window':
      return duration ? `No obvious ${duration} opening.` : 'Needs a larger opening.';
    case 'no_open_slot':
      return duration ? `No obvious ${duration} opening.` : 'No open slot yet.';
    case 'no_write_calendar':
      return 'No calendar is ready for this yet.';
  }
}
