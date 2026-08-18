import {
  approveChoreOccurrence,
  completeChoreOccurrence,
  createChoreLearningRecord,
  projectChoreAgreement,
  projectChoreInventory,
  projectChoreReviewQueue,
  releaseChoreOccurrence,
  returnChoreOccurrenceForAnotherPass,
  setChoreEvidencePhoto,
  setChoreTokensEnabled,
  takeChoreOccurrence,
} from './choreLearning';

describe('Chores learning domain', () => {
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
    expect(projectChoreAgreement(approved, 'member-charlie')).toMatchObject({
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
    const projection = projectChoreInventory(replayed, 'member-charlie');

    expect(replayed).toBe(completed);
    expect(projection.forMember.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({
        state: 'completed',
        performedByMemberId: 'member-charlie',
        performedAtIso: '2026-08-17T14:30:00.000Z',
      });
    expect(projectChoreAgreement(replayed, 'member-charlie').headline)
      .toBe('Daily chores submitted · Choose 3 more by Friday');
    expect(projection.tokenBalance).toBeNull();
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
