export type ChoreMember = {
  id: string;
  displayName: string;
  startingTokenBalance: number;
  role: 'child' | 'caregiver';
};

export type ChoreExpectation = {
  memberId: string;
  assigned: { cadence: 'daily' } | null;
  quota: {
    targetCount: number;
    qualifyingScope: 'open_pool' | 'all_qualifying';
    deadlineLabel: string;
    sheetLabel: string;
    creditedBeforeCurrentOccurrences: number;
  } | null;
  benefit: {
    label: string;
    sheetLabel: string;
    sheetBody: string;
  } | null;
};

export type ChoreReviewPolicy = 'trusted' | 'caregiver_review';
export type ChoreOccurrenceState =
  | 'ready'
  | 'available'
  | 'claimed'
  | 'waiting_approval'
  | 'needs_another_pass'
  | 'completed';

export type ChoreOccurrence = {
  activityOccurrenceId: string;
  activitySeriesId: string;
  title: string;
  definitionOfDone: string;
  tokenValue: 1 | 2 | 3;
  reviewPolicy: ChoreReviewPolicy;
  participation: 'assigned' | 'open';
  assignedMemberId: string | null;
  state: ChoreOccurrenceState;
  claimedByMemberId: string | null;
  performedByMemberId: string | null;
  performedAtIso: string | null;
  reviewedByMemberId: string | null;
  reviewedAtIso: string | null;
  reviewNote: string | null;
  evidencePhotoUri: string | null;
};

export type ChoreLearningRecord = {
  version: 4;
  activeMemberId: string;
  tokensEnabled: boolean;
  members: ChoreMember[];
  expectations: ChoreExpectation[];
  occurrences: ChoreOccurrence[];
};

export type ChoreInventoryProjection = {
  member: ChoreMember;
  forMember: ChoreOccurrence[];
  household: ChoreOccurrence[];
  tokenBalance: number | null;
};

export type ChoreAgreementProjection = {
  headline: string | null;
  supporting: string | null;
  tokenBalance: number | null;
  sections: Array<{
    id: 'assigned' | 'quota' | 'benefit' | 'tokens';
    label: string;
    body: string;
  }>;
};

const MEMBERS: ChoreMember[] = [
  { id: 'member-charlie', displayName: 'Charlie', startingTokenBalance: 7, role: 'child' },
  { id: 'member-olive', displayName: 'Olive', startingTokenBalance: 3, role: 'child' },
  { id: 'member-andrew', displayName: 'Andrew', startingTokenBalance: 0, role: 'caregiver' },
];

const EXPECTATIONS: ChoreExpectation[] = [
  {
    memberId: 'member-charlie',
    assigned: { cadence: 'daily' },
    quota: {
      targetCount: 12,
      qualifyingScope: 'open_pool',
      deadlineLabel: 'by Friday',
      sheetLabel: 'By Friday',
      creditedBeforeCurrentOccurrences: 9,
    },
    benefit: {
      label: 'Needed for weekend Screen Time',
      sheetLabel: 'Weekend Screen Time',
      sheetBody: 'Finish both parts for weekend Screen Time.',
    },
  },
  {
    memberId: 'member-olive',
    assigned: { cadence: 'daily' },
    quota: null,
    benefit: null,
  },
];

type ChoreOccurrenceSeed = Omit<
  ChoreOccurrence,
  'reviewedByMemberId' | 'reviewedAtIso' | 'reviewNote' | 'evidencePhotoUri'
> & { evidencePhotoUri?: string | null };

const OCCURRENCES: ChoreOccurrenceSeed[] = [
  {
    activityOccurrenceId: 'activity-occurrence-charlie-feed-scout-2026-08-17',
    activitySeriesId: 'activity-series-feed-scout',
    title: 'Feed Scout and refill the water bowl',
    definitionOfDone: 'Scout has food, and the water bowl is full of fresh water.',
    tokenValue: 2,
    reviewPolicy: 'trusted',
    participation: 'assigned',
    assignedMemberId: 'member-charlie',
    state: 'ready',
    claimedByMemberId: null,
    performedByMemberId: null,
    performedAtIso: null,
  },
  {
    activityOccurrenceId: 'activity-occurrence-charlie-breakfast-dishes-2026-08-17',
    activitySeriesId: 'activity-series-breakfast-dishes',
    title: 'Put away the breakfast dishes',
    definitionOfDone: 'Clean breakfast dishes are back in their cupboards and drawers.',
    tokenValue: 1,
    reviewPolicy: 'trusted',
    participation: 'assigned',
    assignedMemberId: 'member-charlie',
    state: 'completed',
    claimedByMemberId: null,
    performedByMemberId: 'member-charlie',
    performedAtIso: '2026-08-17T13:10:00.000Z',
  },
  {
    activityOccurrenceId: 'activity-occurrence-charlie-entry-shoes-2026-08-17',
    activitySeriesId: 'activity-series-entry-shoes',
    title: 'Tidy the shoes by the front door',
    definitionOfDone: 'Shoes are paired and lined up against the wall, leaving the walkway clear.',
    tokenValue: 1,
    reviewPolicy: 'caregiver_review',
    participation: 'assigned',
    assignedMemberId: 'member-charlie',
    state: 'waiting_approval',
    claimedByMemberId: null,
    performedByMemberId: 'member-charlie',
    performedAtIso: '2026-08-17T13:25:00.000Z',
    evidencePhotoUri: 'fixture://tidy-shoes',
  },
  {
    activityOccurrenceId: 'activity-occurrence-olive-laundry-2026-08-17',
    activitySeriesId: 'activity-series-fold-laundry',
    title: 'Fold and put away the clean towels',
    definitionOfDone: 'The clean towels are folded and put in the linen closet.',
    tokenValue: 2,
    reviewPolicy: 'trusted',
    participation: 'assigned',
    assignedMemberId: 'member-olive',
    state: 'ready',
    claimedByMemberId: null,
    performedByMemberId: null,
    performedAtIso: null,
  },
  {
    activityOccurrenceId: 'activity-occurrence-olive-mail-2026-08-17',
    activitySeriesId: 'activity-series-bring-in-mail',
    title: 'Bring in the mail',
    definitionOfDone: 'The mailbox is empty and the mail is on the kitchen counter.',
    tokenValue: 1,
    reviewPolicy: 'trusted',
    participation: 'assigned',
    assignedMemberId: 'member-olive',
    state: 'completed',
    claimedByMemberId: null,
    performedByMemberId: 'member-olive',
    performedAtIso: '2026-08-17T12:40:00.000Z',
  },
  {
    activityOccurrenceId: 'activity-occurrence-household-recycling-2026-08-17',
    activitySeriesId: 'activity-series-recycling',
    title: 'Take the recycling to the blue bin',
    definitionOfDone: 'Indoor recycling is emptied into the blue bin and the basket is returned.',
    tokenValue: 2,
    reviewPolicy: 'trusted',
    participation: 'open',
    assignedMemberId: null,
    state: 'available',
    claimedByMemberId: null,
    performedByMemberId: null,
    performedAtIso: null,
  },
  {
    activityOccurrenceId: 'activity-occurrence-household-kitchen-counters-2026-08-17',
    activitySeriesId: 'activity-series-kitchen-counters',
    title: 'Wipe the kitchen counters after snack',
    definitionOfDone: 'Crumbs and sticky spots are gone, and the cloth is put away.',
    tokenValue: 1,
    reviewPolicy: 'caregiver_review',
    participation: 'open',
    assignedMemberId: null,
    state: 'available',
    claimedByMemberId: null,
    performedByMemberId: null,
    performedAtIso: null,
  },
  {
    activityOccurrenceId: 'activity-occurrence-household-porch-plants-2026-08-17',
    activitySeriesId: 'activity-series-porch-plants',
    title: 'Water the porch plants',
    definitionOfDone: 'Each porch pot has been watered without leaving standing water.',
    tokenValue: 1,
    reviewPolicy: 'trusted',
    participation: 'open',
    assignedMemberId: null,
    state: 'available',
    claimedByMemberId: null,
    performedByMemberId: null,
    performedAtIso: null,
  },
];

function cloneOccurrence(occurrence: ChoreOccurrenceSeed | ChoreOccurrence): ChoreOccurrence {
  return {
    ...occurrence,
    reviewedByMemberId: 'reviewedByMemberId' in occurrence ? occurrence.reviewedByMemberId : null,
    reviewedAtIso: 'reviewedAtIso' in occurrence ? occurrence.reviewedAtIso : null,
    reviewNote: 'reviewNote' in occurrence ? occurrence.reviewNote : null,
    evidencePhotoUri: 'evidencePhotoUri' in occurrence ? occurrence.evidencePhotoUri ?? null : null,
  };
}

export function createChoreLearningRecord(): ChoreLearningRecord {
  return {
    version: 4,
    activeMemberId: MEMBERS[0].id,
    tokensEnabled: false,
    members: MEMBERS.map((member) => ({ ...member })),
    expectations: EXPECTATIONS.map((expectation) => ({
      ...expectation,
      assigned: expectation.assigned ? { ...expectation.assigned } : null,
      quota: expectation.quota ? { ...expectation.quota } : null,
      benefit: expectation.benefit ? { ...expectation.benefit } : null,
    })),
    occurrences: OCCURRENCES.map(cloneOccurrence),
  };
}

const OCCURRENCE_STATES = new Set<ChoreOccurrenceState>([
  'ready',
  'available',
  'claimed',
  'waiting_approval',
  'needs_another_pass',
  'completed',
]);

function migrateLegacyChoreLearningRecord(value: Record<string, unknown>): ChoreLearningRecord {
  const fallback = createChoreLearningRecord();
  const legacyOccurrences = Array.isArray(value.occurrences) ? value.occurrences : [];
  const occurrences = fallback.occurrences.map((starter) => {
    const legacy = legacyOccurrences.find((item) => (
      item != null
      && typeof item === 'object'
      && (item as { activityOccurrenceId?: unknown }).activityOccurrenceId === starter.activityOccurrenceId
    )) as Partial<ChoreOccurrence> | undefined;
    if (!legacy || !legacy.state || !OCCURRENCE_STATES.has(legacy.state)) return starter;
    return {
      ...starter,
      state: legacy.state,
      claimedByMemberId: typeof legacy.claimedByMemberId === 'string' ? legacy.claimedByMemberId : null,
      performedByMemberId: typeof legacy.performedByMemberId === 'string' ? legacy.performedByMemberId : null,
      performedAtIso: typeof legacy.performedAtIso === 'string' ? legacy.performedAtIso : null,
      reviewedByMemberId: typeof legacy.reviewedByMemberId === 'string' ? legacy.reviewedByMemberId : null,
      reviewedAtIso: typeof legacy.reviewedAtIso === 'string' ? legacy.reviewedAtIso : null,
      reviewNote: typeof legacy.reviewNote === 'string' ? legacy.reviewNote : null,
      evidencePhotoUri: typeof legacy.evidencePhotoUri === 'string'
        ? legacy.evidencePhotoUri
        : starter.evidencePhotoUri,
    };
  });
  const legacyActiveMemberId = typeof value.activeMemberId === 'string' ? value.activeMemberId : null;
  return {
    ...fallback,
    activeMemberId: fallback.members.some((member) => member.id === legacyActiveMemberId)
      ? legacyActiveMemberId!
      : fallback.activeMemberId,
    tokensEnabled: typeof value.tokensEnabled === 'boolean' ? value.tokensEnabled : fallback.tokensEnabled,
    occurrences,
  };
}

export function normalizeChoreLearningRecord(value: unknown): ChoreLearningRecord {
  if (!value || typeof value !== 'object') return createChoreLearningRecord();
  if ([1, 2, 3].includes((value as { version?: number }).version ?? -1)) {
    return migrateLegacyChoreLearningRecord(value as Record<string, unknown>);
  }
  const candidate = value as Partial<ChoreLearningRecord>;
  if (candidate.version !== 4 || typeof candidate.tokensEnabled !== 'boolean'
    || !Array.isArray(candidate.members) || !Array.isArray(candidate.expectations)
    || !Array.isArray(candidate.occurrences)) {
    return createChoreLearningRecord();
  }
  const membersValid = candidate.members.length > 0 && candidate.members.every((member) => (
    member != null
    && typeof member.id === 'string'
    && typeof member.displayName === 'string'
    && ['child', 'caregiver'].includes(member.role)
    && Number.isSafeInteger(member.startingTokenBalance)
    && member.startingTokenBalance >= 0
  ));
  const memberIds = new Set(candidate.members.map((member) => member.id));
  const expectationsValid = candidate.expectations.every((expectation) => (
    expectation != null
    && memberIds.has(expectation.memberId)
    && (expectation.assigned === null || expectation.assigned?.cadence === 'daily')
    && (expectation.quota === null || (
      Number.isSafeInteger(expectation.quota?.targetCount)
      && (expectation.quota?.targetCount ?? 0) > 0
      && ['open_pool', 'all_qualifying'].includes(expectation.quota?.qualifyingScope ?? '')
      && typeof expectation.quota?.deadlineLabel === 'string'
      && typeof expectation.quota?.sheetLabel === 'string'
      && Number.isSafeInteger(expectation.quota?.creditedBeforeCurrentOccurrences)
      && (expectation.quota?.creditedBeforeCurrentOccurrences ?? -1) >= 0
    ))
    && (expectation.benefit === null || (
      typeof expectation.benefit?.label === 'string'
      && typeof expectation.benefit?.sheetLabel === 'string'
      && typeof expectation.benefit?.sheetBody === 'string'
    ))
  ));
  const occurrencesValid = candidate.occurrences.every((occurrence) => (
    occurrence != null
    && typeof occurrence.activityOccurrenceId === 'string'
    && typeof occurrence.activitySeriesId === 'string'
    && typeof occurrence.title === 'string'
    && typeof occurrence.definitionOfDone === 'string'
    && [1, 2, 3].includes(occurrence.tokenValue)
    && ['trusted', 'caregiver_review'].includes(occurrence.reviewPolicy)
    && ['assigned', 'open'].includes(occurrence.participation)
    && OCCURRENCE_STATES.has(occurrence.state)
    && (occurrence.assignedMemberId === null || memberIds.has(occurrence.assignedMemberId))
    && (occurrence.claimedByMemberId === null || memberIds.has(occurrence.claimedByMemberId))
    && (occurrence.performedByMemberId === null || memberIds.has(occurrence.performedByMemberId))
    && (occurrence.performedAtIso === null || typeof occurrence.performedAtIso === 'string')
    && (occurrence.reviewedByMemberId === null || memberIds.has(occurrence.reviewedByMemberId))
    && (occurrence.reviewedAtIso === null || typeof occurrence.reviewedAtIso === 'string')
    && (occurrence.reviewNote === null || typeof occurrence.reviewNote === 'string')
    && (occurrence.evidencePhotoUri === null || typeof occurrence.evidencePhotoUri === 'string')
  ));
  if (!membersValid || !expectationsValid || !occurrencesValid || !candidate.activeMemberId
    || !memberIds.has(candidate.activeMemberId)) {
    return createChoreLearningRecord();
  }
  return {
    version: 4,
    activeMemberId: candidate.activeMemberId,
    tokensEnabled: candidate.tokensEnabled,
    members: candidate.members.map((member) => ({ ...member })),
    expectations: candidate.expectations.map((expectation) => ({
      ...expectation,
      assigned: expectation.assigned ? { ...expectation.assigned } : null,
      quota: expectation.quota ? { ...expectation.quota } : null,
      benefit: expectation.benefit ? { ...expectation.benefit } : null,
    })),
    occurrences: candidate.occurrences.map(cloneOccurrence),
  };
}

function tokenBalanceForMember(
  record: ChoreLearningRecord,
  member: ChoreMember,
): number | null {
  if (!record.tokensEnabled) return null;
  return record.occurrences
    .filter((occurrence) => (
      occurrence.state === 'completed' && occurrence.performedByMemberId === member.id
    ))
    .reduce((total, occurrence) => total + occurrence.tokenValue, member.startingTokenBalance);
}

export function projectChoreInventory(
  record: ChoreLearningRecord,
  memberId: string,
): ChoreInventoryProjection {
  const member = record.members.find((candidate) => candidate.id === memberId) ?? record.members[0];
  const forMember = record.occurrences.filter((occurrence) => (
    occurrence.assignedMemberId === member.id
    || occurrence.claimedByMemberId === member.id
    || occurrence.performedByMemberId === member.id
  ));
  return {
    member,
    forMember,
    household: record.occurrences.filter((occurrence) => (
      occurrence.participation === 'open' && occurrence.state === 'available'
    )),
    tokenBalance: tokenBalanceForMember(record, member),
  };
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function projectChoreAgreement(
  record: ChoreLearningRecord,
  memberId: string,
): ChoreAgreementProjection {
  const member = record.members.find((candidate) => candidate.id === memberId) ?? record.members[0];
  if (member.role !== 'child') {
    return { headline: null, supporting: null, tokenBalance: null, sections: [] };
  }

  const expectation = record.expectations.find((candidate) => candidate.memberId === member.id);
  const tokenBalance = tokenBalanceForMember(record, member);
  const sections: ChoreAgreementProjection['sections'] = [];
  const headlineParts: string[] = [];
  const supportingParts: string[] = [];

  const memberOccurrences = record.occurrences.filter((occurrence) => (
    occurrence.assignedMemberId === member.id
    || occurrence.claimedByMemberId === member.id
    || occurrence.performedByMemberId === member.id
  ));
  const pendingCount = memberOccurrences.filter(
    (occurrence) => occurrence.state === 'waiting_approval',
  ).length;

  if (expectation?.assigned) {
    const assignedOccurrences = memberOccurrences.filter((occurrence) => (
      occurrence.participation === 'assigned' && occurrence.assignedMemberId === member.id
    ));
    const remainingCount = assignedOccurrences.filter((occurrence) => (
      occurrence.state === 'ready' || occurrence.state === 'needs_another_pass'
    )).length;
    const assignedComplete = remainingCount === 0 && pendingCount === 0;
    headlineParts.push(
      remainingCount > 0
        ? `${countLabel(remainingCount, 'chore', 'chores')} left today`
        : assignedComplete
          ? 'Daily chores done'
          : 'Daily chores submitted',
    );
    sections.push({ id: 'assigned', label: 'Every day', body: 'Finish your daily chores.' });
  }

  if (expectation?.quota) {
    const qualifyingVisibleCount = memberOccurrences.filter((occurrence) => (
      occurrence.state === 'completed'
      && occurrence.performedByMemberId === member.id
      && (
        expectation.quota?.qualifyingScope === 'all_qualifying'
        || occurrence.participation === 'open'
      )
    )).length;
    const remainingCount = Math.max(
      0,
      expectation.quota.targetCount
        - expectation.quota.creditedBeforeCurrentOccurrences
        - qualifyingVisibleCount,
    );
    headlineParts.push(
      remainingCount === 0
        ? 'Weekly chores done'
        : expectation.quota.qualifyingScope === 'open_pool'
          ? `Choose ${remainingCount} more ${expectation.quota.deadlineLabel}`
          : `${countLabel(remainingCount, 'chore', 'chores')} left ${expectation.quota.deadlineLabel}`,
    );
    sections.push({
      id: 'quota',
      label: expectation.quota.sheetLabel,
      body: expectation.quota.qualifyingScope === 'open_pool'
        ? `Choose ${expectation.quota.targetCount} chores from the family list.`
        : `Finish ${expectation.quota.targetCount} chores that count.`,
    });
  }

  if (headlineParts.length === 2
    && headlineParts[0] === 'Daily chores done'
    && headlineParts[1] === 'Weekly chores done') {
    headlineParts.splice(0, headlineParts.length, 'All chores done for this week');
  }

  if (pendingCount > 0 && expectation) {
    supportingParts.push(`${countLabel(pendingCount, 'waiting', 'waiting')} for approval`);
  }
  if (expectation?.benefit) {
    supportingParts.push(expectation.benefit.label);
    sections.push({
      id: 'benefit',
      label: expectation.benefit.sheetLabel,
      body: expectation.benefit.sheetBody,
    });
  }
  if (tokenBalance != null) {
    sections.push({
      id: 'tokens',
      label: 'Your tokens',
      body: 'Each chore shows how many tokens it earns.',
    });
  }

  return {
    headline: headlineParts.length ? headlineParts.join(' · ') : null,
    supporting: supportingParts.length ? supportingParts.join(' · ') : null,
    tokenBalance,
    sections,
  };
}

function isCaregiver(record: ChoreLearningRecord, memberId: string): boolean {
  return record.members.some((member) => member.id === memberId && member.role === 'caregiver');
}

function isChild(record: ChoreLearningRecord, memberId: string): boolean {
  return record.members.some((member) => member.id === memberId && member.role === 'child');
}

export function setChoreTokensEnabled(
  record: ChoreLearningRecord,
  enabled: boolean,
  caregiverMemberId: string,
): ChoreLearningRecord {
  if (!isCaregiver(record, caregiverMemberId) || record.tokensEnabled === enabled) return record;
  return { ...record, tokensEnabled: enabled };
}

export function projectChoreReviewQueue(
  record: ChoreLearningRecord,
  caregiverMemberId: string,
): ChoreOccurrence[] {
  if (!isCaregiver(record, caregiverMemberId)) return [];
  return record.occurrences.filter((occurrence) => occurrence.state === 'waiting_approval');
}

function updateOccurrence(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  update: (occurrence: ChoreOccurrence) => ChoreOccurrence | null,
): ChoreLearningRecord {
  const index = record.occurrences.findIndex(
    (occurrence) => occurrence.activityOccurrenceId === activityOccurrenceId,
  );
  if (index < 0) return record;
  const nextOccurrence = update(record.occurrences[index]);
  if (!nextOccurrence) return record;
  const occurrences = [...record.occurrences];
  occurrences[index] = nextOccurrence;
  return { ...record, occurrences };
}

export function setChoreEvidencePhoto(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  memberId: string,
  evidencePhotoUri: string | null,
): ChoreLearningRecord {
  if (!isChild(record, memberId)) return record;
  const normalizedUri = typeof evidencePhotoUri === 'string' && evidencePhotoUri.trim()
    ? evidencePhotoUri.trim()
    : null;
  return updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    const belongsToChild = occurrence.assignedMemberId === memberId
      || occurrence.claimedByMemberId === memberId
      || occurrence.performedByMemberId === memberId;
    const canAttach = occurrence.state !== 'available' && occurrence.state !== 'completed';
    if (!belongsToChild || !canAttach || occurrence.evidencePhotoUri === normalizedUri) return null;
    return { ...occurrence, evidencePhotoUri: normalizedUri };
  });
}

export function takeChoreOccurrence(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  memberId: string,
): ChoreLearningRecord {
  if (!isChild(record, memberId)) return record;
  return updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    if (!isChild(record, memberId)) return null;
    if (occurrence.participation !== 'open' || occurrence.state !== 'available') return null;
    return { ...occurrence, state: 'claimed', claimedByMemberId: memberId };
  });
}

export function releaseChoreOccurrence(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  memberId: string,
): ChoreLearningRecord {
  return updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    if (occurrence.state !== 'claimed' || occurrence.claimedByMemberId !== memberId) return null;
    return { ...occurrence, state: 'available', claimedByMemberId: null };
  });
}

export function completeChoreOccurrence(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  memberId: string,
  performedAtIso: string,
): ChoreLearningRecord {
  return updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    const isAssigned = occurrence.state === 'ready' && occurrence.assignedMemberId === memberId;
    const isClaimed = occurrence.state === 'claimed' && occurrence.claimedByMemberId === memberId;
    const isRetry = occurrence.state === 'needs_another_pass'
      && occurrence.performedByMemberId === memberId
      && (occurrence.assignedMemberId === memberId || occurrence.claimedByMemberId === memberId);
    if (!isChild(record, memberId) || (!isAssigned && !isClaimed && !isRetry)) return null;
    return {
      ...occurrence,
      state: occurrence.reviewPolicy === 'caregiver_review' ? 'waiting_approval' : 'completed',
      performedByMemberId: memberId,
      performedAtIso,
      reviewedByMemberId: null,
      reviewedAtIso: null,
      reviewNote: null,
    };
  });
}

export function approveChoreOccurrence(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  caregiverMemberId: string,
  reviewedAtIso: string,
): ChoreLearningRecord {
  if (!isCaregiver(record, caregiverMemberId)) return record;
  return updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    if (occurrence.state !== 'waiting_approval') return null;
    return {
      ...occurrence,
      state: 'completed',
      reviewedByMemberId: caregiverMemberId,
      reviewedAtIso,
      reviewNote: null,
    };
  });
}

export function returnChoreOccurrenceForAnotherPass(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  caregiverMemberId: string,
  reviewedAtIso: string,
  note: string | null,
): ChoreLearningRecord {
  if (!isCaregiver(record, caregiverMemberId)) return record;
  return updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    if (occurrence.state !== 'waiting_approval') return null;
    const reviewNote = note?.trim() || null;
    return {
      ...occurrence,
      state: 'needs_another_pass',
      reviewedByMemberId: caregiverMemberId,
      reviewedAtIso,
      reviewNote,
    };
  });
}
