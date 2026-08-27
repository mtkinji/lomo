import { useCallback, useEffect, useMemo, useState } from 'react';
import { choreDraftToControlFields, type ChoreDraft } from '../domain/choreCreation';
import type { ChoreOccurrence, ChoreSeries } from '../domain/choreLearning';
import { createChoreActions } from '../domain/choreActions';
import { projectProductionChoresToPresentation } from '../domain/choreProductionProjection';
import { createChoreRepository, type ChoreControlSnapshot } from '../data/choreRepository';
import { useHouseholdModeStore } from '../../../features/household/sharedDevice/useHouseholdModeStore';
import { getInstallId } from '../../../services/installId';

function requestId(prefix: string): string {
  const suffix = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `native-chore-${prefix}-${suffix}`;
}

export function useActivityBackedChores(enabled: boolean) {
  const householdMode = useHouseholdModeStore((state) => state.session);
  const actorMembershipId = householdMode?.verification === 'current'
    ? householdMode.activeMemberId : null;
  const repository = useMemo(() => createChoreRepository(undefined, undefined, async () => (
    actorMembershipId ? { actorMembershipId, installId: await getInstallId() } : null
  )), [actorMembershipId]);
  const actions = useMemo(() => createChoreActions(repository), [repository]);
  const [snapshot, setSnapshot] = useState<ChoreControlSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      await repository.replayOutbox();
      setSnapshot(await repository.read());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load household Chores.');
    } finally {
      setLoading(false);
    }
  }, [enabled, repository]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = useCallback(async (effect: () => Promise<unknown>) => {
    try {
      await effect();
      await refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this Chore.');
      return false;
    }
  }, [refresh]);

  const record = useMemo(
    () => snapshot ? projectProductionChoresToPresentation(snapshot) : null,
    [snapshot],
  );

  return {
    snapshot,
    record,
    loading,
    error,
    refresh,
    create: (draft: ChoreDraft) => mutate(() => actions.createDefinition({
      requestId: requestId('create'), confirmed: true, fields: choreDraftToControlFields(draft),
    })),
    update: (series: ChoreSeries, draft: ChoreDraft) => !series.controlId || !series.updatedAt
      ? Promise.resolve(false)
      : mutate(() => actions.updateDefinition({
        requestId: requestId('update'), confirmed: true, choreId: series.controlId!,
        expectedUpdatedAt: series.updatedAt!, scope: 'this_and_future', fields: choreDraftToControlFields(draft),
      })),
    remove: (series: ChoreSeries) => !series.controlId || !series.updatedAt
      ? Promise.resolve(false)
      : mutate(() => actions.deleteDefinition({
        requestId: requestId('delete'), confirmed: true, choreId: series.controlId!,
        expectedUpdatedAt: series.updatedAt!,
      })),
    complete: (occurrence: ChoreOccurrence) => !occurrence.controlId || !occurrence.updatedAt
      ? Promise.resolve(false)
      : mutate(() => actions.completeOccurrence({
        requestId: requestId('complete'), confirmed: true, occurrenceId: occurrence.controlId!,
        expectedUpdatedAt: occurrence.updatedAt!,
        evidenceRefIds: snapshot?.occurrences.find((item) => item.id === occurrence.controlId)?.evidenceRefs ?? [],
      })),
    claim: (occurrence: ChoreOccurrence) => !occurrence.controlId || !occurrence.updatedAt
      ? Promise.resolve(false) : mutate(() => actions.claimOccurrence({ requestId: requestId('claim'), confirmed: true, occurrenceId: occurrence.controlId!, expectedUpdatedAt: occurrence.updatedAt! })),
    release: (occurrence: ChoreOccurrence) => !occurrence.controlId || !occurrence.updatedAt
      ? Promise.resolve(false) : mutate(() => actions.releaseOccurrence({ requestId: requestId('release'), confirmed: true, occurrenceId: occurrence.controlId!, expectedUpdatedAt: occurrence.updatedAt! })),
    reopen: (occurrence: ChoreOccurrence) => !occurrence.controlId || !occurrence.updatedAt
      ? Promise.resolve(false) : mutate(() => actions.reopenOccurrence({ requestId: requestId('reopen'), confirmed: true, occurrenceId: occurrence.controlId!, expectedUpdatedAt: occurrence.updatedAt! })),
    reportEarlier: (occurrences: ChoreOccurrence[]) => {
      const items = occurrences.flatMap((item) => item.controlId && item.updatedAt
        ? [{ occurrenceId: item.controlId, expectedUpdatedAt: item.updatedAt }] : []);
      return items.length !== occurrences.length ? Promise.resolve(false) : mutate(() => actions.reportEarlierOccurrences({ requestId: requestId('report-earlier'), confirmed: true, items }));
    },
    addEvidence: async (occurrence: ChoreOccurrence, fileUri: string, mimeType?: string | null) => {
      if (!occurrence.controlId || !occurrence.updatedAt) return false;
      try {
        const storageRef = await repository.uploadEvidence({ occurrenceId: occurrence.controlId, fileUri, mimeType });
        return await mutate(() => actions.addEvidence({
          requestId: requestId('evidence'), confirmed: true, occurrenceId: occurrence.controlId!,
          expectedUpdatedAt: occurrence.updatedAt!, storageRef,
        }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to upload Chore evidence.');
        return false;
      }
    },
    approve: (occurrence: ChoreOccurrence) => !occurrence.controlId || !occurrence.updatedAt
      ? Promise.resolve(false)
      : mutate(() => actions.approveOccurrence({
        requestId: requestId('approve'), confirmed: true, occurrenceId: occurrence.controlId!,
        expectedUpdatedAt: occurrence.updatedAt!,
      })),
    returnForAnotherPass: (occurrence: ChoreOccurrence, note: string | null) => !occurrence.controlId || !occurrence.updatedAt
      ? Promise.resolve(false)
      : mutate(() => actions.returnOccurrence({
        requestId: requestId('return'), confirmed: true, occurrenceId: occurrence.controlId!,
        expectedUpdatedAt: occurrence.updatedAt!, note,
      })),
    leaveMissed: (occurrence: ChoreOccurrence) => !occurrence.controlId || !occurrence.updatedAt
      ? Promise.resolve(false) : mutate(() => actions.leaveOccurrenceMissed({ requestId: requestId('leave-missed'), confirmed: true, occurrenceId: occurrence.controlId!, expectedUpdatedAt: occurrence.updatedAt! })),
    configureReward: (change: { enabled?: boolean; centsPerToken?: number }) => !snapshot
      ? Promise.resolve(false)
      : mutate(() => actions.configureReward({
        requestId: requestId('reward-configure'), confirmed: true,
        expectedVersion: snapshot.reward.version,
        enabled: change.enabled ?? snapshot.reward.enabled,
        centsPerToken: change.centsPerToken ?? snapshot.reward.centsPerToken,
      })),
    reserveReward: (tokenCount: number) => !snapshot
      ? Promise.resolve(false)
      : mutate(() => actions.reserveReward({
        requestId: requestId('reward-reserve'), confirmed: true,
        membershipId: snapshot.actor.membershipId, tokenCount,
        expectedVersion: snapshot.reward.version,
      })),
    cancelReward: (reservationId: string) => {
      const reservation = snapshot?.reward.reservations.find((item) => item.id === reservationId);
      return !reservation ? Promise.resolve(false) : mutate(() => actions.cancelReward({
        requestId: requestId('reward-cancel'), confirmed: true,
        reservationId, expectedUpdatedAt: reservation.updatedAt,
      }));
    },
    settleReward: (reservationId: string) => {
      const reservation = snapshot?.reward.reservations.find((item) => item.id === reservationId);
      return !reservation ? Promise.resolve(false) : mutate(() => actions.settleReward({
        requestId: requestId('reward-settle'), confirmed: true,
        reservationId, expectedUpdatedAt: reservation.updatedAt,
      }));
    },
  };
}
