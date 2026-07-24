import type { PlanChatSnapshot } from './capabilityAdapters';
import type { UnifiedChatThreadAggregate } from './types';

export type PlanPlacementConversationReferent = {
  schemaVersion: 1;
  capabilityId: 'plan';
  kind: 'awaiting_placement';
  activityId: string;
  expectedUpdatedAt: string;
  title: string;
  targetDate: string;
  priorityPosition: number;
};

export function buildPlanPlacementReferent(
  plan: Pick<PlanChatSnapshot, 'targetDate' | 'recommendations'>,
): PlanPlacementConversationReferent | null {
  const recommendation = [...plan.recommendations]
    .sort((left, right) => left.priorityPosition - right.priorityPosition)
    .find((candidate) => candidate.placement.status === 'unplaced');
  if (!recommendation?.expectedUpdatedAt) return null;
  return {
    schemaVersion: 1,
    capabilityId: 'plan',
    kind: 'awaiting_placement',
    activityId: recommendation.activityId,
    expectedUpdatedAt: recommendation.expectedUpdatedAt,
    title: recommendation.title,
    targetDate: plan.targetDate,
    priorityPosition: recommendation.priorityPosition,
  };
}

function parsePlanPlacementReferent(
  value: Record<string, unknown> | undefined,
): PlanPlacementConversationReferent | null {
  if (!value || value.schemaVersion !== 1 || value.capabilityId !== 'plan' ||
      value.kind !== 'awaiting_placement' || typeof value.activityId !== 'string' ||
      typeof value.expectedUpdatedAt !== 'string' || typeof value.title !== 'string' ||
      typeof value.targetDate !== 'string' || typeof value.priorityPosition !== 'number' ||
      !Number.isInteger(value.priorityPosition) || value.priorityPosition < 0) return null;
  return {
    schemaVersion: 1,
    capabilityId: 'plan',
    kind: 'awaiting_placement',
    activityId: value.activityId,
    expectedUpdatedAt: value.expectedUpdatedAt,
    title: value.title,
    targetDate: value.targetDate,
    priorityPosition: value.priorityPosition,
  };
}

export function resolvePlanPlacementReferent(
  aggregate: UnifiedChatThreadAggregate,
): PlanPlacementConversationReferent | null {
  const previousRun = aggregate.runs.at(-1);
  if (!previousRun) return null;
  const event = [...(aggregate.events ?? [])]
    .reverse()
    .find((candidate) =>
      candidate.runId === previousRun.id && candidate.type === 'conversation_referent');
  return parsePlanPlacementReferent(event?.payload);
}
