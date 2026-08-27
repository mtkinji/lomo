import type {
  ChoreControlSnapshot,
  ChoreDefinitionRecord,
  ChoreOccurrenceRecord,
  ChoreRepository,
  ChoreRepositoryOperation,
  ChoreRepositoryResult,
} from '../data/choreRepository';

export class ChoreAuthorizationError extends Error {
  constructor() { super('The current Household member is not authorized for this Chore action.'); this.name = 'ChoreAuthorizationError'; }
}
export class ChoreConfirmationRequiredError extends Error {
  constructor() { super('This Chore change requires explicit confirmation.'); this.name = 'ChoreConfirmationRequiredError'; }
}
export class ChoreStaleTargetError extends Error {
  constructor(public readonly currentVersion: string) { super('That Chore changed. Review the current version.'); this.name = 'ChoreStaleTargetError'; }
}
export class ChoreEvidenceRequiredError extends Error {
  constructor() { super('This Chore requires a native photo before it can be submitted.'); this.name = 'ChoreEvidenceRequiredError'; }
}

type Receipt<T> = {
  operationId: string;
  status: 'completed' | 'queued_offline';
  resultRefs: Array<{ kind: string; id: string }>;
  reversible: boolean;
  result: T;
};

const completedRoles = new Set(['owner', 'caregiver']);

function confirm(value: boolean): void {
  if (!value) throw new ChoreConfirmationRequiredError();
}
function caregiver(snapshot: ChoreControlSnapshot): void {
  if (!completedRoles.has(snapshot.actor.role)) throw new ChoreAuthorizationError();
}
function exactDefinition(snapshot: ChoreControlSnapshot, id: string, version: string): ChoreDefinitionRecord {
  const item = snapshot.definitions.find((candidate) => candidate.id === id);
  if (!item) throw new ChoreAuthorizationError();
  if (item.updatedAt !== version) throw new ChoreStaleTargetError(item.updatedAt);
  return item;
}
function exactOccurrence(snapshot: ChoreControlSnapshot, id: string, version: string): ChoreOccurrenceRecord {
  const item = snapshot.occurrences.find((candidate) => candidate.id === id);
  if (!item) throw new ChoreAuthorizationError();
  if (item.updatedAt !== version) throw new ChoreStaleTargetError(item.updatedAt);
  return item;
}

export function projectChoreControl(snapshot: ChoreControlSnapshot) {
  const isCaregiver = completedRoles.has(snapshot.actor.role);
  const visible = snapshot.occurrences.filter((item) => isCaregiver
    || item.assignedMembershipId === snapshot.actor.membershipId
    || item.assignedMembershipId === null);
  return {
    household: snapshot.household,
    actor: snapshot.actor,
    definitions: isCaregiver ? snapshot.definitions.filter((item) => item.status !== 'deleted') : [],
    assignedWork: visible.filter((item) => item.assignedMembershipId === snapshot.actor.membershipId),
    openPool: visible.filter((item) => item.assignedMembershipId === null && ['available', 'ready'].includes(item.status)),
    reviewQueue: isCaregiver ? visible.filter((item) => item.status === 'waiting_approval') : [],
    reward: {
      enabled: snapshot.reward.enabled,
      centsPerToken: snapshot.reward.centsPerToken,
      balance: snapshot.reward.balances.find((item) => item.membershipId === snapshot.actor.membershipId) ?? null,
      reservations: isCaregiver ? snapshot.reward.reservations : snapshot.reward.reservations.filter((item) => item.membershipId === snapshot.actor.membershipId),
      version: snapshot.reward.version,
    },
    observedAt: snapshot.observedAt,
  };
}

export function createChoreActions(repository: ChoreRepository) {
  // Dedupe belongs to one repository/session. A module-global cache can leak a
  // completed receipt into another signed-in household that reuses a request ID.
  const pendingByRequest = new Map<string, Promise<Receipt<ChoreRepositoryResult>>>();
  const execute = (operation: ChoreRepositoryOperation, reversible = true): Promise<Receipt<ChoreRepositoryResult>> => {
    const existing = pendingByRequest.get(operation.requestId);
    if (existing) return existing;
    const promise = repository.execute(operation).then((result) => ({
      operationId: operation.operationId,
      status: result.status,
      resultRefs: operation.targetId ? [{ kind: operation.operationId.includes('reward') ? 'chore_reward' : 'chore', id: operation.targetId }] : [],
      reversible,
      result,
    }));
    pendingByRequest.set(operation.requestId, promise);
    void promise.catch(() => pendingByRequest.delete(operation.requestId));
    return promise;
  };
  return {
    async list() { const result = projectChoreControl(await repository.read()); return { operationId: 'chores.list', status: 'completed' as const, resultRefs: [], reversible: true, result }; },
    async get(input: { choreId: string; occurrenceId?: string | null }) {
      const snapshot = await repository.read();
      const definition = snapshot.definitions.find((item) => item.id === input.choreId) ?? null;
      const occurrence = input.occurrenceId ? snapshot.occurrences.find((item) => item.id === input.occurrenceId) ?? null : null;
      if (!definition || (input.occurrenceId && !occurrence)) throw new ChoreAuthorizationError();
      if (snapshot.actor.role === 'child' && definition.assignedMembershipId !== null
        && definition.assignedMembershipId !== snapshot.actor.membershipId) throw new ChoreAuthorizationError();
      return { operationId: 'chores.get', status: 'completed' as const, resultRefs: [{ kind: 'chore', id: definition.id }], reversible: true, result: { definition, occurrence } };
    },
    async createDefinition(input: { requestId: string; confirmed: boolean; fields: Record<string, unknown> }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot);
      return execute({ requestId: input.requestId, operationId: 'chores.definition.create', targetId: null, expectedVersion: null, payload: { fields: input.fields } });
    },
    async updateDefinition(input: { requestId: string; confirmed: boolean; choreId: string; expectedUpdatedAt: string; scope: 'today' | 'this_and_future'; fields: Record<string, unknown> }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot); exactDefinition(snapshot, input.choreId, input.expectedUpdatedAt);
      return execute({ requestId: input.requestId, operationId: 'chores.definition.update', targetId: input.choreId, expectedVersion: input.expectedUpdatedAt, payload: { scope: input.scope, fields: input.fields } });
    },
    async pauseDefinition(input: { requestId: string; confirmed: boolean; choreId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot); exactDefinition(snapshot, input.choreId, input.expectedUpdatedAt);
      return execute({ requestId: input.requestId, operationId: 'chores.definition.pause', targetId: input.choreId, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async deleteDefinition(input: { requestId: string; confirmed: boolean; choreId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot); exactDefinition(snapshot, input.choreId, input.expectedUpdatedAt);
      return execute({ requestId: input.requestId, operationId: 'chores.definition.delete', targetId: input.choreId, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async completeOccurrence(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string; evidenceRefIds: string[] }) {
      confirm(input.confirmed); const snapshot = await repository.read(); const occurrence = exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      const definition = snapshot.definitions.find((item) => item.id === occurrence.definitionId);
      const assigned = occurrence.assignedMembershipId === snapshot.actor.membershipId;
      if (!assigned && !completedRoles.has(snapshot.actor.role)) throw new ChoreAuthorizationError();
      const photoPolicy = occurrence.policyOverrides?.photoPolicy ?? definition?.photoPolicy;
      if (photoPolicy === 'required' && input.evidenceRefIds.length === 0 && occurrence.evidenceRefs.length === 0) throw new ChoreEvidenceRequiredError();
      return execute({ requestId: input.requestId, operationId: 'chores.occurrence.complete', targetId: occurrence.id, expectedVersion: input.expectedUpdatedAt, payload: { evidenceRefIds: [...new Set(input.evidenceRefIds)] } });
    },
    async addEvidence(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string; storageRef: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); const occurrence = exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      const assigned = occurrence.assignedMembershipId === snapshot.actor.membershipId;
      if (!assigned && !completedRoles.has(snapshot.actor.role)) throw new ChoreAuthorizationError();
      if (!input.storageRef.startsWith(`${occurrence.id}/`)) throw new Error('invalid_chore_evidence_ref');
      return execute({ requestId: input.requestId, operationId: 'chores.evidence.add', targetId: occurrence.id, expectedVersion: input.expectedUpdatedAt, payload: { storageRef: input.storageRef } });
    },
    async claimOccurrence(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); const occurrence = exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      if (snapshot.actor.role !== 'child' || occurrence.status !== 'available' || occurrence.assignedMembershipId !== null) throw new ChoreAuthorizationError();
      return execute({ requestId: input.requestId, operationId: 'chores.occurrence.claim', targetId: occurrence.id, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async releaseOccurrence(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); const occurrence = exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      if (snapshot.actor.role !== 'child' || occurrence.status !== 'claimed' || occurrence.assignedMembershipId !== snapshot.actor.membershipId) throw new ChoreAuthorizationError();
      return execute({ requestId: input.requestId, operationId: 'chores.occurrence.release', targetId: occurrence.id, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async reopenOccurrence(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); const occurrence = exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      if (occurrence.status !== 'completed' || (snapshot.actor.role === 'child' && occurrence.performedByMembershipId !== snapshot.actor.membershipId)) throw new ChoreAuthorizationError();
      return execute({ requestId: input.requestId, operationId: 'chores.occurrence.reopen', targetId: occurrence.id, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async reportEarlierOccurrences(input: { requestId: string; confirmed: boolean; items: Array<{ occurrenceId: string; expectedUpdatedAt: string }> }) {
      confirm(input.confirmed); const snapshot = await repository.read();
      if (snapshot.actor.role !== 'child' || input.items.length === 0) throw new ChoreAuthorizationError();
      const unique = new Map(input.items.map((item) => [item.occurrenceId, item]));
      if (unique.size !== input.items.length) throw new Error('duplicate_chore_correction_target');
      for (const item of input.items) {
        const occurrence = exactOccurrence(snapshot, item.occurrenceId, item.expectedUpdatedAt);
        if (occurrence.status !== 'missed' || occurrence.assignedMembershipId !== snapshot.actor.membershipId) throw new ChoreAuthorizationError();
      }
      return execute({ requestId: input.requestId, operationId: 'chores.occurrence.report_earlier', targetId: null, expectedVersion: null, payload: { items: input.items } });
    },
    async approveOccurrence(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot); exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      return execute({ requestId: input.requestId, operationId: 'chores.review.approve', targetId: input.occurrenceId, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async returnOccurrence(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string; note: string | null }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot); exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      return execute({ requestId: input.requestId, operationId: 'chores.review.return', targetId: input.occurrenceId, expectedVersion: input.expectedUpdatedAt, payload: { note: input.note?.trim() || null } });
    },
    async leaveOccurrenceMissed(input: { requestId: string; confirmed: boolean; occurrenceId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot); const occurrence = exactOccurrence(snapshot, input.occurrenceId, input.expectedUpdatedAt);
      if (occurrence.status !== 'waiting_approval' || occurrence.completionSource !== 'earlier_day') throw new ChoreAuthorizationError();
      return execute({ requestId: input.requestId, operationId: 'chores.review.leave_missed', targetId: occurrence.id, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async readReward(input: { membershipId: string }) {
      const snapshot = await repository.read();
      if (snapshot.actor.role === 'child' && input.membershipId !== snapshot.actor.membershipId) throw new ChoreAuthorizationError();
      return { operationId: 'chores.reward.read', status: 'completed' as const, resultRefs: [{ kind: 'household_member', id: input.membershipId }], reversible: true,
        result: { settings: { enabled: snapshot.reward.enabled, centsPerToken: snapshot.reward.centsPerToken, version: snapshot.reward.version }, balance: snapshot.reward.balances.find((item) => item.membershipId === input.membershipId) ?? null,
          reservations: snapshot.reward.reservations.filter((item) => item.membershipId === input.membershipId) } };
    },
    async configureReward(input: { requestId: string; confirmed: boolean; expectedVersion: string; enabled: boolean; centsPerToken: number }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot);
      if (snapshot.reward.version !== input.expectedVersion) throw new ChoreStaleTargetError(snapshot.reward.version);
      if (!Number.isInteger(input.centsPerToken) || input.centsPerToken < 1 || input.centsPerToken > 100000) throw new Error('invalid_chore_reward_rate');
      return execute({ requestId: input.requestId, operationId: 'chores.reward.configure', targetId: snapshot.household.id, expectedVersion: input.expectedVersion, payload: { enabled: input.enabled, centsPerToken: input.centsPerToken } });
    },
    async reserveReward(input: { requestId: string; confirmed: boolean; membershipId: string; tokenCount: number; expectedVersion: string }) {
      confirm(input.confirmed); const snapshot = await repository.read();
      if (snapshot.actor.role === 'child' && input.membershipId !== snapshot.actor.membershipId) throw new ChoreAuthorizationError();
      if (snapshot.reward.version !== input.expectedVersion) throw new ChoreStaleTargetError(snapshot.reward.version);
      const balance = snapshot.reward.balances.find((item) => item.membershipId === input.membershipId);
      if (!balance || !Number.isInteger(input.tokenCount) || input.tokenCount < 1 || input.tokenCount > balance.availableTokens) throw new Error('insufficient_chore_tokens');
      return execute({ requestId: input.requestId, operationId: 'chores.reward.reserve', targetId: input.membershipId, expectedVersion: input.expectedVersion,
        payload: { tokenCount: input.tokenCount, centsPerToken: snapshot.reward.centsPerToken, moneyAmountCents: input.tokenCount * snapshot.reward.centsPerToken } });
    },
    async cancelReward(input: { requestId: string; confirmed: boolean; reservationId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read();
      const reservation = snapshot.reward.reservations.find((item) => item.id === input.reservationId);
      if (snapshot.actor.role === 'child' && reservation?.membershipId !== snapshot.actor.membershipId) throw new ChoreAuthorizationError();
      if (!reservation) throw new ChoreAuthorizationError(); if (reservation.updatedAt !== input.expectedUpdatedAt) throw new ChoreStaleTargetError(reservation.updatedAt);
      return execute({ requestId: input.requestId, operationId: 'chores.reward.cancel', targetId: reservation.id, expectedVersion: input.expectedUpdatedAt, payload: {} });
    },
    async settleReward(input: { requestId: string; confirmed: boolean; reservationId: string; expectedUpdatedAt: string }) {
      confirm(input.confirmed); const snapshot = await repository.read(); caregiver(snapshot);
      const reservation = snapshot.reward.reservations.find((item) => item.id === input.reservationId);
      if (!reservation) throw new ChoreAuthorizationError(); if (reservation.updatedAt !== input.expectedUpdatedAt) throw new ChoreStaleTargetError(reservation.updatedAt);
      return execute({ requestId: input.requestId, operationId: 'chores.reward.settle', targetId: reservation.id, expectedVersion: input.expectedUpdatedAt, payload: { settlementKind: 'outside_app_record' } }, false);
    },
    replayOutbox: () => repository.replayOutbox(),
  };
}
