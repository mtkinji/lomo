import type { Metric } from '../../domain/types';

type GoalRefinementPromptParams = {
  workspaceSnapshot: string;
  targetDate?: string;
  metrics?: Metric[];
};

export function buildGoalRefinementPrompt({
  workspaceSnapshot,
  targetDate,
  metrics,
}: GoalRefinementPromptParams): string {
  const metricSummary =
    metrics && metrics.length > 0
      ? metrics
          .slice(0, 3)
          .map((metric) => {
            const kind = metric.kind ? ` kind:${metric.kind}` : '';
            const target = typeof metric.target === 'number' ? ` target:${metric.target}` : '';
            const unit = metric.unit ? ` unit:${metric.unit}` : '';
            const milestoneDone = metric.completedAt ? ' done:true' : '';
            return `- ${metric.label}${kind}${target}${unit}${milestoneDone}`;
          })
          .join('\n')
      : 'None';

  const refinementContext = [
    '',
    '---',
    'TASK: refine the focused goal (do NOT create a different goal).',
    'Return a revised GOAL_PROPOSAL_JSON that makes the goal more specific + timeboxed.',
    'Prefer including both a structured targetDate and 1 metric in metrics if possible.',
    '',
    `Current targetDate: ${targetDate ?? 'None'}`,
    'Current metrics:',
    metricSummary,
  ].join('\n');

  return `${workspaceSnapshot}${refinementContext}`;
}
