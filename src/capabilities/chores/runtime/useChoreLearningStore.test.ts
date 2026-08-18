import { createChoreLearningRecord, normalizeChoreLearningRecord } from '../domain/choreLearning';
import {
  resetChoreLearningStoreForTests,
  useChoreLearningStore,
} from './useChoreLearningStore';

describe('Chores learning store', () => {
  beforeEach(() => resetChoreLearningStoreForTests());

  it('falls back to the starter record when persisted state is malformed', () => {
    expect(normalizeChoreLearningRecord({ version: 0 })).toEqual(createChoreLearningRecord());
    expect(normalizeChoreLearningRecord({
      ...createChoreLearningRecord(),
      activeMemberId: 'unknown',
    })).toEqual(createChoreLearningRecord());
  });

  it('switches only to a known household member', () => {
    const initial = useChoreLearningStore.getState().record;

    useChoreLearningStore.getState().selectMember('member-olive');
    expect(useChoreLearningStore.getState().record.activeMemberId).toBe('member-olive');

    useChoreLearningStore.getState().selectMember('unknown');
    expect(useChoreLearningStore.getState().record.activeMemberId).toBe('member-olive');
    expect(useChoreLearningStore.getState().record).not.toBe(initial);
  });

  it('delegates take, release, and completion to occurrence transitions', () => {
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

  it('does not let the caregiver take child work from the shared pool', () => {
    const occurrenceId = 'activity-occurrence-household-recycling-2026-08-17';
    useChoreLearningStore.getState().selectMember('member-andrew');

    useChoreLearningStore.getState().take(occurrenceId);

    expect(useChoreLearningStore.getState().record.occurrences.find(
      (item) => item.activityOccurrenceId === occurrenceId,
    )).toMatchObject({ state: 'available', claimedByMemberId: null });
  });

  it('resets the versioned learning record without retaining mutations', () => {
    useChoreLearningStore.getState().selectMember('member-olive');
    useChoreLearningStore.getState().reset();

    expect(useChoreLearningStore.getState().record).toEqual(createChoreLearningRecord());
  });
});
