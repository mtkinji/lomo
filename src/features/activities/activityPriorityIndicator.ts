import type { ActivityPriorityIndicator } from '../../ui/ActivityListItem';

export function buildPriorityIndicator(params: {
  position: number;
  total: number;
  reasons: string[];
}): ActivityPriorityIndicator | null {
  if (params.position > 10) return null;
  const label = `#${params.position}`;
  return {
    label,
    tone: params.position <= 3 ? 'top' : 'high',
    accessibilityLabel:
      params.reasons.length > 0
        ? `Priority ${params.position} of ${params.total}. Show priority reasons.`
        : `Priority ${params.position} of ${params.total}.`,
    reasons: params.reasons,
  };
}
