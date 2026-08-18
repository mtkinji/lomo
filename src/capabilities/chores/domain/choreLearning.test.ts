import {
  approveChoreOccurrence,
  completeChoreOccurrence,
  createChoreLearningRecord,
  normalizeChoreLearningRecord,
  projectChoreAgreement,
  projectCaregiverChoreInventory,
  projectChoreInventory,
  projectChoreReviewQueue,
  reopenChoreOccurrence,
  releaseChoreOccurrence,
  returnChoreOccurrenceForAnotherPass,
  setChoreEvidencePhoto,
  setChoreTokensEnabled,
  takeChoreOccurrence,
} from './choreLearning';

describe('Chores learning domain', () => {
  it('migrates legacy availability into the shared to-do recurrence contract', () => {
    const current = createChoreLearningRecord();
    const legacy = {
      ...current,
      version: 6,
      occurrences: current.occurrences.map((occurrence, index) => ({
        ...occurrence,
        availability: index === 0 ? 'daily' : 'as_needed',
        repeatRule: undefined,
        repeatCustom: undefined,
        repeatBasis: undefined,
        scheduledDate: undefined,
      })),
    };

    const migrated = normalizeChoreLearningRecord(legacy);

    expect(migrated.version).toBe(8);
    expect(migrated.occurrences[0]).toMatchObject({
      repeatRule: 'daily',
      repeatBasis: 'scheduled',
    });
    expect(migrated.occurrences[1].repeatRule).toBe('weekdays');
  });

  it('repairs known demo schedules without turning a legacy user-created chore into a repeat', () => {
    const current = createChoreLearningRecord();
    const legacy = {
      ...current,
      version: 7,
      occurrences: [
        ...current.occurrences.map((occurrence) => ({
          ...occurrence,
          repeatRule: undefined,
          repeatCustom: undefined,
          repeatBasis: undefined,
        })),
        {
          ...current.occurrences[0],
          activityOccurrenceId: 'activity-occurrence-user-one-time',
          activitySeriesId: 'activity-series-user-one-time',
          title: 'Carry the boxes downstairs',
          repeatRule: undefined,
          repeatCustom: undefined,
          repeatBasis: undefined,
        },
      ],
    };

    const migrated = normalizeChoreLearningRecord(legacy);

    expect(migrated.version).toBe(8);
    expect(migrated.occurrences[0].repeatRule).toBe('daily');
    expect(migrated.occurrences.at(-1)?.repeatRule).toBeUndefined();
  });

  it('rejects malformed custom recurrence in persisted chore data', () => {
    const current = createChoreLearningRecord();
    const malformed = {
      ...current,
      occurrences: current.occurrences.map((occurrence, index) => index === 0
        ? {
          ...occurrence,
          repeatRule: 'custom',
          repeatCustom: { cadence: 'weeks', interval: 0, weekdays: [] },
        }
        : occurrence),
    };

    expect(normalizeChoreLearningRecord(malformed)).toEqual(current);
  });

  it('creates the next trusted recurring chore only after the current occurrence completes', () => {
    const record = createChoreLearningRecord();
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';
    const beforeCount = record.occurrences.length;

    const completed = completeChoreOccurrence(
      record,
      occurrenceId,
      'member-charlie',
      '2026-08-18T14:30:00.000Z',
    );

    expect(completed.occurrences).toHaveLength(beforeCount + 1);
    expect(completed.occurrences.at(-1)).toMatchObject({
      activitySeriesId: 'activity-series-feed-scout',
      repeatRule: 'daily',
      scheduledDate: '2026-08-19',
      state: 'ready',
      performedByMemberId: null,
      repeatCreatedFromOccurrenceId: occurrenceId,
    });
    expect(projectCaregiverChoreInventory(completed, 'member-andrew')).toHaveLength(beforeCount);
    expect(projectCaregiverChoreInventory(completed, 'member-andrew').find(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )).toMatchObject({
      scheduledDate: '2026-08-19',
      state: 'ready',
    });
  });

  it('waits for caregiver approval before advancing a reviewed recurring chore', () => {
    const record = createChoreLearningRecord();
    const occurrenceId = 'activity-occurrence-olive-dishwasher-2026-08-18';
    const submitted = completeChoreOccurrence(
      record,
      occurrenceId,
      'member-olive',
      '2026-08-18T15:00:00.000Z',
    );
    expect(submitted.occurrences).toHaveLength(record.occurrences.length);

    const approved = approveChoreOccurrence(
      submitted,
      occurrenceId,
      'member-andrew',
      '2026-08-18T15:05:00.000Z',
    );
    expect(approved.occurrences).toHaveLength(record.occurrences.length + 1);
    expect(approved.occurrences.at(-1)).toMatchObject({
      activitySeriesId: 'activity-series-unload-dishwasher',
      repeatRule: 'daily',
      scheduledDate: '2026-08-19',
      state: 'ready',
      repeatCreatedFromOccurrenceId: occurrenceId,
    });
  });

  it('projects Charlie’s daily work and additional family-list quota as separate clauses', () => {
    const agreement = projectChoreAgreement(createChoreLearningRecord(), 'member-charlie');

    expect(agreement).toMatchObject({
      headline: '1 chore left today · Choose 3 more by Friday',
      supporting: '1 waiting for approval · Needed for weekend Screen Time',
      tokenBalance: null,
    });
    expect(agreement.sections).toEqual([
      { id: 'assigned', label: 'Every day', body: 'Finish your daily chores.' },
      { id: 'quota', label: 'By Friday', body: 'Choose 12 chores from the family list.' },
      { id: 'benefit', label: 'Weekend Screen Time', body: 'Finish both parts for weekend Screen Time.' },
    ]);
  });

  it('uses all-qualifying copy only when the expectation says assigned work counts', () => {
    const record = createChoreLearningRecord();
    record.expectations = [{
      memberId: 'member-charlie',
      assigned: null,
      quota: {
        targetCount: 12,
        qualifyingScope: 'all_qualifying',
        deadlineLabel: 'by Friday',
        sheetLabel: 'By Friday',
        creditedBeforeCurrentOccurrences: 8,
      },
      benefit: null,
    }];

    expect(projectChoreAgreement(record, 'member-charlie').headline).toBe('3 chores left by Friday');
  });

  it('updates current token balance and approval-gated agreement facts without period language', () => {
    const enabled = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');
    expect(projectChoreAgreement(enabled, 'member-charlie')).toMatchObject({
      tokenBalance: 8,
      supporting: '1 waiting for approval · Needed for weekend Screen Time',
    });

    const approved = approveChoreOccurrence(
      enabled,
      'activity-occurrence-charlie-entry-shoes-2026-08-17',
      'member-andrew',
      '2026-08-17T14:00:00.000Z',
    );
    expect(projectChoreAgreement(approved, 'member-charlie', new Date('2026-08-17T14:00:00.000Z'))).toMatchObject({
      headline: '1 chore left today · Choose 3 more by Friday',
      supporting: 'Needed for weekend Screen Time',
      tokenBalance: 9,
    });
  });

  it('omits agreement and token language when neither is active', () => {
    const record = createChoreLearningRecord();
    record.expectations = record.expectations.filter(({ memberId }) => memberId !== 'member-olive');

    expect(projectChoreAgreement(record, 'member-olive')).toEqual({
      headline: null,
      supporting: null,
      tokenBalance: null,
      sections: [],
    });
  });

  it('starts with stable Activity occurrence identities, optional tokens off, and a caregiver actor', () => {
    const record = createChoreLearningRecord();
    const charlie = projectChoreInventory(record, 'member-charlie');

    expect(charlie.forMember.map((item) => item.activityOccurrenceId)).toEqual([
      'activity-occurrence-charlie-feed-scout-2026-08-17',
      'activity-occurrence-charlie-breakfast-dishes-2026-08-17',
      'activity-occurrence-charlie-entry-shoes-2026-08-17',
    ]);
    expect(charlie.tokenBalance).toBeNull();
    expect(projectChoreAgreement(record, 'member-charlie').headline)
      .toBe('1 chore left today · Choose 3 more by Friday');
    expect(charlie.household).toHaveLength(3);
    expect(record.members.find((member) => member.id === 'member-andrew'))
      .toMatchObject({ displayName: 'Andrew', role: 'caregiver' });
    expect(record.occurrences.every((item) => item.definitionOfDone.length > 0)).toBe(true);
  });

  it('lets only a caregiver enable tokens and reveals the existing earned balance', () => {
    const record = createChoreLearningRecord();

    expect(setChoreTokensEnabled(record, true, 'member-charlie')).toBe(record);

    const enabled = setChoreTokensEnabled(record, true, 'member-andrew');
    expect(enabled.tokensEnabled).toBe(true);
    expect(projectChoreInventory(enabled, 'member-charlie').tokenBalance).toBe(8);

    const disabled = setChoreTokensEnabled(enabled, false, 'member-andrew');
    expect(projectChoreInventory(disabled, 'member-charlie').tokenBalance).toBeNull();
  });

  it('moves one open occurrence into the selected member inventory when taken', () => {
    const record = createChoreLearningRecord();
    const occurrenceId = 'activity-occurrence-household-recycling-2026-08-17';

    const next = takeChoreOccurrence(record, occurrenceId, 'member-charlie');
    const charlie = projectChoreInventory(next, 'member-charlie');
    const olive = projectChoreInventory(next, 'member-olive');

    expect(charlie.forMember.map((item) => item.activityOccurrenceId)).toContain(occurrenceId);
    expect(charlie.household.map((item) => item.activityOccurrenceId)).not.toContain(occurrenceId);
    expect(olive.forMember.map((item) => item.activityOccurrenceId)).not.toContain(occurrenceId);
    expect(olive.household.map((item) => item.activityOccurrenceId)).not.toContain(occurrenceId);
  });

  it('releases only an occurrence claimed by the acting member', () => {
    const occurrenceId = 'activity-occurrence-household-recycling-2026-08-17';
    const claimed = takeChoreOccurrence(
      createChoreLearningRecord(),
      occurrenceId,
      'member-charlie',
    );

    expect(releaseChoreOccurrence(claimed, occurrenceId, 'member-olive')).toBe(claimed);

    const released = releaseChoreOccurrence(claimed, occurrenceId, 'member-charlie');
    expect(projectChoreInventory(released, 'member-charlie').household)
      .toEqual(expect.arrayContaining([expect.objectContaining({ activityOccurrenceId: occurrenceId })]));
  });

  it('completes trusted work once and attributes the performer without changing token units', () => {
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';
    const record = createChoreLearningRecord();
    const completed = completeChoreOccurrence(
      record,
      occurrenceId,
      'member-charlie',
      '2026-08-17T14:30:00.000Z',
    );
    const replayed = completeChoreOccurrence(
      completed,
      occurrenceId,
      'member-charlie',
      '2026-08-17T15:00:00.000Z',
    );
    const projection = projectChoreInventory(replayed, 'member-charlie', new Date('2026-08-17T15:00:00.000Z'));

    expect(replayed).toBe(completed);
    expect(projection.forMember.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({
        state: 'completed',
        performedByMemberId: 'member-charlie',
        performedAtIso: '2026-08-17T14:30:00.000Z',
      });
    expect(projectChoreAgreement(replayed, 'member-charlie', new Date('2026-08-17T15:00:00.000Z')).headline)
      .toBe('Daily chores submitted · Choose 3 more by Friday');
    expect(projection.tokenBalance).toBeNull();
  });

  it('reopens completed work for the same child and removes completion credit', () => {
    const assignedOccurrenceId = 'activity-occurrence-charlie-breakfast-dishes-2026-08-17';
    const enabled = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');

    const reopened = reopenChoreOccurrence(enabled, assignedOccurrenceId, 'member-charlie');
    const occurrence = reopened.occurrences.find(
      (item) => item.activityOccurrenceId === assignedOccurrenceId,
    );

    expect(occurrence).toMatchObject({
      state: 'ready',
      performedByMemberId: null,
      performedAtIso: null,
      reviewedByMemberId: null,
      reviewedAtIso: null,
      reviewNote: null,
    });
    expect(projectChoreInventory(reopened, 'member-charlie').tokenBalance).toBe(7);
    expect(projectChoreAgreement(reopened, 'member-charlie').headline)
      .toBe('2 chores left today · Choose 3 more by Friday');
  });

  it('reopens approved shared work to its claimed state so checking it resubmits for approval', () => {
    const occurrenceId = 'activity-occurrence-household-kitchen-counters-2026-08-17';
    const claimed = takeChoreOccurrence(createChoreLearningRecord(), occurrenceId, 'member-charlie');
    const submitted = completeChoreOccurrence(
      claimed,
      occurrenceId,
      'member-charlie',
      '2026-08-17T16:00:00.000Z',
    );
    const approved = approveChoreOccurrence(
      submitted,
      occurrenceId,
      'member-andrew',
      '2026-08-17T16:05:00.000Z',
    );

    const reopened = reopenChoreOccurrence(approved, occurrenceId, 'member-charlie');
    const resubmitted = completeChoreOccurrence(
      reopened,
      occurrenceId,
      'member-charlie',
      '2026-08-17T16:10:00.000Z',
    );

    expect(reopened.occurrences.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({
        state: 'claimed',
        claimedByMemberId: 'member-charlie',
        performedByMemberId: null,
        reviewedByMemberId: null,
      });
    expect(resubmitted.occurrences.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({ state: 'waiting_approval', performedByMemberId: 'member-charlie' });
  });

  it('keeps review-required work waiting without counting it as complete', () => {
    const occurrenceId = 'activity-occurrence-household-kitchen-counters-2026-08-17';
    const claimed = takeChoreOccurrence(
      createChoreLearningRecord(),
      occurrenceId,
      'member-charlie',
    );
    const submitted = completeChoreOccurrence(
      claimed,
      occurrenceId,
      'member-charlie',
      '2026-08-17T16:00:00.000Z',
    );
    const projection = projectChoreInventory(submitted, 'member-charlie');

    expect(projection.forMember.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({ state: 'waiting_approval', performedByMemberId: 'member-charlie' });
    expect(projectChoreAgreement(submitted, 'member-charlie').supporting)
      .toBe('2 waiting for approval · Needed for weekend Screen Time');
    expect(projection.tokenBalance).toBeNull();
  });

  it('lets only the child responsible for a chore attach or remove optional photo evidence', () => {
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';
    const record = createChoreLearningRecord();

    expect(setChoreEvidencePhoto(record, occurrenceId, 'member-olive', 'file://olive.jpg')).toBe(record);
    expect(setChoreEvidencePhoto(record, occurrenceId, 'member-andrew', 'file://caregiver.jpg')).toBe(record);

    const attached = setChoreEvidencePhoto(record, occurrenceId, 'member-charlie', '  file://scout.jpg  ');
    expect(attached.occurrences.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({ evidencePhotoUri: 'file://scout.jpg' });

    const removed = setChoreEvidencePhoto(attached, occurrenceId, 'member-charlie', null);
    expect(removed.occurrences.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({ evidencePhotoUri: null });
  });

  it('ships Charlie’s pending review with a sample submitted photo for the learning release', () => {
    const occurrence = createChoreLearningRecord().occurrences.find(
      (item) => item.activityOccurrenceId === 'activity-occurrence-charlie-entry-shoes-2026-08-17',
    );

    expect(occurrence?.evidencePhotoUri).toBe('fixture://tidy-shoes');
  });

  it('projects pending review only for a caregiver and preserves performer truth on approval', () => {
    const record = createChoreLearningRecord();
    const queue = projectChoreReviewQueue(record, 'member-andrew');

    expect(projectChoreReviewQueue(record, 'member-charlie')).toEqual([]);
    expect(queue.map((item) => item.activityOccurrenceId)).toEqual([
      'activity-occurrence-charlie-entry-shoes-2026-08-17',
      'activity-occurrence-olive-dishwasher-2026-08-18',
    ]);

    const approved = approveChoreOccurrence(
      record,
      queue[0].activityOccurrenceId,
      'member-andrew',
      '2026-08-17T14:00:00.000Z',
    );
    expect(approved.occurrences.find((item) => item.activityOccurrenceId === queue[0].activityOccurrenceId))
      .toMatchObject({
        state: 'completed',
        performedByMemberId: 'member-charlie',
        performedAtIso: '2026-08-17T13:25:00.000Z',
        reviewedByMemberId: 'member-andrew',
        reviewedAtIso: '2026-08-17T14:00:00.000Z',
      });
    expect(projectChoreAgreement(approved, 'member-charlie').supporting)
      .toBe('Needed for weekend Screen Time');
  });

  it('returns the same occurrence for another pass and permits the original child to resubmit it', () => {
    const occurrenceId = 'activity-occurrence-charlie-entry-shoes-2026-08-17';
    const record = createChoreLearningRecord();

    expect(returnChoreOccurrenceForAnotherPass(
      record,
      occurrenceId,
      'member-charlie',
      '2026-08-17T14:00:00.000Z',
      'Please line up the shoes by the wall.',
    )).toBe(record);

    const returned = returnChoreOccurrenceForAnotherPass(
      record,
      occurrenceId,
      'member-andrew',
      '2026-08-17T14:00:00.000Z',
      '  Please line up the shoes by the wall.  ',
    );
    expect(returned.occurrences.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({
        state: 'needs_another_pass',
        performedByMemberId: 'member-charlie',
        performedAtIso: '2026-08-17T13:25:00.000Z',
        reviewedByMemberId: 'member-andrew',
        reviewNote: 'Please line up the shoes by the wall.',
      });

    const resubmitted = completeChoreOccurrence(
      returned,
      occurrenceId,
      'member-charlie',
      '2026-08-17T15:00:00.000Z',
    );
    expect(resubmitted.occurrences.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({
        state: 'waiting_approval',
        performedAtIso: '2026-08-17T15:00:00.000Z',
        reviewedByMemberId: null,
        reviewedAtIso: null,
        reviewNote: null,
      });
  });

  it('rejects completion by a member who neither owns nor claimed the occurrence', () => {
    const record = createChoreLearningRecord();
    const next = completeChoreOccurrence(
      record,
      'activity-occurrence-charlie-feed-scout-2026-08-17',
      'member-olive',
      '2026-08-17T14:30:00.000Z',
    );

    expect(next).toBe(record);
  });
});
