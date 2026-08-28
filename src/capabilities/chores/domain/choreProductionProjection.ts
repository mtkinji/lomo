import type { ChoreControlSnapshot } from '../data/choreRepository';
import type {
  ChoreLearningRecord,
  ChoreOccurrence,
  ChoreRewardEvent,
  ChoreSeries,
} from './choreLearning';

/**
 * Compatibility projection for the existing Chores presentation components.
 * Authority remains the Activity-backed repository; this record is never persisted.
 */
export function projectProductionChoresToPresentation(
  snapshot: ChoreControlSnapshot,
): ChoreLearningRecord {
  const definitions = new Map(snapshot.definitions.map((item) => [item.id, item]));
  const members = snapshot.members.map((member) => {
    const balance = snapshot.reward.balances.find((item) => item.membershipId === member.membershipId);
    return {
      id: member.membershipId,
      displayName: member.displayName,
      role: member.role === 'child' ? 'child' as const : 'caregiver' as const,
      startingTokenBalance: (balance?.availableTokens ?? 0) + (balance?.reservedTokens ?? 0),
    };
  });
  const series: ChoreSeries[] = snapshot.definitions.map((item) => ({
    controlId: item.id,
    updatedAt: item.updatedAt,
    activitySeriesId: item.activitySeriesId,
    title: item.title,
    definitionOfDone: item.definitionOfDone,
    repeatRule: item.repeatRule,
    repeatCustom: item.repeatCustom ?? undefined,
    repeatBasis: item.repeatRule ? item.repeatBasis : undefined,
    tokenValue: item.tokenValue,
    photoPolicy: item.photoPolicy,
    reviewPolicy: item.reviewPolicy,
    participation: item.participation,
    assignedMemberId: item.assignedMembershipId,
  }));
  const occurrences: ChoreOccurrence[] = snapshot.occurrences.flatMap((item) => {
    const definition = definitions.get(item.definitionId);
    if (!definition) return [];
    const policy = item.policyOverrides ?? {};
    return [{
      controlId: item.id,
      updatedAt: item.updatedAt,
      activityOccurrenceId: item.activityId,
      activitySeriesId: definition.activitySeriesId,
      title: item.title,
      definitionOfDone: policy.definitionOfDone ?? definition.definitionOfDone,
      scheduledDate: item.scheduledDate,
      repeatRule: definition.repeatRule,
      repeatCustom: definition.repeatCustom ?? undefined,
      repeatBasis: definition.repeatRule ? definition.repeatBasis : undefined,
      repeatCreatedFromOccurrenceId: null,
      tokenValue: policy.tokenValue ?? definition.tokenValue,
      photoPolicy: policy.photoPolicy ?? definition.photoPolicy,
      reviewPolicy: policy.reviewPolicy ?? definition.reviewPolicy,
      participation: definition.participation,
      assignedMemberId: item.assignedMembershipId,
      state: item.status,
      claimedByMemberId: item.status === 'claimed' ? item.assignedMembershipId : null,
      performedByMemberId: item.performedByMembershipId,
      performedAtIso: item.performedAt,
      completionSource: item.completionSource ?? 'direct',
      reportedAtIso: item.reportedAt ?? null,
      reviewedByMemberId: null,
      reviewedAtIso: null,
      reviewNote: item.reviewNote,
      evidencePhotoUri: item.evidencePreviewUrls?.[0] ?? null,
    }];
  });
  const rewardEvents: ChoreRewardEvent[] = [];
  for (const balance of snapshot.reward.balances) {
    rewardEvents.push({
      id: `production-balance-${balance.membershipId}-${snapshot.observedAt}`,
      kind: 'adjust', memberId: balance.membershipId, actorMemberId: snapshot.actor.membershipId,
      occurredAtIso: snapshot.observedAt,
      tokenDelta: balance.availableTokens + balance.reservedTokens,
      tokenAmount: null, activityOccurrenceId: null, payoutId: null,
      moneyAmountCents: null, exchangeRateCentsPerToken: null, note: 'Current authoritative balance',
    });
  }
  for (const reservation of snapshot.reward.reservations) {
    rewardEvents.push({
      id: `production-reservation-${reservation.id}`,
      kind: 'reserve', memberId: reservation.membershipId, actorMemberId: snapshot.actor.membershipId,
      occurredAtIso: reservation.updatedAt, tokenDelta: 0, tokenAmount: reservation.tokenCount,
      activityOccurrenceId: null, payoutId: reservation.id,
      moneyAmountCents: reservation.moneyAmountCents,
      exchangeRateCentsPerToken: reservation.centsPerToken, note: null,
    });
    if (reservation.status !== 'reserved') rewardEvents.push({
      id: `production-${reservation.status}-${reservation.id}`,
      kind: reservation.status === 'settled' ? 'settle' : 'cancel',
      memberId: reservation.membershipId, actorMemberId: snapshot.actor.membershipId,
      occurredAtIso: reservation.updatedAt, tokenDelta: 0, tokenAmount: reservation.tokenCount,
      activityOccurrenceId: null, payoutId: reservation.id,
      moneyAmountCents: reservation.moneyAmountCents,
      exchangeRateCentsPerToken: reservation.centsPerToken, note: null,
    });
  }
  return {
    version: 13,
    activeMemberId: snapshot.actor.membershipId,
    tokensEnabled: snapshot.reward.enabled,
    rewardExchangeRateCentsPerToken: snapshot.reward.centsPerToken,
    rewardEvents,
    members,
    expectations: members.map((member) => ({ memberId: member.id, assigned: null, quota: null, benefit: null })),
    series,
    occurrences,
  };
}
