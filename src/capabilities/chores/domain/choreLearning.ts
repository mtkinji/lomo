export type ChoreMember = {
  id: string;
  displayName: string;
  expectedChoreCount: number;
  role: 'child' | 'caregiver';
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
  version: 3;
  activeMemberId: string;
  tokensEnabled: boolean;
  members: ChoreMember[];
  occurrences: ChoreOccurrence[];
};

export type ChoreInventoryProjection = {
  member: ChoreMember;
  forMember: ChoreOccurrence[];
  household: ChoreOccurrence[];
  progress: {
    completedCount: number;
    expectedCount: number;
  };
  tokenBalance: number | null;
};

const MEMBERS: ChoreMember[] = [
  { id: 'member-charlie', displayName: 'Charlie', expectedChoreCount: 3, role: 'child' },
  { id: 'member-olive', displayName: 'Olive', expectedChoreCount: 2, role: 'child' },
  { id: 'member-andrew', displayName: 'Andrew', expectedChoreCount: 0, role: 'caregiver' },
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
    version: 3,
    activeMemberId: MEMBERS[0].id,
    tokensEnabled: false,
    members: MEMBERS.map((member) => ({ ...member })),
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
  if ([1, 2].includes((value as { version?: number }).version ?? -1)) {
    return migrateLegacyChoreLearningRecord(value as Record<string, unknown>);
  }
  const candidate = value as Partial<ChoreLearningRecord>;
  if (candidate.version !== 3 || typeof candidate.tokensEnabled !== 'boolean'
    || !Array.isArray(candidate.members) || !Array.isArray(candidate.occurrences)) {
    return createChoreLearningRecord();
  }
  const membersValid = candidate.members.length > 0 && candidate.members.every((member) => (
    member != null
    && typeof member.id === 'string'
    && typeof member.displayName === 'string'
    && ['child', 'caregiver'].includes(member.role)
    && Number.isSafeInteger(member.expectedChoreCount)
    && member.expectedChoreCount >= 0
  ));
  const memberIds = new Set(candidate.members.map((member) => member.id));
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
  if (!membersValid || !occurrencesValid || !candidate.activeMemberId
    || !memberIds.has(candidate.activeMemberId)) {
    return createChoreLearningRecord();
  }
  return {
    version: 3,
    activeMemberId: candidate.activeMemberId,
    tokensEnabled: candidate.tokensEnabled,
    members: candidate.members.map((member) => ({ ...member })),
    occurrences: candidate.occurrences.map(cloneOccurrence),
  };
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
  const completed = forMember.filter((occurrence) => occurrence.state === 'completed');

  return {
    member,
    forMember,
    household: record.occurrences.filter((occurrence) => (
      occurrence.participation === 'open' && occurrence.state === 'available'
    )),
    progress: {
      completedCount: completed.length,
      expectedCount: member.expectedChoreCount,
    },
    tokenBalance: record.tokensEnabled
      ? completed.reduce((total, occurrence) => total + occurrence.tokenValue, 0)
      : null,
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
