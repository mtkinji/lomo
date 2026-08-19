import {
  approveChoreOccurrence,
  cancelChoreTokenRedemption,
  completeChoreOccurrence,
  createChoreLearningRecord,
  normalizeChoreLearningRecord,
  choreCorrectionEntranceLabel,
  projectChoreAgreement,
  projectChoreCorrectionCandidates,
  projectCaregiverChoreInventory,
  projectChoreInventory,
  projectChoreReviewQueue,
  projectChoreRewards,
  requestChoreTokenRedemption,
  reconcileRecurringChoreOccurrences,
  requestEarlierChoreCompletions,
  reopenChoreOccurrence,
  releaseChoreOccurrence,
  returnChoreOccurrenceForAnotherPass,
  leaveEarlierChoreCompletionMissed,
  setChoreEvidencePhoto,
  setChoreRewardExchangeRate,
  setChoreTokensEnabled,
  settleChoreRewardPayout,
  takeChoreOccurrence,
} from './choreLearning';

describe('Chores learning domain', () => {
  it('migrates existing records into the dated correction receipt contract', () => {
    const current = createChoreLearningRecord();
    const migrated = normalizeChoreLearningRecord({ ...current, version: 11 });

    expect(migrated.version).toBe(13);
    expect(migrated.occurrences.every((occurrence) => (
      occurrence.completionSource === 'direct' && occurrence.reportedAtIso === null
    ))).toBe(true);
  });

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

    expect(migrated.version).toBe(13);
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

    expect(migrated.version).toBe(13);
    expect(migrated.occurrences[0].repeatRule).toBe('daily');
    expect(migrated.occurrences.find(
      (occurrence) => occurrence.activityOccurrenceId === 'activity-occurrence-user-one-time',
    )?.repeatRule).toBeUndefined();
  });

  it('keeps existing saved chores photo-optional when adding photo requirements', () => {
    const current = createChoreLearningRecord();
    const legacy = {
      ...current,
      version: 9,
      series: current.series.map(({ photoPolicy: _photoPolicy, ...series }) => series),
      occurrences: current.occurrences.map(({ photoPolicy: _photoPolicy, ...occurrence }) => occurrence),
    };

    const migrated = normalizeChoreLearningRecord(legacy);

    expect(migrated.version).toBe(13);
    expect(migrated.series.every((series) => series.photoPolicy === 'optional')).toBe(true);
    expect(migrated.occurrences.every((occurrence) => occurrence.photoPolicy === 'optional')).toBe(true);
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
      (series) => series.activitySeriesId === 'activity-series-feed-scout',
    )).toMatchObject({
      repeatRule: 'daily',
      title: 'Feed Scout and refill the water bowl',
    });
    expect(projectChoreInventory(
      completed,
      'member-charlie',
      new Date('2026-08-19T12:00:00.000Z'),
    ).forMember.filter(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )).toEqual([
      expect.objectContaining({
        scheduledDate: '2026-08-19',
        state: 'ready',
      }),
    ]);
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

  it('starts a scheduled chore fresh on the current date without backfilling missed copies', () => {
    const record = createChoreLearningRecord();
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';

    const reconciled = reconcileRecurringChoreOccurrences(
      record,
      '2026-08-19T08:00:00.000-06:00',
    );

    expect(reconciled.occurrences.find(
      (occurrence) => occurrence.activityOccurrenceId === occurrenceId,
    )).toMatchObject({ state: 'missed', performedByMemberId: null });
    expect(reconciled.occurrences.filter(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout'
        && occurrence.state === 'ready',
    )).toEqual([
      expect.objectContaining({
        scheduledDate: '2026-08-19',
        repeatBasis: 'scheduled',
        repeatCreatedFromOccurrenceId: occurrenceId,
      }),
    ]);
    expect(projectChoreInventory(
      reconciled,
      'member-charlie',
      new Date('2026-08-19T08:00:00.000-06:00'),
    ).forMember.some((occurrence) => occurrence.state === 'missed')).toBe(false);
  });

  it('offers only this week’s missed assigned occurrences for contextual correction', () => {
    const record = createChoreLearningRecord();
    const currentId = 'activity-occurrence-charlie-feed-scout-2026-08-20';
    const current = record.occurrences.find(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )!;
    const withMisses = {
      ...record,
      occurrences: [
        ...record.occurrences.filter((occurrence) => occurrence !== current),
        {
          ...current,
          activityOccurrenceId: currentId,
          scheduledDate: '2026-08-20',
          state: 'completed' as const,
          performedByMemberId: 'member-charlie',
          performedAtIso: '2026-08-20T14:00:00.000Z',
        },
        { ...current, activityOccurrenceId: 'feed-scout-2026-08-19', scheduledDate: '2026-08-19', state: 'missed' as const },
        { ...current, activityOccurrenceId: 'feed-scout-2026-08-18', scheduledDate: '2026-08-18', state: 'missed' as const },
        { ...current, activityOccurrenceId: 'feed-scout-2026-08-16', scheduledDate: '2026-08-16', state: 'missed' as const },
      ],
    };

    const candidates = projectChoreCorrectionCandidates(
      withMisses,
      currentId,
      'member-charlie',
      new Date('2026-08-20T15:00:00.000Z'),
    );

    expect(candidates.map((occurrence) => occurrence.scheduledDate)).toEqual([
      '2026-08-19',
      '2026-08-18',
    ]);
    expect(choreCorrectionEntranceLabel(candidates, new Date('2026-08-20T15:00:00.000Z')))
      .toBe('I did this on another day');
    expect(choreCorrectionEntranceLabel([candidates[0]], new Date('2026-08-20T15:00:00.000Z')))
      .toBe('I did this yesterday');
  });

  it('requests several dated corrections without changing or advancing today’s chore', () => {
    const record = createChoreLearningRecord();
    const current = record.occurrences.find(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )!;
    const missedIds = ['feed-scout-2026-08-17', 'feed-scout-2026-08-18'];
    const withMisses = {
      ...record,
      occurrences: [
        ...record.occurrences,
        ...missedIds.map((activityOccurrenceId, index) => ({
          ...current,
          activityOccurrenceId,
          scheduledDate: `2026-08-${17 + index}`,
          state: 'missed' as const,
        })),
      ],
    };

    const requested = requestEarlierChoreCompletions(
      withMisses,
      missedIds,
      'member-charlie',
      '2026-08-20T15:00:00.000Z',
    );

    expect(requested.occurrences.filter((occurrence) => missedIds.includes(
      occurrence.activityOccurrenceId,
    ))).toEqual(expect.arrayContaining([
      expect.objectContaining({
        state: 'waiting_approval',
        completionSource: 'earlier_day',
        performedByMemberId: 'member-charlie',
        performedAtIso: null,
        reportedAtIso: '2026-08-20T15:00:00.000Z',
      }),
      expect.objectContaining({ state: 'waiting_approval', completionSource: 'earlier_day' }),
    ]));
    expect(requested.occurrences.find(
      (occurrence) => occurrence.activityOccurrenceId === current.activityOccurrenceId,
    )).toMatchObject({ state: current.state, scheduledDate: current.scheduledDate });
    expect(requested.occurrences).toHaveLength(withMisses.occurrences.length);
  });

  it('counts or leaves an earlier completion without advancing recurrence or double-crediting', () => {
    const base = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');
    const current = base.occurrences.find(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )!;
    const missedId = 'feed-scout-2026-08-17';
    const withMiss = {
      ...base,
      occurrences: [
        ...base.occurrences,
        { ...current, activityOccurrenceId: missedId, scheduledDate: '2026-08-17', state: 'missed' as const },
      ],
    };
    const requested = requestEarlierChoreCompletions(
      withMiss,
      [missedId],
      'member-charlie',
      '2026-08-18T15:00:00.000Z',
    );
    const beforeCount = requested.occurrences.length;
    const beforeBalance = projectChoreInventory(requested, 'member-charlie').tokenBalance;
    const counted = approveChoreOccurrence(
      requested,
      missedId,
      'member-andrew',
      '2026-08-18T16:00:00.000Z',
    );
    const replayed = approveChoreOccurrence(
      counted,
      missedId,
      'member-andrew',
      '2026-08-18T17:00:00.000Z',
    );

    expect(counted.occurrences).toHaveLength(beforeCount);
    expect(counted.occurrences.find((occurrence) => occurrence.activityOccurrenceId === missedId))
      .toMatchObject({
        state: 'completed',
        completionSource: 'earlier_day',
        performedAtIso: null,
        reviewedByMemberId: 'member-andrew',
      });
    expect(projectChoreInventory(counted, 'member-charlie').tokenBalance).toBe((beforeBalance ?? 0) + 2);
    expect(replayed).toBe(counted);

    const requestedAgain = requestEarlierChoreCompletions(
      withMiss,
      [missedId],
      'member-charlie',
      '2026-08-18T15:00:00.000Z',
    );
    const leftMissed = leaveEarlierChoreCompletionMissed(
      requestedAgain,
      missedId,
      'member-andrew',
      '2026-08-18T16:00:00.000Z',
    );
    expect(leftMissed.occurrences.find((occurrence) => occurrence.activityOccurrenceId === missedId))
      .toMatchObject({
        state: 'missed',
        completionSource: 'direct',
        performedByMemberId: null,
        reportedAtIso: null,
      });
  });

  it('keeps completion-relative work open across its scheduled date without creating another copy', () => {
    const record = createChoreLearningRecord();
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';
    record.series = record.series.map((series) => (
      series.activitySeriesId === 'activity-series-feed-scout'
        ? { ...series, repeatBasis: 'after_completion' }
        : series
    ));
    record.occurrences = record.occurrences.map((occurrence) => (
      occurrence.activityOccurrenceId === occurrenceId
        ? { ...occurrence, repeatBasis: 'after_completion' }
        : occurrence
    ));

    const reconciled = reconcileRecurringChoreOccurrences(
      record,
      '2026-08-21T08:00:00.000-06:00',
    );

    expect(reconciled.occurrences.filter(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )).toEqual([
      expect.objectContaining({
        activityOccurrenceId: occurrenceId,
        scheduledDate: '2026-08-18',
        repeatBasis: 'after_completion',
        state: 'ready',
      }),
    ]);
  });

  it('projects Charlie’s daily work and additional family-list quota as separate clauses', () => {
    const agreement = projectChoreAgreement(createChoreLearningRecord(), 'member-charlie');

    expect(agreement).toMatchObject({
      headline: '1 chore left today · Choose 3 more by Friday',
      supporting: '1 waiting for approval · For weekend Screen Time',
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
    const feedScout = record.occurrences.find(
      (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
    )!;
    record.occurrences.push(
      {
        ...feedScout,
        activityOccurrenceId: 'feed-scout-counted-correction',
        scheduledDate: '2026-08-17',
        state: 'completed',
        performedByMemberId: 'member-charlie',
        performedAtIso: null,
        completionSource: 'earlier_day',
        reportedAtIso: '2026-08-18T15:00:00.000Z',
        reviewedByMemberId: 'member-andrew',
        reviewedAtIso: '2026-08-18T16:00:00.000Z',
      },
      {
        ...feedScout,
        activityOccurrenceId: 'feed-scout-prior-week',
        scheduledDate: '2026-08-10',
        state: 'completed',
        performedByMemberId: 'member-charlie',
        performedAtIso: '2026-08-10T15:00:00.000Z',
      },
    );

    expect(projectChoreAgreement(
      record,
      'member-charlie',
      new Date('2026-08-20T15:00:00.000Z'),
    ).headline).toBe('2 chores left by Friday');
  });

  it('states a satisfied agreement without claiming Screen Time was delivered', () => {
    const record = createChoreLearningRecord();
    record.expectations = record.expectations.map((expectation) => (
      expectation.memberId === 'member-charlie' && expectation.quota
        ? {
          ...expectation,
          quota: { ...expectation.quota, creditedBeforeCurrentOccurrences: 12 },
        }
        : expectation
    ));
    record.occurrences = record.occurrences.map((occurrence) => (
      occurrence.assignedMemberId === 'member-charlie'
        ? {
          ...occurrence,
          state: 'completed' as const,
          performedByMemberId: 'member-charlie',
          performedAtIso: '2026-08-18T12:00:00.000Z',
        }
        : occurrence
    ));

    expect(projectChoreAgreement(
      record,
      'member-charlie',
      new Date('2026-08-18T12:00:00.000Z'),
    )).toMatchObject({
      headline: "You're caught up",
      supporting: 'Chore requirement met for weekend Screen Time',
    });
  });

  it('keeps optional open-pool review separate from the daily assigned-work clause', () => {
    const record = createChoreLearningRecord();
    record.occurrences = record.occurrences.map((occurrence) => {
      if (occurrence.assignedMemberId === 'member-charlie') {
        return {
          ...occurrence,
          state: 'completed' as const,
          performedByMemberId: 'member-charlie',
          performedAtIso: '2026-08-18T12:00:00.000Z',
        };
      }
      if (occurrence.activitySeriesId === 'activity-series-kitchen-counters') {
        return {
          ...occurrence,
          state: 'waiting_approval' as const,
          claimedByMemberId: 'member-charlie',
          performedByMemberId: 'member-charlie',
          performedAtIso: '2026-08-18T13:00:00.000Z',
        };
      }
      return occurrence;
    });

    expect(projectChoreAgreement(
      record,
      'member-charlie',
      new Date('2026-08-18T15:00:00.000Z'),
    )).toMatchObject({
      headline: 'Daily chores done · Choose 3 more by Friday',
      supporting: '1 waiting for approval · For weekend Screen Time',
    });
  });

  it('updates current token balance and approval-gated agreement facts without period language', () => {
    const enabled = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');
    expect(projectChoreAgreement(enabled, 'member-charlie')).toMatchObject({
      tokenBalance: 8,
      supporting: '1 waiting for approval · For weekend Screen Time',
    });

    const approved = approveChoreOccurrence(
      enabled,
      'activity-occurrence-charlie-entry-shoes-2026-08-17',
      'member-andrew',
      '2026-08-17T14:00:00.000Z',
    );
    expect(projectChoreAgreement(approved, 'member-charlie', new Date('2026-08-17T14:00:00.000Z'))).toMatchObject({
      headline: '1 chore left today · Choose 3 more by Friday',
      supporting: 'For weekend Screen Time',
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

  it('requires configured photo evidence before a child can finish a chore', () => {
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';
    const record = createChoreLearningRecord();
    const required = {
      ...record,
      occurrences: record.occurrences.map((occurrence) => (
        occurrence.activityOccurrenceId === occurrenceId
          ? { ...occurrence, photoPolicy: 'required' as const }
          : occurrence
      )),
    };

    expect(completeChoreOccurrence(
      required,
      occurrenceId,
      'member-charlie',
      '2026-08-17T14:30:00.000Z',
    )).toBe(required);

    const withPhoto = setChoreEvidencePhoto(
      required,
      occurrenceId,
      'member-charlie',
      'file://scout.jpg',
    );
    expect(completeChoreOccurrence(
      withPhoto,
      occurrenceId,
      'member-charlie',
      '2026-08-17T14:30:00.000Z',
    ).occurrences.find((item) => item.activityOccurrenceId === occurrenceId))
      .toMatchObject({ state: 'completed', evidencePhotoUri: 'file://scout.jpg' });
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
      .toBe('2 waiting for approval · For weekend Screen Time');
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
      .toBe('For weekend Screen Time');
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

  it('migrates existing balances and completed chores into the rewards ledger exactly once', () => {
    const current = createChoreLearningRecord();
    const legacy = { ...current, version: 12 };

    const migrated = normalizeChoreLearningRecord(legacy);
    const normalizedAgain = normalizeChoreLearningRecord(migrated);

    expect(migrated.version).toBe(13);
    expect(projectChoreRewards(migrated, 'member-charlie').availableTokens).toBe(8);
    expect(normalizedAgain.rewardEvents).toEqual(migrated.rewardEvents);
  });

  it('earns once for trusted completion and adjusts the ledger when the child reopens it', () => {
    const enabled = setChoreTokensEnabled(
      createChoreLearningRecord(),
      true,
      'member-andrew',
    );
    const occurrenceId = 'activity-occurrence-charlie-feed-scout-2026-08-17';
    const completed = completeChoreOccurrence(
      enabled,
      occurrenceId,
      'member-charlie',
      '2026-08-18T15:00:00.000Z',
    );
    const repeated = completeChoreOccurrence(
      completed,
      occurrenceId,
      'member-charlie',
      '2026-08-18T15:01:00.000Z',
    );
    const reopened = reopenChoreOccurrence(repeated, occurrenceId, 'member-charlie');

    expect(projectChoreRewards(completed, 'member-charlie').availableTokens).toBe(10);
    expect(repeated.rewardEvents).toEqual(completed.rewardEvents);
    expect(projectChoreRewards(reopened, 'member-charlie').availableTokens).toBe(8);
  });

  it('sets tokens aside without removing them and preserves the rate on the payout receipt', () => {
    const enabled = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');

    const reserved = requestChoreTokenRedemption(
      enabled,
      'member-charlie',
      4,
      '2026-08-18T16:00:00.000Z',
      'conversion-one',
    );
    const rewards = projectChoreRewards(reserved, 'member-charlie');

    expect(rewards.availableTokens).toBe(4);
    expect(rewards.reservedTokens).toBe(4);
    expect(rewards.totalTokens).toBe(8);
    expect(rewards.pendingPayouts).toEqual([
      expect.objectContaining({
        payoutId: 'payout-conversion-one',
        tokenAmount: 4,
        moneyAmountCents: 200,
        exchangeRateCentsPerToken: 50,
        settledAtIso: null,
      }),
    ]);
    expect(requestChoreTokenRedemption(
      reserved,
      'member-charlie',
      5,
      '2026-08-18T16:01:00.000Z',
      'too-many',
    )).toBe(reserved);
  });

  it('lets only a caregiver change the current rate without rewriting an existing payout', () => {
    const enabled = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');
    const reservedAtDefaultRate = requestChoreTokenRedemption(
      enabled,
      'member-charlie',
      4,
      '2026-08-18T16:00:00.000Z',
      'default-rate',
    );

    expect(setChoreRewardExchangeRate(
      reservedAtDefaultRate,
      75,
      'member-charlie',
    )).toBe(reservedAtDefaultRate);
    expect(setChoreRewardExchangeRate(
      reservedAtDefaultRate,
      0,
      'member-andrew',
    )).toBe(reservedAtDefaultRate);

    const updated = setChoreRewardExchangeRate(
      reservedAtDefaultRate,
      75,
      'member-andrew',
    );
    const rewards = projectChoreRewards(updated, 'member-charlie');

    expect(updated.rewardExchangeRateCentsPerToken).toBe(75);
    expect(rewards.availableMoneyAmountCents).toBe(300);
    expect(rewards.pendingPayouts[0]).toMatchObject({
      moneyAmountCents: 200,
      exchangeRateCentsPerToken: 50,
    });

    const reservedAtNewRate = requestChoreTokenRedemption(
      updated,
      'member-charlie',
      2,
      '2026-08-18T16:10:00.000Z',
      'new-rate',
    );
    expect(projectChoreRewards(reservedAtNewRate, 'member-charlie').pendingPayouts)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          payoutId: 'payout-new-rate',
          moneyAmountCents: 150,
          exchangeRateCentsPerToken: 75,
        }),
      ]));
  });

  it('lets the child cancel an unpaid redemption and recover the available balance', () => {
    const enabled = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');
    const reserved = requestChoreTokenRedemption(
      enabled,
      'member-charlie',
      4,
      '2026-08-18T16:00:00.000Z',
      'conversion-one',
    );
    const cancelled = cancelChoreTokenRedemption(
      reserved,
      'member-charlie',
      'payout-conversion-one',
      '2026-08-18T16:05:00.000Z',
    );

    expect(projectChoreRewards(cancelled, 'member-charlie')).toMatchObject({
      availableTokens: 8,
      reservedTokens: 0,
      totalTokens: 8,
      pendingPayouts: [],
    });
  });

  it('lets only a caregiver atomically pay and redeem the set-aside tokens', () => {
    const enabled = setChoreTokensEnabled(createChoreLearningRecord(), true, 'member-andrew');
    const reserved = requestChoreTokenRedemption(
      enabled,
      'member-charlie',
      4,
      '2026-08-18T16:00:00.000Z',
      'conversion-one',
    );
    const rejected = settleChoreRewardPayout(
      reserved,
      'member-charlie',
      'payout-conversion-one',
      '2026-08-18T17:00:00.000Z',
    );
    const settled = settleChoreRewardPayout(
      reserved,
      'member-andrew',
      'payout-conversion-one',
      '2026-08-18T17:00:00.000Z',
    );

    expect(rejected).toBe(reserved);
    expect(projectChoreRewards(settled, 'member-charlie')).toMatchObject({
      availableTokens: 4,
      reservedTokens: 0,
      totalTokens: 4,
      pendingPayouts: [],
    });
    expect(projectChoreRewards(settled, 'member-charlie').payouts[0].settledAtIso)
      .toBe('2026-08-18T17:00:00.000Z');
  });
});
