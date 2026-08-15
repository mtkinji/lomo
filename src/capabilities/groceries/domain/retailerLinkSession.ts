export type RetailerLinkId = 'amazon' | 'walmart';
export type RetailerLinkDecision = 'reported_added' | 'kept_for_later';

export type RetailerLinkSession = {
  schemaVersion: 1;
  listId: string;
  listRevision: number;
  retailerId: RetailerLinkId;
  decisions: Record<string, RetailerLinkDecision>;
  updatedAt: string;
};

export type RetailerLinkProgress = {
  currentItemId: string | null;
  workedThroughCount: number;
  reportedAddedCount: number;
  keptForLaterCount: number;
  totalCount: number;
  complete: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRetailerLinkSession(value: unknown): RetailerLinkSession | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (typeof value.listId !== 'string' || !value.listId.trim()) return null;
  if (!Number.isInteger(value.listRevision) || (value.listRevision as number) < 0) return null;
  if (value.retailerId !== 'amazon' && value.retailerId !== 'walmart') return null;
  if (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) return null;
  if (!isRecord(value.decisions)) return null;
  const decisions: Record<string, RetailerLinkDecision> = {};
  for (const [itemId, decision] of Object.entries(value.decisions)) {
    if (!itemId || (decision !== 'reported_added' && decision !== 'kept_for_later')) return null;
    decisions[itemId] = decision;
  }
  return {
    schemaVersion: 1,
    listId: value.listId,
    listRevision: value.listRevision as number,
    retailerId: value.retailerId,
    decisions,
    updatedAt: value.updatedAt,
  };
}

export function createRetailerLinkSession(input: {
  listId: string;
  listRevision: number;
  retailerId: RetailerLinkId;
  updatedAt?: string;
}): RetailerLinkSession {
  return {
    schemaVersion: 1,
    listId: input.listId,
    listRevision: input.listRevision,
    retailerId: input.retailerId,
    decisions: {},
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function reconcileRetailerLinkSession(input: {
  session: RetailerLinkSession | null;
  listId: string;
  listRevision: number;
  retailerId: RetailerLinkId;
  itemIds: string[];
  updatedAt?: string;
}): RetailerLinkSession {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  if (
    !input.session
    || input.session.listId !== input.listId
    || input.session.listRevision !== input.listRevision
    || input.session.retailerId !== input.retailerId
  ) {
    return createRetailerLinkSession({ ...input, updatedAt });
  }
  const itemIds = new Set(input.itemIds);
  const decisions = Object.fromEntries(
    Object.entries(input.session.decisions).filter(([itemId]) => itemIds.has(itemId)),
  ) as Record<string, RetailerLinkDecision>;
  return { ...input.session, decisions, updatedAt };
}

export function recordRetailerLinkDecision(
  session: RetailerLinkSession,
  itemId: string,
  decision: RetailerLinkDecision,
  updatedAt = new Date().toISOString(),
): RetailerLinkSession {
  return {
    ...session,
    decisions: { ...session.decisions, [itemId]: decision },
    updatedAt,
  };
}

export function getRetailerLinkProgress(
  itemIds: string[],
  session: RetailerLinkSession,
): RetailerLinkProgress {
  const decisions = itemIds.map((itemId) => session.decisions[itemId] ?? null);
  const workedThroughCount = decisions.filter(Boolean).length;
  const reportedAddedCount = decisions.filter((decision) => decision === 'reported_added').length;
  const keptForLaterCount = decisions.filter((decision) => decision === 'kept_for_later').length;
  return {
    currentItemId: itemIds.find((itemId) => !session.decisions[itemId]) ?? null,
    workedThroughCount,
    reportedAddedCount,
    keptForLaterCount,
    totalCount: itemIds.length,
    complete: workedThroughCount === itemIds.length,
  };
}
