import {
  buildModerationIntake,
  type UgcReportRequest,
} from '../_shared/ugcSafety.ts';

export type ResolvedReportTarget = {
  reportedUserId: string | null;
  reportedPersonId: string | null;
  snapshot: Record<string, unknown>;
  followup: UgcSafetyFollowup;
};

export type UgcSafetyFollowup =
  | { kind: 'peer_block' }
  | { kind: 'household_help'; reporterRole: 'child' }
  | { kind: 'manage_household'; reporterRole: 'owner' | 'caregiver' }
  | { kind: 'guest_scope' };

type HouseholdMembershipBoundary = {
  householdId: string;
  role: 'owner' | 'caregiver' | 'child';
};

export function chooseSafetyFollowup(
  reporterMemberships: HouseholdMembershipBoundary[],
  reportedMemberships: HouseholdMembershipBoundary[],
): { followup: UgcSafetyFollowup; relationshipBoundary: 'peer' | 'same_household' } {
  const reportedHouseholds = new Set(reportedMemberships.map((membership) => membership.householdId));
  const shared = reporterMemberships.find((membership) => reportedHouseholds.has(membership.householdId));
  if (!shared) return { followup: { kind: 'peer_block' }, relationshipBoundary: 'peer' };
  if (shared.role === 'child') {
    return {
      followup: { kind: 'household_help', reporterRole: 'child' },
      relationshipBoundary: 'same_household',
    };
  }
  return {
    followup: { kind: 'manage_household', reporterRole: shared.role },
    relationshipBoundary: 'same_household',
  };
}

export type UgcReportRepository = {
  resolveTarget: (
    reporterUserId: string,
    targetKind: UgcReportRequest['targetKind'],
    targetId: string,
  ) => Promise<ResolvedReportTarget | null>;
  insert: (row: ReturnType<typeof buildModerationIntake>) => Promise<{ id: string }>;
  alert: (row: ReturnType<typeof buildModerationIntake> & { id: string }) => Promise<unknown>;
};

export class UgcReportError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'UgcReportError';
  }
}

export async function submitUgcReport(
  reporterUserId: string,
  request: UgcReportRequest,
  repository: UgcReportRepository,
  nowIso: () => string = () => new Date().toISOString(),
): Promise<{ reportId: string; status: 'submitted'; followup: UgcSafetyFollowup }> {
  const target = await repository.resolveTarget(reporterUserId, request.targetKind, request.targetId);
  if (!target || target.reportedUserId === reporterUserId) {
    throw new UgcReportError('report_target_unavailable');
  }

  const intake = buildModerationIntake({
    reporterUserId,
    reportedUserId: target.reportedUserId,
    reportedPersonId: target.reportedPersonId,
    targetKind: request.targetKind,
    targetId: request.targetId,
    reason: request.reason,
    note: request.note,
    snapshot: target.snapshot,
    submittedAt: nowIso(),
    appVersion: request.appVersion,
    buildNumber: request.buildNumber,
  });
  const inserted = await repository.insert(intake);
  await repository.alert({ ...intake, id: inserted.id }).catch(() => undefined);
  return { reportId: inserted.id, status: 'submitted', followup: target.followup };
}
