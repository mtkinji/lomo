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
export type ChorePhotoPolicy = 'optional' | 'required';
export type ChoreCompletionSource = 'direct' | 'earlier_day';
export type ChoreOccurrenceState =
  | 'ready'
  | 'available'
  | 'claimed'
  | 'waiting_approval'
  | 'needs_another_pass'
  | 'missed'
  | 'completed';

export type ChoreOccurrence = {
  activityOccurrenceId: string;
  activitySeriesId: string;
  title: string;
  definitionOfDone: string;
  scheduledDate: string | null;
  repeatRule?: ActivityRepeatRule;
  repeatCustom?: ActivityRepeatCustom;
  repeatBasis?: ActivityRepeatBasis;
  repeatCreatedFromOccurrenceId?: string | null;
  tokenValue: 1 | 2 | 3;
  photoPolicy: ChorePhotoPolicy;
  reviewPolicy: ChoreReviewPolicy;
  participation: 'assigned' | 'open';
  assignedMemberId: string | null;
  state: ChoreOccurrenceState;
  claimedByMemberId: string | null;
  performedByMemberId: string | null;
  performedAtIso: string | null;
  completionSource: ChoreCompletionSource;
  reportedAtIso: string | null;
  reviewedByMemberId: string | null;
  reviewedAtIso: string | null;
  reviewNote: string | null;
  evidencePhotoUri: string | null;
};

export type ChoreSeries = {
  activitySeriesId: string;
  title: string;
  definitionOfDone: string;
  repeatRule?: ActivityRepeatRule;
  repeatCustom?: ActivityRepeatCustom;
  repeatBasis?: ActivityRepeatBasis;
  tokenValue: 1 | 2 | 3;
  photoPolicy: ChorePhotoPolicy;
  reviewPolicy: ChoreReviewPolicy;
  participation: 'assigned' | 'open';
  assignedMemberId: string | null;
};

export type ChoreRewardEvent = {
  id: string;
  kind: 'earn' | 'reserve' | 'settle' | 'cancel' | 'adjust';
  memberId: string;
  actorMemberId: string;
  occurredAtIso: string;
  tokenDelta: number;
  tokenAmount: number | null;
  activityOccurrenceId: string | null;
  payoutId: string | null;
  moneyAmountCents: number | null;
  exchangeRateCentsPerToken: number | null;
  note: string | null;
};

export type ChoreRewardPayout = {
  payoutId: string;
  memberId: string;
  tokenAmount: number;
  moneyAmountCents: number;
  exchangeRateCentsPerToken: number;
  convertedAtIso: string;
  settledAtIso: string | null;
  settledByMemberId: string | null;
  cancelledAtIso: string | null;
};

export type ChoreRewardsProjection = {
  member: ChoreMember;
  availableTokens: number;
  reservedTokens: number;
  totalTokens: number;
  availableMoneyAmountCents: number;
  exchangeRateCentsPerToken: number;
  pendingPayouts: ChoreRewardPayout[];
  payouts: ChoreRewardPayout[];
  events: ChoreRewardEvent[];
};

export type ChoreLearningRecord = {
  version: 13;
  activeMemberId: string;
  tokensEnabled: boolean;
  rewardExchangeRateCentsPerToken: number;
  rewardEvents: ChoreRewardEvent[];
  members: ChoreMember[];
  expectations: ChoreExpectation[];
  series: ChoreSeries[];
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

const DEFAULT_REWARD_EXCHANGE_RATE_CENTS = 50;

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
      label: 'For weekend Screen Time',
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
  'scheduledDate' | 'reviewedByMemberId' | 'reviewedAtIso' | 'reviewNote' | 'evidencePhotoUri' | 'photoPolicy' | 'completionSource' | 'reportedAtIso'
> & { scheduledDate?: string | null; evidencePhotoUri?: string | null; photoPolicy?: ChorePhotoPolicy };

const OCCURRENCES: ChoreOccurrenceSeed[] = [
  {
    activityOccurrenceId: 'activity-occurrence-charlie-feed-scout-2026-08-17',
    activitySeriesId: 'activity-series-feed-scout',
    title: 'Feed Scout and refill the water bowl',
    definitionOfDone: 'Scout has food, and the water bowl is full of fresh water.',
    scheduledDate: '2026-08-18',
    repeatRule: 'daily',
    repeatBasis: 'scheduled',
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
    scheduledDate: '2026-08-18',
    repeatRule: 'weekdays',
    repeatBasis: 'scheduled',
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
    scheduledDate: '2026-08-18',
    repeatRule: 'weekdays',
    repeatBasis: 'scheduled',
    tokenValue: 1,
    photoPolicy: 'required',
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
    scheduledDate: '2026-08-22',
    repeatRule: 'weekly',
    repeatBasis: 'scheduled',
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
    scheduledDate: '2026-08-18',
    repeatRule: 'weekdays',
    repeatBasis: 'scheduled',
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
    activityOccurrenceId: 'activity-occurrence-olive-dishwasher-2026-08-18',
    activitySeriesId: 'activity-series-unload-dishwasher',
    title: 'Unload the dishwasher',
    definitionOfDone: 'The dishwasher is empty, and clean dishes are put in their usual places.',
    scheduledDate: '2026-08-18',
    repeatRule: 'daily',
    repeatBasis: 'scheduled',
    tokenValue: 1,
    reviewPolicy: 'caregiver_review',
    participation: 'assigned',
    assignedMemberId: 'member-olive',
    state: 'waiting_approval',
    claimedByMemberId: null,
    performedByMemberId: 'member-olive',
    performedAtIso: '2026-08-18T13:05:00.000Z',
  },
  {
    activityOccurrenceId: 'activity-occurrence-household-recycling-2026-08-17',
    activitySeriesId: 'activity-series-recycling',
    title: 'Take the recycling to the blue bin',
    definitionOfDone: 'Indoor recycling is emptied into the blue bin and the basket is returned.',
    scheduledDate: '2026-08-20',
    repeatRule: 'weekly',
    repeatBasis: 'scheduled',
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
    scheduledDate: '2026-08-18',
    repeatRule: 'daily',
    repeatBasis: 'scheduled',
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
    scheduledDate: '2026-08-18',
    repeatRule: 'custom',
    repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2, 5] },
    repeatBasis: 'scheduled',
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
    scheduledDate: occurrence.scheduledDate ?? null,
    repeatCustom: occurrence.repeatCustom ? { ...occurrence.repeatCustom } : undefined,
    repeatBasis: occurrence.repeatRule ? occurrence.repeatBasis ?? 'scheduled' : undefined,
    repeatCreatedFromOccurrenceId: occurrence.repeatCreatedFromOccurrenceId ?? null,
    photoPolicy: occurrence.photoPolicy ?? 'optional',
    reviewedByMemberId: 'reviewedByMemberId' in occurrence ? occurrence.reviewedByMemberId : null,
    reviewedAtIso: 'reviewedAtIso' in occurrence ? occurrence.reviewedAtIso : null,
    reviewNote: 'reviewNote' in occurrence ? occurrence.reviewNote : null,
    evidencePhotoUri: 'evidencePhotoUri' in occurrence ? occurrence.evidencePhotoUri ?? null : null,
    completionSource: 'completionSource' in occurrence && occurrence.completionSource === 'earlier_day'
      ? 'earlier_day'
      : 'direct',
    reportedAtIso: 'reportedAtIso' in occurrence && typeof occurrence.reportedAtIso === 'string'
      ? occurrence.reportedAtIso
      : null,
  };
}

function seriesFromOccurrences(occurrences: ChoreOccurrence[]): ChoreSeries[] {
  const bySeries = new Map<string, ChoreSeries>();
  occurrences.forEach((occurrence) => {
    bySeries.set(occurrence.activitySeriesId, {
      activitySeriesId: occurrence.activitySeriesId,
      title: occurrence.title,
      definitionOfDone: occurrence.definitionOfDone,
      repeatRule: occurrence.repeatRule,
      repeatCustom: occurrence.repeatCustom ? { ...occurrence.repeatCustom } : undefined,
      repeatBasis: occurrence.repeatRule ? occurrence.repeatBasis ?? 'scheduled' : undefined,
      tokenValue: occurrence.tokenValue,
      photoPolicy: occurrence.photoPolicy,
      reviewPolicy: occurrence.reviewPolicy,
      participation: occurrence.participation,
      assignedMemberId: occurrence.assignedMemberId,
    });
  });
  return Array.from(bySeries.values());
}

function cloneSeries(series: ChoreSeries): ChoreSeries {
  return {
    ...series,
    repeatCustom: series.repeatCustom ? { ...series.repeatCustom } : undefined,
  };
}

export function createChoreLearningRecord(): ChoreLearningRecord {
  const occurrences = OCCURRENCES.map(cloneOccurrence);
  const members = MEMBERS.map((member) => ({ ...member }));
  return {
    version: 13,
    activeMemberId: MEMBERS[0].id,
    tokensEnabled: false,
    rewardExchangeRateCentsPerToken: DEFAULT_REWARD_EXCHANGE_RATE_CENTS,
    rewardEvents: buildOpeningRewardEvents(members, occurrences),
    members,
    expectations: EXPECTATIONS.map((expectation) => ({
      ...expectation,
      assigned: expectation.assigned ? { ...expectation.assigned } : null,
      quota: expectation.quota ? { ...expectation.quota } : null,
      benefit: expectation.benefit ? { ...expectation.benefit } : null,
    })),
    series: seriesFromOccurrences(occurrences),
    occurrences,
  };
}

function buildOpeningRewardEvents(
  members: ChoreMember[],
  occurrences: ChoreOccurrence[],
): ChoreRewardEvent[] {
  const opening = members
    .filter((member) => member.startingTokenBalance > 0)
    .map((member): ChoreRewardEvent => ({
      id: `reward-opening-${member.id}`,
      kind: 'adjust',
      memberId: member.id,
      actorMemberId: member.id,
      occurredAtIso: '2026-08-17T00:00:00.000Z',
      tokenDelta: member.startingTokenBalance,
      tokenAmount: null,
      activityOccurrenceId: null,
      payoutId: null,
      moneyAmountCents: null,
      exchangeRateCentsPerToken: null,
      note: 'Opening balance',
    }));
  const earned = occurrences
    .filter((occurrence) => occurrence.state === 'completed' && occurrence.performedByMemberId)
    .map((occurrence): ChoreRewardEvent => ({
      id: `reward-earn-${occurrence.activityOccurrenceId}-opening`,
      kind: 'earn',
      memberId: occurrence.performedByMemberId!,
      actorMemberId: occurrence.performedByMemberId!,
      occurredAtIso: occurrence.performedAtIso ?? '2026-08-17T00:00:00.000Z',
      tokenDelta: occurrence.tokenValue,
      tokenAmount: null,
      activityOccurrenceId: occurrence.activityOccurrenceId,
      payoutId: null,
      moneyAmountCents: null,
      exchangeRateCentsPerToken: null,
      note: occurrence.title,
    }));
  return [...opening, ...earned];
}

const OCCURRENCE_STATES = new Set<ChoreOccurrenceState>([
  'ready',
  'available',
  'claimed',
  'waiting_approval',
  'needs_another_pass',
  'missed',
  'completed',
]);

function hasValidRepeatDetails(value: Pick<ChoreOccurrence, 'repeatRule' | 'repeatCustom'>): boolean {
  if (value.repeatRule !== 'custom') return value.repeatCustom === undefined;
  const custom = value.repeatCustom;
  if (!custom || !Number.isSafeInteger(custom.interval) || custom.interval < 1) return false;
  if (!['days', 'weeks', 'months', 'years'].includes(custom.cadence)) return false;
  if (custom.cadence !== 'weeks') return true;
  return Array.isArray(custom.weekdays)
    && custom.weekdays.length > 0
    && custom.weekdays.every((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6);
}

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
  if ((value as { version?: number }).version === 4) {
    const legacy = value as Record<string, unknown> & {
      version: 4;
      occurrences?: Array<Record<string, unknown>>;
    };
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 5,
      occurrences: Array.isArray(legacy.occurrences)
        ? legacy.occurrences.map((occurrence) => ({ ...occurrence, availability: 'as_needed' }))
        : legacy.occurrences,
    });
  }
  if ((value as { version?: number }).version === 5) {
    const legacy = value as Record<string, unknown> & { version: 5; occurrences?: ChoreOccurrence[] };
    const starter = createChoreLearningRecord();
    const sampleReview = starter.occurrences.find(
      (occurrence) => occurrence.activityOccurrenceId
        === 'activity-occurrence-olive-dishwasher-2026-08-18',
    );
    const occurrences = Array.isArray(legacy.occurrences) ? legacy.occurrences : [];
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 6,
      occurrences: sampleReview && !occurrences.some(
        (occurrence) => occurrence.activityOccurrenceId === sampleReview.activityOccurrenceId,
      )
        ? [...occurrences, sampleReview]
        : occurrences,
    });
  }
  if ((value as { version?: number }).version === 6) {
    const legacy = value as Record<string, unknown> & {
      occurrences?: Array<Record<string, unknown> & { availability?: unknown }>;
    };
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 7,
      occurrences: Array.isArray(legacy.occurrences)
        ? legacy.occurrences.map(({ availability, ...occurrence }) => {
          const existingRepeatRule = typeof occurrence.repeatRule === 'string'
            && ['daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom'].includes(occurrence.repeatRule)
            ? occurrence.repeatRule
            : undefined;
          const repeatRule = existingRepeatRule ?? (availability === 'daily'
            || availability === 'weekdays'
            || availability === 'weekly'
            ? availability
            : undefined);
          return {
            ...occurrence,
            scheduledDate: typeof occurrence.scheduledDate === 'string'
              ? occurrence.scheduledDate
              : repeatRule
                ? '2026-08-18'
                : null,
            repeatRule,
            repeatBasis: repeatRule ? 'scheduled' : undefined,
            repeatCreatedFromOccurrenceId: null,
          };
        })
        : legacy.occurrences,
    });
  }
  if ((value as { version?: number }).version === 7) {
    const legacy = value as Record<string, unknown> & { occurrences?: ChoreOccurrence[] };
    const starterBySeries = new Map(
      createChoreLearningRecord().occurrences.map((occurrence) => [occurrence.activitySeriesId, occurrence]),
    );
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 8,
      occurrences: Array.isArray(legacy.occurrences)
        ? legacy.occurrences.map((occurrence) => {
          if (occurrence.repeatRule) return occurrence;
          const starter = starterBySeries.get(occurrence.activitySeriesId);
          if (!starter?.repeatRule) return occurrence;
          return {
            ...occurrence,
            scheduledDate: starter.scheduledDate,
            repeatRule: starter.repeatRule,
            repeatCustom: starter.repeatCustom ? { ...starter.repeatCustom } : undefined,
            repeatBasis: starter.repeatBasis ?? 'scheduled',
          };
        })
        : legacy.occurrences,
    });
  }
  if ((value as { version?: number }).version === 8) {
    const legacy = value as Record<string, unknown> & { occurrences?: ChoreOccurrence[] };
    const occurrences = Array.isArray(legacy.occurrences) ? legacy.occurrences : [];
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 9,
      series: seriesFromOccurrences(occurrences.map(cloneOccurrence)),
    });
  }
  if ((value as { version?: number }).version === 9) {
    const legacy = value as Record<string, unknown> & {
      occurrences?: Array<ChoreOccurrence & { photoPolicy?: ChorePhotoPolicy }>;
      series?: Array<ChoreSeries & { photoPolicy?: ChorePhotoPolicy }>;
    };
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 10,
      occurrences: Array.isArray(legacy.occurrences)
        ? legacy.occurrences.map((occurrence) => ({ ...occurrence, photoPolicy: occurrence.photoPolicy ?? 'optional' }))
        : legacy.occurrences,
      series: Array.isArray(legacy.series)
        ? legacy.series.map((series) => ({ ...series, photoPolicy: series.photoPolicy ?? 'optional' }))
        : legacy.series,
    });
  }
  if ((value as { version?: number }).version === 10) {
    return normalizeChoreLearningRecord({
      ...(value as Record<string, unknown>),
      version: 11,
    });
  }
  if ((value as { version?: number }).version === 11) {
    const legacy = value as Record<string, unknown> & { occurrences?: Array<Record<string, unknown>> };
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 12,
      occurrences: Array.isArray(legacy.occurrences)
        ? legacy.occurrences.map((occurrence) => ({
          ...occurrence,
          completionSource: 'direct',
          reportedAtIso: null,
        }))
        : legacy.occurrences,
    });
  }
  if ((value as { version?: number }).version === 12) {
    const legacy = value as Record<string, unknown> & {
      members?: ChoreMember[];
      occurrences?: ChoreOccurrence[];
    };
    const members = Array.isArray(legacy.members) ? legacy.members : MEMBERS;
    const occurrences = Array.isArray(legacy.occurrences)
      ? legacy.occurrences.map(cloneOccurrence)
      : OCCURRENCES.map(cloneOccurrence);
    return normalizeChoreLearningRecord({
      ...legacy,
      version: 13,
      rewardExchangeRateCentsPerToken: DEFAULT_REWARD_EXCHANGE_RATE_CENTS,
      rewardEvents: buildOpeningRewardEvents(members, occurrences),
    });
  }
  const candidate = value as Partial<ChoreLearningRecord>;
  if (candidate.version !== 13 || typeof candidate.tokensEnabled !== 'boolean'
    || !Number.isSafeInteger(candidate.rewardExchangeRateCentsPerToken)
    || (candidate.rewardExchangeRateCentsPerToken ?? 0) <= 0
    || !Array.isArray(candidate.rewardEvents)
    || !Array.isArray(candidate.members) || !Array.isArray(candidate.expectations)
    || !Array.isArray(candidate.series) || !Array.isArray(candidate.occurrences)) {
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
  const rewardEventsValid = candidate.rewardEvents.every((event) => (
    event != null
    && typeof event.id === 'string'
    && ['earn', 'reserve', 'settle', 'cancel', 'adjust'].includes(event.kind)
    && memberIds.has(event.memberId)
    && memberIds.has(event.actorMemberId)
    && typeof event.occurredAtIso === 'string'
    && Number.isSafeInteger(event.tokenDelta)
    && (event.tokenAmount === null || (Number.isSafeInteger(event.tokenAmount) && event.tokenAmount > 0))
    && (event.activityOccurrenceId === null || typeof event.activityOccurrenceId === 'string')
    && (event.payoutId === null || typeof event.payoutId === 'string')
    && (event.moneyAmountCents === null || (Number.isSafeInteger(event.moneyAmountCents) && event.moneyAmountCents >= 0))
    && (event.exchangeRateCentsPerToken === null
      || (Number.isSafeInteger(event.exchangeRateCentsPerToken) && event.exchangeRateCentsPerToken > 0))
    && (event.note === null || typeof event.note === 'string')
  ));
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
    && (occurrence.scheduledDate === null || typeof occurrence.scheduledDate === 'string')
    && (occurrence.repeatRule === undefined
      || ['daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom'].includes(occurrence.repeatRule))
    && (occurrence.repeatBasis === undefined
      || ['scheduled', 'after_completion'].includes(occurrence.repeatBasis))
    && hasValidRepeatDetails(occurrence)
    && (occurrence.repeatCreatedFromOccurrenceId === undefined
      || occurrence.repeatCreatedFromOccurrenceId === null
      || typeof occurrence.repeatCreatedFromOccurrenceId === 'string')
    && [1, 2, 3].includes(occurrence.tokenValue)
    && ['optional', 'required'].includes(occurrence.photoPolicy)
    && ['trusted', 'caregiver_review'].includes(occurrence.reviewPolicy)
    && ['assigned', 'open'].includes(occurrence.participation)
    && OCCURRENCE_STATES.has(occurrence.state)
    && (occurrence.assignedMemberId === null || memberIds.has(occurrence.assignedMemberId))
    && (occurrence.claimedByMemberId === null || memberIds.has(occurrence.claimedByMemberId))
    && (occurrence.performedByMemberId === null || memberIds.has(occurrence.performedByMemberId))
    && (occurrence.performedAtIso === null || typeof occurrence.performedAtIso === 'string')
    && ['direct', 'earlier_day'].includes(occurrence.completionSource)
    && (occurrence.reportedAtIso === null || typeof occurrence.reportedAtIso === 'string')
    && (occurrence.reviewedByMemberId === null || memberIds.has(occurrence.reviewedByMemberId))
    && (occurrence.reviewedAtIso === null || typeof occurrence.reviewedAtIso === 'string')
    && (occurrence.reviewNote === null || typeof occurrence.reviewNote === 'string')
    && (occurrence.evidencePhotoUri === null || typeof occurrence.evidencePhotoUri === 'string')
  ));
  const seriesValid = candidate.series.every((series) => (
    series != null
    && typeof series.activitySeriesId === 'string'
    && typeof series.title === 'string'
    && typeof series.definitionOfDone === 'string'
    && (series.repeatRule === undefined
      || ['daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom'].includes(series.repeatRule))
    && (series.repeatBasis === undefined
      || ['scheduled', 'after_completion'].includes(series.repeatBasis))
    && hasValidRepeatDetails(series)
    && [1, 2, 3].includes(series.tokenValue)
    && ['optional', 'required'].includes(series.photoPolicy)
    && ['trusted', 'caregiver_review'].includes(series.reviewPolicy)
    && ['assigned', 'open'].includes(series.participation)
    && (series.assignedMemberId === null || memberIds.has(series.assignedMemberId))
  ));
  if (!membersValid || !rewardEventsValid || !expectationsValid || !seriesValid || !occurrencesValid || !candidate.activeMemberId
    || !memberIds.has(candidate.activeMemberId)) {
    return createChoreLearningRecord();
  }
  return {
    version: 13,
    activeMemberId: candidate.activeMemberId,
    tokensEnabled: candidate.tokensEnabled,
    rewardExchangeRateCentsPerToken: candidate.rewardExchangeRateCentsPerToken!,
    rewardEvents: candidate.rewardEvents.map((event) => ({ ...event })),
    members: candidate.members.map((member) => ({ ...member })),
    expectations: candidate.expectations.map((expectation) => ({
      ...expectation,
      assigned: expectation.assigned ? { ...expectation.assigned } : null,
      quota: expectation.quota ? { ...expectation.quota } : null,
      benefit: expectation.benefit ? { ...expectation.benefit } : null,
    })),
    series: candidate.series.map(cloneSeries),
    occurrences: candidate.occurrences.map(cloneOccurrence),
  };
}

function tokenBalanceForMember(
  record: ChoreLearningRecord,
  member: ChoreMember,
): number | null {
  if (!record.tokensEnabled) return null;
  return record.rewardEvents
    .filter((event) => event.memberId === member.id)
    .reduce((total, event) => total + event.tokenDelta, 0);
}

function isChoreOccurrenceAvailableToday(occurrence: ChoreOccurrence, now = new Date()): boolean {
  if (!occurrence.repeatCreatedFromOccurrenceId || !occurrence.scheduledDate) return true;
  return occurrence.scheduledDate <= localDateKey(now);
}

function currentVisibleChoreOccurrences(
  record: ChoreLearningRecord,
  now: Date,
): ChoreOccurrence[] {
  const bySeries = new Map<string, ChoreOccurrence>();
  record.occurrences.forEach((occurrence) => {
    if (!isChoreOccurrenceAvailableToday(occurrence, now)
      || occurrence.state === 'missed'
      || occurrence.completionSource === 'earlier_day') return;
    const current = bySeries.get(occurrence.activitySeriesId);
    if (!current || (occurrence.scheduledDate ?? '') >= (current.scheduledDate ?? '')) {
      bySeries.set(occurrence.activitySeriesId, occurrence);
    }
  });
  return Array.from(bySeries.values());
}

export function projectChoreInventory(
  record: ChoreLearningRecord,
  memberId: string,
  now = new Date(),
): ChoreInventoryProjection {
  const member = record.members.find((candidate) => candidate.id === memberId) ?? record.members[0];
  const currentOccurrences = currentVisibleChoreOccurrences(record, now);
  const forMember = currentOccurrences.filter((occurrence) => (
    occurrence.assignedMemberId === member.id
      || occurrence.claimedByMemberId === member.id
      || occurrence.performedByMemberId === member.id
  ));
  return {
    member,
    forMember,
    household: currentOccurrences.filter((occurrence) => (
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
  now = new Date(),
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
  let assignedRequirementMet = expectation?.assigned == null;
  let quotaRequirementMet = expectation?.quota == null;

  const memberOccurrences = record.occurrences.filter((occurrence) => (
    isChoreOccurrenceAvailableToday(occurrence, now)
    && occurrence.state !== 'missed'
    && occurrence.completionSource !== 'earlier_day'
    && (
      occurrence.assignedMemberId === member.id
      || occurrence.claimedByMemberId === member.id
      || occurrence.performedByMemberId === member.id
    )
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
    const assignedPendingCount = assignedOccurrences.filter(
      (occurrence) => occurrence.state === 'waiting_approval',
    ).length;
    const assignedComplete = remainingCount === 0 && assignedPendingCount === 0;
    assignedRequirementMet = assignedComplete;
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
    const weekStart = startOfLocalWeekKey(now);
    const today = localDateKey(now);
    const qualifyingVisibleCount = record.occurrences.filter((occurrence) => (
      occurrence.state === 'completed'
      && occurrence.performedByMemberId === member.id
      && occurrence.scheduledDate != null
      && occurrence.scheduledDate >= weekStart
      && occurrence.scheduledDate <= today
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
    quotaRequirementMet = remainingCount === 0;
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

  const hasWorkRequirement = Boolean(expectation?.assigned || expectation?.quota);
  const agreementMet = hasWorkRequirement && assignedRequirementMet && quotaRequirementMet;
  if (agreementMet) headlineParts.splice(0, headlineParts.length, "You're caught up");

  if (pendingCount > 0 && expectation) {
    supportingParts.push(`${countLabel(pendingCount, 'waiting', 'waiting')} for approval`);
  }
  if (expectation?.benefit) {
    const benefitName = `${expectation.benefit.sheetLabel.charAt(0).toLowerCase()}${expectation.benefit.sheetLabel.slice(1)}`;
    supportingParts.push(
      agreementMet
        ? `Chore requirement met for ${benefitName}`
        : `For ${benefitName}`,
    );
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

export function setChoreRewardExchangeRate(
  record: ChoreLearningRecord,
  exchangeRateCentsPerToken: number,
  caregiverMemberId: string,
): ChoreLearningRecord {
  if (!isCaregiver(record, caregiverMemberId)
    || !Number.isSafeInteger(exchangeRateCentsPerToken)
    || exchangeRateCentsPerToken <= 0
    || exchangeRateCentsPerToken === record.rewardExchangeRateCentsPerToken) return record;
  return {
    ...record,
    rewardExchangeRateCentsPerToken: exchangeRateCentsPerToken,
  };
}

export function projectChoreRewards(
  record: ChoreLearningRecord,
  memberId: string,
): ChoreRewardsProjection {
  const member = record.members.find((candidate) => candidate.id === memberId) ?? record.members[0];
  const events = record.rewardEvents
    .filter((event) => event.memberId === member.id)
    .sort((left, right) => right.occurredAtIso.localeCompare(left.occurredAtIso));
  const settledByPayout = new Map(
    events
      .filter((event) => event.kind === 'settle' && event.payoutId)
      .map((event) => [event.payoutId!, event]),
  );
  const cancelledByPayout = new Map(
    events
      .filter((event) => event.kind === 'cancel' && event.payoutId)
      .map((event) => [event.payoutId!, event]),
  );
  const payouts = events
    .filter((event) => event.kind === 'reserve' && event.payoutId)
    .map((event): ChoreRewardPayout => {
      const settlement = settledByPayout.get(event.payoutId!);
      const cancellation = cancelledByPayout.get(event.payoutId!);
      return {
        payoutId: event.payoutId!,
        memberId: event.memberId,
        tokenAmount: event.tokenAmount ?? 0,
        moneyAmountCents: event.moneyAmountCents ?? 0,
        exchangeRateCentsPerToken: event.exchangeRateCentsPerToken
          ?? record.rewardExchangeRateCentsPerToken,
        convertedAtIso: event.occurredAtIso,
        settledAtIso: settlement?.occurredAtIso ?? null,
        settledByMemberId: settlement?.actorMemberId ?? null,
        cancelledAtIso: cancellation?.occurredAtIso ?? null,
      };
    });
  const totalTokens = events.reduce((total, event) => total + event.tokenDelta, 0);
  const reservedTokens = payouts
    .filter((payout) => payout.settledAtIso === null && payout.cancelledAtIso === null)
    .reduce((total, payout) => total + payout.tokenAmount, 0);
  const availableTokens = totalTokens - reservedTokens;
  return {
    member,
    availableTokens,
    reservedTokens,
    totalTokens,
    availableMoneyAmountCents: availableTokens * record.rewardExchangeRateCentsPerToken,
    exchangeRateCentsPerToken: record.rewardExchangeRateCentsPerToken,
    pendingPayouts: payouts.filter((payout) => (
      payout.settledAtIso === null && payout.cancelledAtIso === null
    )),
    payouts,
    events,
  };
}

function appendChoreRewardEarn(
  record: ChoreLearningRecord,
  occurrence: ChoreOccurrence,
  occurredAtIso: string,
): ChoreLearningRecord {
  if (!occurrence.performedByMemberId) return record;
  const id = `reward-earn-${occurrence.activityOccurrenceId}-${occurredAtIso}`;
  if (record.rewardEvents.some((event) => event.id === id)) return record;
  return {
    ...record,
    rewardEvents: [...record.rewardEvents, {
      id,
      kind: 'earn',
      memberId: occurrence.performedByMemberId,
      actorMemberId: occurrence.performedByMemberId,
      occurredAtIso,
      tokenDelta: occurrence.tokenValue,
      tokenAmount: null,
      activityOccurrenceId: occurrence.activityOccurrenceId,
      payoutId: null,
      moneyAmountCents: null,
      exchangeRateCentsPerToken: null,
      note: occurrence.title,
    }],
  };
}

function appendChoreRewardAdjustment(
  record: ChoreLearningRecord,
  occurrence: ChoreOccurrence,
  memberId: string,
): ChoreLearningRecord {
  const occurredAtIso = new Date().toISOString();
  return {
    ...record,
    rewardEvents: [...record.rewardEvents, {
      id: `reward-adjust-reopen-${occurrence.activityOccurrenceId}-${occurredAtIso}`,
      kind: 'adjust',
      memberId,
      actorMemberId: memberId,
      occurredAtIso,
      tokenDelta: -occurrence.tokenValue,
      tokenAmount: null,
      activityOccurrenceId: occurrence.activityOccurrenceId,
      payoutId: null,
      moneyAmountCents: null,
      exchangeRateCentsPerToken: null,
      note: `Reopened ${occurrence.title}`,
    }],
  };
}

export function requestChoreTokenRedemption(
  record: ChoreLearningRecord,
  memberId: string,
  tokenAmount: number,
  convertedAtIso: string,
  idSeed: string,
): ChoreLearningRecord {
  if (!record.tokensEnabled || !isChild(record, memberId)
    || !Number.isSafeInteger(tokenAmount) || tokenAmount <= 0
    || !Number.isFinite(new Date(convertedAtIso).getTime()) || !idSeed.trim()) return record;
  const rewards = projectChoreRewards(record, memberId);
  if (tokenAmount > rewards.availableTokens) return record;
  const payoutId = `payout-${idSeed.trim()}`;
  if (record.rewardEvents.some((event) => event.payoutId === payoutId)) return record;
  const rate = record.rewardExchangeRateCentsPerToken;
  return {
    ...record,
    rewardEvents: [...record.rewardEvents, {
      id: `reward-reserve-${idSeed.trim()}`,
      kind: 'reserve',
      memberId,
      actorMemberId: memberId,
      occurredAtIso: convertedAtIso,
      tokenDelta: 0,
      tokenAmount,
      activityOccurrenceId: null,
      payoutId,
      moneyAmountCents: tokenAmount * rate,
      exchangeRateCentsPerToken: rate,
      note: null,
    }],
  };
}

export function cancelChoreTokenRedemption(
  record: ChoreLearningRecord,
  memberId: string,
  payoutId: string,
  cancelledAtIso: string,
): ChoreLearningRecord {
  if (!isChild(record, memberId) || !Number.isFinite(new Date(cancelledAtIso).getTime())) {
    return record;
  }
  const reservation = record.rewardEvents.find(
    (event) => event.kind === 'reserve' && event.payoutId === payoutId && event.memberId === memberId,
  );
  if (!reservation || record.rewardEvents.some(
    (event) => (event.kind === 'settle' || event.kind === 'cancel') && event.payoutId === payoutId,
  )) return record;
  return {
    ...record,
    rewardEvents: [...record.rewardEvents, {
      id: `reward-cancel-${payoutId}`,
      kind: 'cancel',
      memberId,
      actorMemberId: memberId,
      occurredAtIso: cancelledAtIso,
      tokenDelta: 0,
      tokenAmount: reservation.tokenAmount,
      activityOccurrenceId: null,
      payoutId,
      moneyAmountCents: reservation.moneyAmountCents,
      exchangeRateCentsPerToken: reservation.exchangeRateCentsPerToken,
      note: 'Redemption cancelled',
    }],
  };
}

export function settleChoreRewardPayout(
  record: ChoreLearningRecord,
  caregiverMemberId: string,
  payoutId: string,
  settledAtIso: string,
): ChoreLearningRecord {
  return settleChoreRewardPayouts(record, caregiverMemberId, [payoutId], settledAtIso);
}

export function settleChoreRewardPayouts(
  record: ChoreLearningRecord,
  caregiverMemberId: string,
  payoutIds: string[],
  settledAtIso: string,
): ChoreLearningRecord {
  if (!isCaregiver(record, caregiverMemberId)
    || !Number.isFinite(new Date(settledAtIso).getTime())
    || payoutIds.length === 0) return record;
  const uniquePayoutIds = [...new Set(payoutIds)];
  if (uniquePayoutIds.length !== payoutIds.length) return record;
  const reservations = uniquePayoutIds.map((payoutId) => record.rewardEvents.find(
    (event) => event.kind === 'reserve' && event.payoutId === payoutId,
  ));
  if (reservations.some((reservation) => !reservation)) return record;
  const memberIds = new Set(reservations.map((reservation) => reservation!.memberId));
  if (memberIds.size !== 1 || uniquePayoutIds.some((payoutId) => record.rewardEvents.some(
    (event) => (event.kind === 'settle' || event.kind === 'cancel') && event.payoutId === payoutId,
  ))) return record;
  return {
    ...record,
    rewardEvents: [...record.rewardEvents, ...reservations.map((reservation) => ({
      id: `reward-settle-${reservation!.payoutId}`,
      kind: 'settle' as const,
      memberId: reservation!.memberId,
      actorMemberId: caregiverMemberId,
      occurredAtIso: settledAtIso,
      tokenDelta: -(reservation!.tokenAmount ?? 0),
      tokenAmount: reservation!.tokenAmount,
      activityOccurrenceId: null,
      payoutId: reservation!.payoutId,
      moneyAmountCents: reservation!.moneyAmountCents,
      exchangeRateCentsPerToken: reservation!.exchangeRateCentsPerToken,
      note: 'Paid outside Kwilt',
    }))],
  };
}

function startOfLocalWeekKey(now: Date): string {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return localDateKey(start);
}

export function projectChoreCorrectionCandidates(
  record: ChoreLearningRecord,
  currentOccurrenceId: string,
  memberId: string,
  now = new Date(),
): ChoreOccurrence[] {
  if (!isChild(record, memberId) || !Number.isFinite(now.getTime())) return [];
  const current = record.occurrences.find(
    (occurrence) => occurrence.activityOccurrenceId === currentOccurrenceId,
  );
  if (!current
    || current.participation !== 'assigned'
    || current.assignedMemberId !== memberId
    || current.completionSource !== 'direct'
    || current.state === 'missed') return [];
  const today = localDateKey(now);
  const weekStart = startOfLocalWeekKey(now);
  return record.occurrences
    .filter((occurrence) => (
      occurrence.activitySeriesId === current.activitySeriesId
      && occurrence.activityOccurrenceId !== currentOccurrenceId
      && occurrence.participation === 'assigned'
      && occurrence.assignedMemberId === memberId
      && occurrence.state === 'missed'
      && occurrence.scheduledDate != null
      && occurrence.scheduledDate >= weekStart
      && occurrence.scheduledDate < today
    ))
    .sort((left, right) => (right.scheduledDate ?? '').localeCompare(left.scheduledDate ?? ''))
    .map(cloneOccurrence);
}

export function choreCorrectionEntranceLabel(
  candidates: ChoreOccurrence[],
  now = new Date(),
): string | null {
  if (candidates.length === 0 || !Number.isFinite(now.getTime())) return null;
  if (candidates.length === 1) {
    const yesterday = new Date(now);
    yesterday.setHours(12, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    if (candidates[0].scheduledDate === localDateKey(yesterday)) return 'I did this yesterday';
  }
  return 'I did this on another day';
}

export function requestEarlierChoreCompletions(
  record: ChoreLearningRecord,
  activityOccurrenceIds: string[],
  memberId: string,
  requestedAtIso: string,
): ChoreLearningRecord {
  const requestedAt = new Date(requestedAtIso);
  if (!isChild(record, memberId) || !Number.isFinite(requestedAt.getTime())) return record;
  const requestedIds = new Set(activityOccurrenceIds);
  if (requestedIds.size === 0) return record;
  const today = localDateKey(requestedAt);
  const weekStart = startOfLocalWeekKey(requestedAt);
  let changed = false;
  const occurrences = record.occurrences.map((occurrence) => {
    if (!requestedIds.has(occurrence.activityOccurrenceId)
      || occurrence.state !== 'missed'
      || occurrence.participation !== 'assigned'
      || occurrence.assignedMemberId !== memberId
      || occurrence.scheduledDate == null
      || occurrence.scheduledDate < weekStart
      || occurrence.scheduledDate >= today) return occurrence;
    changed = true;
    return {
      ...occurrence,
      state: 'waiting_approval' as const,
      performedByMemberId: memberId,
      performedAtIso: null,
      completionSource: 'earlier_day' as const,
      reportedAtIso: requestedAtIso,
      reviewedByMemberId: null,
      reviewedAtIso: null,
      reviewNote: null,
    };
  });
  return changed ? { ...record, occurrences } : record;
}

export function leaveEarlierChoreCompletionMissed(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  caregiverMemberId: string,
  reviewedAtIso: string,
): ChoreLearningRecord {
  if (!isCaregiver(record, caregiverMemberId) || !Number.isFinite(new Date(reviewedAtIso).getTime())) {
    return record;
  }
  return updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    if (occurrence.state !== 'waiting_approval' || occurrence.completionSource !== 'earlier_day') return null;
    return {
      ...occurrence,
      state: 'missed',
      performedByMemberId: null,
      performedAtIso: null,
      completionSource: 'direct',
      reportedAtIso: null,
      reviewedByMemberId: null,
      reviewedAtIso: null,
      reviewNote: null,
    };
  });
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

export function projectCaregiverChoreInventory(
  record: ChoreLearningRecord,
  caregiverMemberId: string,
): ChoreSeries[] {
  if (!isCaregiver(record, caregiverMemberId)) return [];
  return record.series.map(cloneSeries);
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

function buildChoreOccurrenceFromSeries(
  template: ChoreOccurrence,
  series: ChoreSeries,
  scheduledDate: string,
  repeatCreatedFromOccurrenceId: string,
): ChoreOccurrence {
  const occurrenceStem = series.activitySeriesId.replace(/^activity-series-/, 'activity-occurrence-');
  return {
    ...cloneOccurrence(template),
    title: series.title,
    definitionOfDone: series.definitionOfDone,
    repeatRule: series.repeatRule,
    repeatCustom: series.repeatCustom ? { ...series.repeatCustom } : undefined,
    repeatBasis: series.repeatBasis,
    tokenValue: series.tokenValue,
    photoPolicy: series.photoPolicy,
    reviewPolicy: series.reviewPolicy,
    participation: series.participation,
    assignedMemberId: series.assignedMemberId,
    activityOccurrenceId: `${occurrenceStem}-${scheduledDate}`,
    scheduledDate,
    repeatCreatedFromOccurrenceId,
    state: series.participation === 'assigned' ? 'ready' : 'available',
    claimedByMemberId: null,
    performedByMemberId: null,
    performedAtIso: null,
    completionSource: 'direct',
    reportedAtIso: null,
    reviewedByMemberId: null,
    reviewedAtIso: null,
    reviewNote: null,
    evidencePhotoUri: null,
  };
}

const ACTIONABLE_OCCURRENCE_STATES = new Set<ChoreOccurrenceState>([
  'ready',
  'available',
  'claimed',
  'needs_another_pass',
]);

export function reconcileRecurringChoreOccurrences(
  record: ChoreLearningRecord,
  nowIso: string,
): ChoreLearningRecord {
  const now = new Date(nowIso);
  if (!Number.isFinite(now.getTime())) return record;
  const today = localDateKey(now);
  let occurrences = record.occurrences.map(cloneOccurrence);
  let changed = false;

  for (const series of record.series) {
    if (!series.repeatRule || series.repeatBasis === 'after_completion') continue;
    const seriesOccurrences = occurrences
      .filter((occurrence) => occurrence.activitySeriesId === series.activitySeriesId)
      .sort((left, right) => (left.scheduledDate ?? '').localeCompare(right.scheduledDate ?? ''));
    const template = seriesOccurrences.at(-1);
    if (!template?.scheduledDate) continue;

    occurrences = occurrences.map((occurrence) => {
      if (occurrence.activitySeriesId !== series.activitySeriesId
        || !occurrence.scheduledDate
        || occurrence.scheduledDate >= today
        || !ACTIONABLE_OCCURRENCE_STATES.has(occurrence.state)) {
        return occurrence;
      }
      changed = true;
      return { ...occurrence, state: 'missed' };
    });

    const hasCurrentOrFuture = occurrences.some((occurrence) => (
      occurrence.activitySeriesId === series.activitySeriesId
      && occurrence.scheduledDate != null
      && occurrence.scheduledDate >= today
      && occurrence.state !== 'missed'
    ));
    if (hasCurrentOrFuture) continue;

    const dayBefore = new Date(now);
    dayBefore.setHours(12, 0, 0, 0);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const nextDate = getNextOccurrenceDate({
      activity: {
        repeatRule: series.repeatRule,
        repeatCustom: series.repeatCustom,
        repeatBasis: 'scheduled',
        scheduledDate: template.scheduledDate,
      },
      closedAt: dayBefore,
    });
    if (!nextDate) continue;

    const scheduledDate = localDateKey(nextDate);
    const nextOccurrence = buildChoreOccurrenceFromSeries(
      template,
      series,
      scheduledDate,
      template.activityOccurrenceId,
    );
    if (occurrences.some((occurrence) => (
      occurrence.activityOccurrenceId === nextOccurrence.activityOccurrenceId
    ))) continue;
    occurrences.push(nextOccurrence);
    changed = true;
  }

  return changed ? { ...record, occurrences } : record;
}

function advanceRecurringChore(
  record: ChoreLearningRecord,
  completedOccurrenceId: string,
  completedAtIso: string,
): ChoreLearningRecord {
  const occurrence = record.occurrences.find(
    (candidate) => candidate.activityOccurrenceId === completedOccurrenceId,
  );
  const series = record.series.find((candidate) => candidate.activitySeriesId === occurrence?.activitySeriesId);
  if (!occurrence || !series?.repeatRule || occurrence.state !== 'completed') return record;
  if (record.occurrences.some(
    (candidate) => candidate.repeatCreatedFromOccurrenceId === completedOccurrenceId,
  )) return record;

  const nextDate = getNextOccurrenceDate({
    activity: {
      repeatRule: series.repeatRule,
      repeatCustom: series.repeatCustom,
      repeatBasis: series.repeatBasis,
      scheduledDate: occurrence.scheduledDate,
    },
    closedAt: new Date(completedAtIso),
  });
  if (!nextDate) return record;

  const scheduledDate = localDateKey(nextDate);
  const occurrenceStem = occurrence.activitySeriesId.replace(/^activity-series-/, 'activity-occurrence-');
  const activityOccurrenceId = `${occurrenceStem}-${scheduledDate}`;
  if (record.occurrences.some((candidate) => candidate.activityOccurrenceId === activityOccurrenceId)) {
    return record;
  }

  return {
    ...record,
    occurrences: [
      ...record.occurrences,
      {
        ...cloneOccurrence(occurrence),
        title: series.title,
        definitionOfDone: series.definitionOfDone,
        repeatRule: series.repeatRule,
        repeatCustom: series.repeatCustom ? { ...series.repeatCustom } : undefined,
        repeatBasis: series.repeatBasis,
        tokenValue: series.tokenValue,
        photoPolicy: series.photoPolicy,
        reviewPolicy: series.reviewPolicy,
        participation: series.participation,
        assignedMemberId: series.assignedMemberId,
        activityOccurrenceId,
        scheduledDate,
        repeatCreatedFromOccurrenceId: completedOccurrenceId,
        state: series.participation === 'assigned' ? 'ready' : 'available',
        claimedByMemberId: null,
        performedByMemberId: null,
        performedAtIso: null,
        completionSource: 'direct',
        reportedAtIso: null,
        reviewedByMemberId: null,
        reviewedAtIso: null,
        reviewNote: null,
        evidencePhotoUri: null,
      },
    ],
  };
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
  const updated = updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    const isAssigned = occurrence.state === 'ready' && occurrence.assignedMemberId === memberId;
    const isClaimed = occurrence.state === 'claimed' && occurrence.claimedByMemberId === memberId;
    const isRetry = occurrence.state === 'needs_another_pass'
      && occurrence.performedByMemberId === memberId
      && (occurrence.assignedMemberId === memberId || occurrence.claimedByMemberId === memberId);
    const hasRequiredPhoto = occurrence.photoPolicy !== 'required' || Boolean(occurrence.evidencePhotoUri);
    if (!isChild(record, memberId) || (!isAssigned && !isClaimed && !isRetry) || !hasRequiredPhoto) return null;
    return {
      ...occurrence,
      state: occurrence.reviewPolicy === 'caregiver_review' ? 'waiting_approval' : 'completed',
      performedByMemberId: memberId,
      performedAtIso,
      completionSource: 'direct',
      reportedAtIso: null,
      reviewedByMemberId: null,
      reviewedAtIso: null,
      reviewNote: null,
    };
  });
  if (updated === record) return record;
  const completed = updated.occurrences.find(
    (occurrence) => occurrence.activityOccurrenceId === activityOccurrenceId,
  );
  if (completed?.state !== 'completed') return updated;
  return advanceRecurringChore(
    appendChoreRewardEarn(updated, completed, performedAtIso),
    activityOccurrenceId,
    performedAtIso,
  );
}

export function reopenChoreOccurrence(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  memberId: string,
): ChoreLearningRecord {
  if (!isChild(record, memberId)) return record;
  const completed = record.occurrences.find(
    (occurrence) => occurrence.activityOccurrenceId === activityOccurrenceId,
  );
  const updated = updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    if (occurrence.state !== 'completed' || occurrence.performedByMemberId !== memberId) return null;
    const state: ChoreOccurrenceState = occurrence.participation === 'assigned'
      ? 'ready'
      : 'claimed';
    if (state === 'claimed' && occurrence.claimedByMemberId !== memberId) return null;
    return {
      ...occurrence,
      state,
      performedByMemberId: null,
      performedAtIso: null,
      completionSource: 'direct',
      reportedAtIso: null,
      reviewedByMemberId: null,
      reviewedAtIso: null,
      reviewNote: null,
    };
  });
  return updated !== record && completed
    ? appendChoreRewardAdjustment(updated, completed, memberId)
    : updated;
}

export function approveChoreOccurrence(
  record: ChoreLearningRecord,
  activityOccurrenceId: string,
  caregiverMemberId: string,
  reviewedAtIso: string,
): ChoreLearningRecord {
  if (!isCaregiver(record, caregiverMemberId)) return record;
  const updated = updateOccurrence(record, activityOccurrenceId, (occurrence) => {
    if (occurrence.state !== 'waiting_approval') return null;
    return {
      ...occurrence,
      state: 'completed',
      reviewedByMemberId: caregiverMemberId,
      reviewedAtIso,
      reviewNote: null,
    };
  });
  if (updated === record) return record;
  const approved = updated.occurrences.find(
    (occurrence) => occurrence.activityOccurrenceId === activityOccurrenceId,
  );
  if (!approved) return updated;
  const earned = appendChoreRewardEarn(updated, approved, reviewedAtIso);
  return approved.completionSource === 'earlier_day'
    ? earned
    : advanceRecurringChore(earned, activityOccurrenceId, reviewedAtIso);
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
    if (occurrence.state !== 'waiting_approval' || occurrence.completionSource === 'earlier_day') return null;
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
import { getNextOccurrenceDate, localDateKey } from '../../../domain/activityRecurrence';
import type {
  ActivityRepeatBasis,
  ActivityRepeatCustom,
  ActivityRepeatRule,
} from '../../../domain/types';
