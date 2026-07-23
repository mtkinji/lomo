import type { Goal } from '../../domain/types';
import type { GoalProposalDraft } from '../ai/agentHandoffParsers';

type MergeRefinedGoalProposalParams = {
  goal: Goal;
  proposal: GoalProposalDraft;
  updatedAt: string;
};

export function mergeRefinedGoalProposal({
  goal,
  proposal,
  updatedAt,
}: MergeRefinedGoalProposalParams): Goal {
  const nextTitle = typeof proposal.title === 'string' ? proposal.title.trim() : '';
  const nextDescription =
    typeof proposal.description === 'string' && proposal.description.trim().length > 0
      ? proposal.description.trim()
      : undefined;
  const nextTargetDate = typeof proposal.targetDate === 'string' ? proposal.targetDate : undefined;
  const nextMetrics = Array.isArray(proposal.metrics) ? proposal.metrics : undefined;
  const mergedTargetDate = nextTargetDate ?? goal.targetDate;
  const mergedMetrics = nextMetrics ?? goal.metrics;
  const hasQuality = Boolean(mergedTargetDate) && mergedMetrics.length > 0;

  const mergedGoal: Goal = {
    ...goal,
    title: nextTitle || goal.title,
    description: nextDescription ?? goal.description,
    qualityState: hasQuality ? 'ready' : 'draft',
    updatedAt,
  };

  if (nextTargetDate) mergedGoal.targetDate = nextTargetDate;
  if (nextMetrics) mergedGoal.metrics = nextMetrics;
  if (proposal.priority !== undefined) mergedGoal.priority = proposal.priority;

  return mergedGoal;
}
