import { formatTimeRange } from '../../services/plan/planDates';
import {
  buildPlanPriorityPresentation,
  formatPlanNeedsTimeReason,
} from '../../services/plan/planPriorityPresentation';
import type { PlanRecommendationResult, PlanScheduledItem } from './planRecommendationTool';

export function buildPlanPriorityChatBody(
  recommendations: readonly PlanRecommendationResult['recommendations'][number][],
  dayLabel = 'tomorrow',
  scheduledItems: readonly PlanScheduledItem[] = [],
): string | null {
  if (recommendations.length === 0 && scheduledItems.length === 0) {
    return `Nothing is officially on your Plan for ${dayLabel} yet.`;
  }
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
  const scheduledLines = scheduledItems.map((item) => {
    const timing = item.placement === 'calendar' && item.startDate && item.endDate
      ? formatTimeRange(new Date(item.startDate), new Date(item.endDate))
      : 'Planned for the day; no time set';
    const goal = item.goalTitle ? ` · ${item.goalTitle}` : '';
    return `- ${timing} — ${item.title}${goal}`;
  });
  const sections: string[] = [];
  if (scheduledItems.length > 0) {
    sections.push(`Already on your Plan for ${dayLabel}`, '', ...scheduledLines);
  }
  if (recommendations.length > 0) {
    if (sections.length > 0) sections.push('');
    sections.push(
      scheduledItems.length > 0
        ? `Recommended next — Kwilt’s priority order for ${dayLabel}`
        : `Kwilt’s priority order for ${dayLabel}`,
      '',
      ...lines,
      '',
      'This is the same order used by Plan. A task that fits more easily does not outrank an earlier priority.',
    );
    if (ready) sections.push('The items with times are ready to review below.');
    if (needsTime) sections.push('For an item that still needs time, tell me the duration or window and I’ll prepare the placement.');
  }
  return sections.join('\n').trim();
}
