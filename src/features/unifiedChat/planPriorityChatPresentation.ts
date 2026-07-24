import { formatTimeRange } from '../../services/plan/planDates';
import {
  buildPlanPriorityPresentation,
  formatPlanNeedsTimeReason,
} from '../../services/plan/planPriorityPresentation';
import type { PlanRecommendationResult } from './planRecommendationTool';

export function buildPlanPriorityChatBody(
  recommendations: readonly PlanRecommendationResult['recommendations'][number][],
  dayLabel = 'tomorrow',
): string | null {
  if (recommendations.length === 0) return null;
  const priorityItems = buildPlanPriorityPresentation({
    recommendations: recommendations.filter((item) => item.placement.status === 'placed'),
    unplacedPriorities: recommendations.filter((item) => item.placement.status === 'unplaced'),
  });
  const lines = priorityItems.map((item, index) => {
    const recommendation = item.kind === 'scheduled' ? item.recommendation : item.priority;
    const placement = recommendation.placement.status === 'placed'
      ? `Ready to add at ${formatTimeRange(
          new Date(recommendation.placement.startDate),
          new Date(recommendation.placement.endDate),
        )}.`
      : formatPlanNeedsTimeReason({ reason: recommendation.placement.reason });
    const goal = recommendation.goalTitle ? ` Goal: ${recommendation.goalTitle}.` : '';
    return `${index + 1}. ${recommendation.title} — ${placement}${goal}`;
  });
  const needsTime = recommendations.some((item) => item.placement.status === 'unplaced');
  const ready = recommendations.some((item) => item.placement.status === 'placed');
  return [
    `Kwilt’s priority order for ${dayLabel}`,
    '',
    ...lines,
    '',
    'This is the same order used by Plan. A task that fits more easily does not outrank an earlier priority.',
    ready ? 'The items with times are ready to review below.' : '',
    needsTime ? 'For an item that still needs time, tell me the duration or window and I’ll prepare the placement.' : '',
  ].filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== '')).join('\n').trim();
}
