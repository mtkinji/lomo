import { isUnifiedChatCapabilityId, type UnifiedChatCapabilityId } from './requestPolicy';
import {
  resolvePlanPlacementReferent,
  type PlanPlacementConversationReferent,
} from './planConversationReferent';
import type { UnifiedChatThreadAggregate } from './types';

export type PendingWorkConversationReferentItem = {
  proposalId: string;
  expectedVersion: number;
  capabilityId: UnifiedChatCapabilityId;
  operationType: string;
  targetId: string | null;
  expectedUpdatedAt: string | null;
  label: string;
  sequence: number;
};

export type PendingWorkConversationReferent = {
  schemaVersion: 2;
  kind: 'pending_work';
  items: PendingWorkConversationReferentItem[];
};

export type ConversationReferent =
  | PlanPlacementConversationReferent
  | PendingWorkConversationReferent;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parsePendingWorkItem(value: unknown): PendingWorkConversationReferentItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    !isNonEmptyString(candidate.proposalId) ||
    typeof candidate.expectedVersion !== 'number' ||
    !Number.isInteger(candidate.expectedVersion) ||
    candidate.expectedVersion < 1 ||
    !isUnifiedChatCapabilityId(candidate.capabilityId) ||
    !isNonEmptyString(candidate.operationType) ||
    !(candidate.targetId === null || isNonEmptyString(candidate.targetId)) ||
    !(candidate.expectedUpdatedAt === null || isNonEmptyString(candidate.expectedUpdatedAt)) ||
    !isNonEmptyString(candidate.label) ||
    typeof candidate.sequence !== 'number' ||
    !Number.isInteger(candidate.sequence) ||
    candidate.sequence < 1
  ) return null;
  return {
    proposalId: candidate.proposalId,
    expectedVersion: candidate.expectedVersion,
    capabilityId: candidate.capabilityId,
    operationType: candidate.operationType,
    targetId: candidate.targetId,
    expectedUpdatedAt: candidate.expectedUpdatedAt,
    label: candidate.label,
    sequence: candidate.sequence,
  };
}

function parsePendingWorkConversationReferent(
  value: Record<string, unknown> | undefined,
): PendingWorkConversationReferent | null {
  if (value?.schemaVersion !== 2 || value.kind !== 'pending_work' || !Array.isArray(value.items)) {
    return null;
  }
  const items = value.items.map(parsePendingWorkItem);
  if (items.length === 0 || items.some((item) => item === null)) return null;
  const parsed = items as PendingWorkConversationReferentItem[];
  if (new Set(parsed.map((item) => item.proposalId)).size !== parsed.length) return null;
  if (new Set(parsed.map((item) => item.sequence)).size !== parsed.length) return null;
  return {
    schemaVersion: 2,
    kind: 'pending_work',
    items: [...parsed].sort((left, right) => left.sequence - right.sequence),
  };
}

export function buildPendingWorkConversationReferent(
  items: readonly PendingWorkConversationReferentItem[],
): PendingWorkConversationReferent {
  const parsed = parsePendingWorkConversationReferent({
    schemaVersion: 2,
    kind: 'pending_work',
    items: [...items],
  });
  if (!parsed) throw new Error('Pending work referent contains malformed or duplicate identities.');
  return parsed;
}

export function resolveConversationReferent(
  aggregate: UnifiedChatThreadAggregate,
): ConversationReferent | null {
  const previousRun = aggregate.runs.at(-1);
  if (!previousRun) return null;
  const event = [...(aggregate.events ?? [])]
    .reverse()
    .find((candidate) =>
      candidate.runId === previousRun.id && candidate.type === 'conversation_referent');
  const pendingWork = parsePendingWorkConversationReferent(event?.payload);
  return pendingWork ?? resolvePlanPlacementReferent(aggregate);
}

export function formatConversationReferentGrounding(
  referent: PendingWorkConversationReferent,
): string {
  const items = referent.items.map((item) => {
    const identity = item.targetId && item.expectedUpdatedAt
      ? ` Authoritative mutation reference: targetId=${item.targetId}; expectedUpdatedAt=${item.expectedUpdatedAt}.`
      : ' This is a not-yet-created object, so no object id may be invented.';
    return `${item.sequence}. ${item.label} [${item.capabilityId}; ${item.operationType}].${identity}`;
  }).join('\n');
  return [
    'Typed conversation referent: the user is continuing or correcting this ordered reviewed-work set:',
    items,
    'Preserve the declared order. Use exact authoritative identity and optimistic version for any replacement mutation. A correction replaces the matching pending intent; it does not create an unrelated duplicate. Ask one useful clarification if words such as “other” could select more than one item. Machine references are tool-only and must never appear in visible prose.',
  ].join('\n');
}
