import type { ChoreControlSnapshot, ChoreRepository } from '../data/choreRepository';
import {
  ChoreAuthorizationError,
  ChoreConfirmationRequiredError,
  ChoreEvidenceRequiredError,
  ChoreStaleTargetError,
  createChoreActions,
} from './choreActions';

const snapshot: ChoreControlSnapshot = {
  household: { id: 'household-1', name: 'Watanabe' },
  actor: { membershipId: 'caregiver-1', displayName: 'Andrew', role: 'caregiver' },
  members: [
    { membershipId: 'caregiver-1', displayName: 'Andrew', role: 'caregiver' },
    { membershipId: 'child-1', displayName: 'Charlie', role: 'child' },
  ],
  definitions: [{
    id: 'chore-1', activitySeriesId: 'series-1', title: 'Feed Scout', definitionOfDone: 'Food and fresh water',
    status: 'active', participation: 'assigned', assignedMembershipId: 'child-1', repeatRule: 'daily',
    repeatCustom: null, repeatBasis: 'scheduled', photoPolicy: 'required', reviewPolicy: 'caregiver_review',
    tokenValue: 2, updatedAt: 'definition-v1',
  }],
  occurrences: [{
    id: 'occurrence-1', definitionId: 'chore-1', activityId: 'activity-1', scheduledDate: '2026-08-27',
    title: 'Feed Scout', status: 'ready', assignedMembershipId: 'child-1', performedByMembershipId: null,
    performedAt: null, evidenceRefs: [], reviewNote: null, tokenCredited: false, updatedAt: 'occurrence-v1',
  }],
  reward: { enabled: true, centsPerToken: 50, version: 'reward-v1', balances: [{ membershipId: 'child-1', availableTokens: 8, reservedTokens: 0 }], reservations: [] },
  observedAt: '2026-08-27T18:00:00.000Z',
};

function repository(value = snapshot): jest.Mocked<ChoreRepository> {
  return {
    read: jest.fn(async () => value),
    execute: jest.fn(async (operation) => ({ operationId: operation.operationId, status: 'completed' as const, result: operation, updatedAt: 'v2' })),
    replayOutbox: jest.fn(async () => ({ replayed: 0, remaining: 0 })),
    uploadEvidence: jest.fn(async (_input: Parameters<ChoreRepository['uploadEvidence']>[0]) => 'occurrence-1/evidence.jpg'),
  };
}

describe('Activity-backed chore actions', () => {
  it('projects caregiver inventory and child work from the authorized repository snapshot', async () => {
    const caregiver = await createChoreActions(repository()).list();
    expect(caregiver.result).toMatchObject({ reviewQueue: [], openPool: [] });
    expect(caregiver.result.definitions).toHaveLength(1);

    const childSnapshot = { ...snapshot, actor: snapshot.members[1] };
    const child = await createChoreActions(repository(childSnapshot)).list();
    expect(child.result.assignedWork.map((item) => item.id)).toEqual(['occurrence-1']);
    expect(child.result.definitions).toEqual([]);
  });

  it('requires native photo evidence and submits the exact current occurrence only once', async () => {
    const store = repository({ ...snapshot, actor: snapshot.members[1] });
    const actions = createChoreActions(store);
    await expect(actions.completeOccurrence({ requestId: 'complete-1', confirmed: true,
      occurrenceId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1', evidenceRefIds: [] }))
      .rejects.toBeInstanceOf(ChoreEvidenceRequiredError);

    const input = { requestId: 'complete-2', confirmed: true, occurrenceId: 'occurrence-1',
      expectedUpdatedAt: 'occurrence-v1', evidenceRefIds: ['evidence-1'] };
    const [first, duplicate] = await Promise.all([actions.completeOccurrence(input), actions.completeOccurrence(input)]);
    expect(duplicate).toBe(first);
    expect(store.execute).toHaveBeenCalledTimes(1);
    expect(store.execute).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'chores.occurrence.complete' }));
  });

  it('attaches only an uploaded evidence reference scoped to the exact occurrence', async () => {
    const store = repository({ ...snapshot, actor: snapshot.members[1] });
    const actions = createChoreActions(store);
    await expect(actions.addEvidence({ requestId: 'evidence-bad', confirmed: true,
      occurrenceId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1', storageRef: 'another/evidence.jpg' }))
      .rejects.toThrow('invalid_chore_evidence_ref');
    await actions.addEvidence({ requestId: 'evidence-ok', confirmed: true,
      occurrenceId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1', storageRef: 'occurrence-1/evidence.jpg' });
    expect(store.execute).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'chores.evidence.add' }));
  });

  it('enforces caregiver review, exact versions, and explicit confirmation', async () => {
    const childStore = repository({ ...snapshot, actor: snapshot.members[1], occurrences: [{ ...snapshot.occurrences[0], status: 'waiting_approval', evidenceRefs: ['evidence-1'] }] });
    await expect(createChoreActions(childStore).approveOccurrence({ requestId: 'approve-child', confirmed: true,
      occurrenceId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1' })).rejects.toBeInstanceOf(ChoreAuthorizationError);

    const actions = createChoreActions(repository());
    await expect(actions.approveOccurrence({ requestId: 'approve-stale', confirmed: true,
      occurrenceId: 'occurrence-1', expectedUpdatedAt: 'old' })).rejects.toBeInstanceOf(ChoreStaleTargetError);
    await expect(actions.configureReward({ requestId: 'reward-confirm', confirmed: false,
      expectedVersion: 'reward-v1', enabled: true, centsPerToken: 75 })).rejects.toBeInstanceOf(ChoreConfirmationRequiredError);
  });

  it('governs open-pool claim and earlier-day correction by the exact Household actor', async () => {
    const child = snapshot.members[1];
    const available = { ...snapshot.occurrences[0], status: 'available' as const, assignedMembershipId: null };
    const claimStore = repository({ ...snapshot, actor: child, occurrences: [available] });
    await createChoreActions(claimStore).claimOccurrence({ requestId: 'claim-1', confirmed: true,
      occurrenceId: available.id, expectedUpdatedAt: available.updatedAt });
    expect(claimStore.execute).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'chores.occurrence.claim' }));

    const missed = { ...snapshot.occurrences[0], status: 'missed' as const };
    const correctionStore = repository({ ...snapshot, actor: child, occurrences: [missed] });
    await createChoreActions(correctionStore).reportEarlierOccurrences({ requestId: 'correct-1', confirmed: true,
      items: [{ occurrenceId: missed.id, expectedUpdatedAt: missed.updatedAt }] });
    expect(correctionStore.execute).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'chores.occurrence.report_earlier' }));

    const submittedEarlier = { ...missed, status: 'waiting_approval' as const, completionSource: 'earlier_day' as const };
    const caregiverStore = repository({ ...snapshot, occurrences: [submittedEarlier] });
    await createChoreActions(caregiverStore).leaveOccurrenceMissed({ requestId: 'leave-1', confirmed: true,
      occurrenceId: submittedEarlier.id, expectedUpdatedAt: submittedEarlier.updatedAt });
    expect(caregiverStore.execute).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'chores.review.leave_missed' }));
  });

  it('locks a reservation to the reviewed rate and records settlement outside Kwilt', async () => {
    const store = repository();
    const actions = createChoreActions(store);
    await actions.reserveReward({ requestId: 'reserve-1', confirmed: true, membershipId: 'child-1', tokenCount: 4, expectedVersion: 'reward-v1' });
    expect(store.execute).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ tokenCount: 4, centsPerToken: 50, moneyAmountCents: 200 }) }));

    const withReservation: ChoreControlSnapshot = { ...snapshot, reward: { ...snapshot.reward, reservations: [{
      id: 'reservation-1', membershipId: 'child-1', tokenCount: 4, centsPerToken: 50,
      moneyAmountCents: 200, status: 'reserved', updatedAt: 'reservation-v1',
    }] } };
    const settleStore = repository(withReservation);
    await createChoreActions(settleStore).settleReward({ requestId: 'settle-1', confirmed: true,
      reservationId: 'reservation-1', expectedUpdatedAt: 'reservation-v1' });
    expect(settleStore.execute).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'chores.reward.settle', payload: expect.objectContaining({ settlementKind: 'outside_app_record' }) }));
  });
});
