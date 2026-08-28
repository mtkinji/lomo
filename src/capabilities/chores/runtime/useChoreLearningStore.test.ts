import {
  createChoreLearningRecord,
  normalizeChoreLearningRecord,
  projectChoreRewards,
} from '../domain/choreLearning';
import {
  CHORE_LEARNING_AUTHORITY,
  resetChoreLearningStoreForTests,
  useChoreLearningStore,
} from './useChoreLearningStore';

describe('Chores learning store', () => {
  beforeEach(() => resetChoreLearningStoreForTests());

  it('declares itself local-learning-only rather than Household or Chat authority', () => {
    expect(CHORE_LEARNING_AUTHORITY).toBe('local_learning_only');
  });

  it('falls back to the starter record when persisted state is malformed', () => {
    expect(normalizeChoreLearningRecord({ version: 0 })).toEqual(createChoreLearningRecord());
    expect(normalizeChoreLearningRecord({
      ...createChoreLearningRecord(),
      activeMemberId: 'unknown',
    })).toEqual(createChoreLearningRecord());
  });

  it('adds the new sample review request once when migrating the persisted demo', () => {
    const current = createChoreLearningRecord();
    const legacy = {
      ...current,
      version: 5,
      occurrences: current.occurrences.filter(
        (occurrence) => occurrence.activityOccurrenceId
          !== 'activity-occurrence-olive-dishwasher-2026-08-18',
      ),
    };

    const migrated = normalizeChoreLearningRecord(legacy);

    expect(migrated.version).toBe(13);
    expect(migrated.occurrences.filter(
      (occurrence) => occurrence.activityOccurrenceId
        === 'activity-occurrence-olive-dishwasher-2026-08-18',
    )).toEqual([
      expect.objectContaining({
        assignedMemberId: 'member-olive',
        state: 'waiting_approval',
      }),
    ]);
  });

  it('switches only to a known household member', () => {
    const initial = useChoreLearningStore.getState().record;

    useChoreLearningStore.getState().selectMember('member-olive');
    expect(useChoreLearningStore.getState().record.activeMemberId).toBe('member-olive');

    useChoreLearningStore.getState().selectMember('unknown');
    expect(useChoreLearningStore.getState().record.activeMemberId).toBe('member-olive');
    expect(useChoreLearningStore.getState().record).not.toBe(initial);
  });

  it('delegates take, release, completion, and reopening to occurrence transitions', () => {
    const occurrenceId = 'activity-occurrence-household-recycling-2026-08-17';
    const store = useChoreLearningStore.getState();

    store.take(occurrenceId);
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )).toMatchObject({ state: 'claimed', claimedByMemberId: 'member-charlie' });

    useChoreLearningStore.getState().release(occurrenceId);
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )).toMatchObject({ state: 'available', claimedByMemberId: null });

    useChoreLearningStore.getState().complete(
      'activity-occurrence-charlie-feed-scout-2026-08-17',
      '2026-08-17T18:00:00.000Z',
    );
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === 'activity-occurrence-charlie-feed-scout-2026-08-17',
    )).toMatchObject({ state: 'completed', performedByMemberId: 'member-charlie' });

    useChoreLearningStore.getState().reopen(
      'activity-occurrence-charlie-feed-scout-2026-08-17',
    );
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === 'activity-occurrence-charlie-feed-scout-2026-08-17',
    )).toMatchObject({ state: 'ready', performedByMemberId: null, performedAtIso: null });
  });

  it('allows only the active caregiver to change the household token program', () => {
    useChoreLearningStore.getState().setTokensEnabled(true);
    expect(useChoreLearningStore.getState().record.tokensEnabled).toBe(false);

    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().setTokensEnabled(true);
    expect(useChoreLearningStore.getState().record.tokensEnabled).toBe(true);

    useChoreLearningStore.getState().setTokensEnabled(false);
    expect(useChoreLearningStore.getState().record.tokensEnabled).toBe(false);
  });

  it('allows only the active caregiver to change the household token value', () => {
    useChoreLearningStore.getState().setRewardExchangeRate(75);
    expect(useChoreLearningStore.getState().record.rewardExchangeRateCentsPerToken).toBe(50);

    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().setRewardExchangeRate(75);
    expect(useChoreLearningStore.getState().record.rewardExchangeRateCentsPerToken).toBe(75);
  });

  it('sets tokens aside as the active child and settles only as the active caregiver', () => {
    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().setTokensEnabled(true);
    useChoreLearningStore.getState().selectMember('member-charlie');
    useChoreLearningStore.getState().requestRedemption(
      4,
      '2026-08-18T16:00:00.000Z',
      'store-conversion',
    );

    expect(projectChoreRewards(
      useChoreLearningStore.getState().record,
      'member-charlie',
    ).pendingPayouts).toHaveLength(1);

    useChoreLearningStore.getState().settlePayout(
      'payout-store-conversion',
      '2026-08-18T17:00:00.000Z',
    );
    expect(projectChoreRewards(
      useChoreLearningStore.getState().record,
      'member-charlie',
    ).pendingPayouts).toHaveLength(1);

    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().settlePayout(
      'payout-store-conversion',
      '2026-08-18T17:00:00.000Z',
    );
    expect(projectChoreRewards(
      useChoreLearningStore.getState().record,
      'member-charlie',
    ).pendingPayouts).toHaveLength(0);
  });

  it('persists optional photo evidence only for the active child responsible for the chore', () => {
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';

    useChoreLearningStore.getState().setEvidencePhoto(occurrenceId, 'file://scout.jpg');
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )?.evidencePhotoUri).toBe('file://scout.jpg');

    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().setEvidencePhoto(occurrenceId, 'file://caregiver.jpg');
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )?.evidencePhotoUri).toBe('file://scout.jpg');
  });

  it('lets the active caregiver approve or return submitted work', () => {
    const occurrenceId = 'activity-occurrence-charlie-entry-shoes-2026-08-17';

    useChoreLearningStore.getState().approve(
      occurrenceId,
      '2026-08-17T14:00:00.000Z',
    );
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )?.state).toBe('waiting_approval');

    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().requestAnotherPass(
      occurrenceId,
      '2026-08-17T14:00:00.000Z',
      'Please line up the shoes.',
    );
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )).toMatchObject({
      state: 'needs_another_pass',
      reviewedByMemberId: 'member-andrew',
      reviewNote: 'Please line up the shoes.',
    });

    useChoreLearningStore.getState().selectMember('member-charlie');
    useChoreLearningStore.getState().complete(
      occurrenceId,
      '2026-08-17T15:00:00.000Z',
    );
    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().approve(
      occurrenceId,
      '2026-08-17T15:05:00.000Z',
    );
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )).toMatchObject({
      state: 'completed',
      reviewedByMemberId: 'member-andrew',
      reviewedAtIso: '2026-08-17T15:05:00.000Z',
    });
  });

  it('submits several earlier dates as the active child and lets a caregiver leave one missed', () => {
    const current = useChoreLearningStore.getState().record.occurrences.find(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )!;
    useChoreLearningStore.setState((state) => ({
      record: {
        ...state.record,
        occurrences: [
          ...state.record.occurrences,
          { ...current, activityOccurrenceId: 'feed-scout-2026-08-17', scheduledDate: '2026-08-17', state: 'missed' },
          { ...current, activityOccurrenceId: 'feed-scout-2026-08-18', scheduledDate: '2026-08-18', state: 'missed' },
        ],
      },
    }));

    useChoreLearningStore.getState().requestEarlierCompletions(
      ['feed-scout-2026-08-17', 'feed-scout-2026-08-18'],
      '2026-08-20T15:00:00.000Z',
    );
    expect(useChoreLearningStore.getState().record.occurrences.filter(
      (occurrence) => occurrence.completionSource === 'earlier_day',
    )).toHaveLength(2);

    useChoreLearningStore.getState().selectMember('member-andrew');
    useChoreLearningStore.getState().leaveEarlierCompletionMissed(
      'feed-scout-2026-08-17',
      '2026-08-20T16:00:00.000Z',
    );
    expect(useChoreLearningStore.getState().record.occurrences.find(
      (occurrence) => occurrence.activityOccurrenceId === 'feed-scout-2026-08-17',
    )).toMatchObject({ state: 'missed', completionSource: 'direct' });
  });

  it('does not let the caregiver take child work from the shared pool', () => {
    const occurrenceId = 'activity-occurrence-household-recycling-2026-08-17';
    useChoreLearningStore.getState().selectMember('member-andrew');

    useChoreLearningStore.getState().take(occurrenceId);

    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )).toMatchObject({ state: 'available', claimedByMemberId: null });
  });

  it('adds a caregiver-authored draft to inventory without an earlier quick-add commit', () => {
    const store = useChoreLearningStore.getState();
    store.selectMember('member-andrew');

    useChoreLearningStore.getState().addChore({
      title: 'Sweep the porch',
      assignedMemberId: null,
      repeatRule: 'weekly',
      repeatCustom: undefined,
      repeatBasis: 'scheduled',
      definitionOfDone: 'The porch is clear of dirt and leaves.',
      photoPolicy: 'optional',
      reviewPolicy: 'trusted',
      tokenValue: 1,
    }, '2026-08-18T14:00:00.000Z', 'sweep-porch');

    expect(useChoreLearningStore.getState().record.occurrences.at(-1)).toMatchObject({
      activityOccurrenceId: 'activity-occurrence-sweep-porch',
      title: 'Sweep the porch',
      repeatRule: 'weekly',
      scheduledDate: '2026-08-18',
      state: 'available',
    });
  });

  it('resets the versioned learning record without retaining mutations', () => {
    useChoreLearningStore.getState().selectMember('member-olive');
    useChoreLearningStore.getState().reset();

    expect(useChoreLearningStore.getState().record).toEqual(createChoreLearningRecord());
  });
});
