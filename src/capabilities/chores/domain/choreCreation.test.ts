import type { ActivityAiEnrichment } from '../../../services/ai';
import { completeChoreOccurrence, createChoreLearningRecord } from './choreLearning';
import {
  addChoreDraftToLearningRecord,
  applyChoreDraftEnrichment,
  buildChoreSeriesDeleteSnapshot,
  choreDraftToControlFields,
  createChoreDraft,
  createChoreDraftFromSeries,
  deleteChoreSeriesFromLearningRecord,
  restoreDeletedChoreSeriesToLearningRecord,
  updateChoreSeriesInLearningRecord,
} from './choreCreation';

describe('caregiver chore creation', () => {
  const record = createChoreLearningRecord();

  it('projects the same trimmed reviewed fields for native and conversational creation', () => {
    expect(choreDraftToControlFields({
      title: '  Feed Scout  ', assignedMemberId: 'member-charlie', repeatRule: 'daily',
      repeatBasis: 'scheduled', definitionOfDone: '  Food and water  ', photoPolicy: 'required',
      reviewPolicy: 'caregiver_review', tokenValue: 2,
    })).toMatchObject({
      title: 'Feed Scout', assignedMembershipId: 'member-charlie', repeatRule: 'daily',
      definitionOfDone: 'Food and water', photoPolicy: 'required', tokenValue: 2,
    });
  });

  it('starts with conservative household defaults and assigns only an exact child name', () => {
    expect(createChoreDraft('Wipe the table', record.members)).toMatchObject({
      title: 'Wipe the table',
      assignedMemberId: null,
      repeatRule: undefined,
      repeatCustom: undefined,
      repeatBasis: 'scheduled',
      definitionOfDone: '',
      photoPolicy: 'optional',
      reviewPolicy: 'trusted',
      tokenValue: 1,
    });

    expect(createChoreDraft('Charlie, wipe the table', record.members).assignedMemberId)
      .toBe('member-charlie');
    expect(createChoreDraft('Andrew, wipe the table', record.members).assignedMemberId)
      .toBeNull();
    expect(createChoreDraft('Olivia, wipe the table', record.members).assignedMemberId)
      .toBeNull();
  });

  it('maps useful AI output while ignoring unrelated to-do fields', () => {
    const draft = createChoreDraft('Wipe the table every weekday', record.members);
    const enrichment: ActivityAiEnrichment = {
      notes: 'Table is clear and wiped clean.',
      steps: [{ title: 'Clear dishes' }, { title: 'Wipe crumbs and sticky spots' }],
      repeatRule: 'weekdays',
      priority: 3,
      reminderAt: '2026-08-19T08:00:00.000Z',
    };

    expect(applyChoreDraftEnrichment(draft, enrichment, new Set())).toMatchObject({
      definitionOfDone: 'Clear dishes\nWipe crumbs and sticky spots',
      repeatRule: 'weekdays',
      assignedMemberId: null,
      reviewPolicy: 'trusted',
      tokenValue: 1,
    });
  });

  it('never overwrites a field the caregiver touched while AI was running', () => {
    const draft = {
      ...createChoreDraft('Wipe the table', record.members),
      definitionOfDone: 'Use the blue cloth.',
      repeatRule: 'weekly' as const,
    };

    expect(applyChoreDraftEnrichment(
      draft,
      {
        notes: 'AI description',
        steps: [{ title: 'AI step' }],
        repeatRule: 'daily',
      },
      new Set(['definitionOfDone', 'repeatRule']),
    )).toEqual(draft);
  });

  it('does not create recurrence unless the caregiver asked for it', () => {
    const draft = createChoreDraft('Wipe the table', record.members);

    expect(applyChoreDraftEnrichment(
      draft,
      { repeatRule: 'daily' },
      new Set(),
    ).repeatRule).toBeUndefined();
  });

  it('commits the first inventory item only when the caregiver adds the draft', () => {
    const draft = {
      ...createChoreDraft('Feed the fish', record.members),
      assignedMemberId: 'member-olive',
      repeatRule: 'daily' as const,
      definitionOfDone: 'Fish are fed and the lid is closed.',
      photoPolicy: 'required' as const,
      reviewPolicy: 'caregiver_review' as const,
      tokenValue: 2 as const,
    };

    const next = addChoreDraftToLearningRecord(
      record,
      draft,
      'member-andrew',
      '2026-08-18T14:00:00.000Z',
      'feed-fish',
    );

    expect(next).not.toBe(record);
    expect(next.occurrences).toHaveLength(record.occurrences.length + 1);
    expect(next.occurrences.at(-1)).toMatchObject({
      activityOccurrenceId: 'activity-occurrence-feed-fish',
      activitySeriesId: 'activity-series-feed-fish',
      title: 'Feed the fish',
      definitionOfDone: 'Fish are fed and the lid is closed.',
      repeatRule: 'daily',
      repeatBasis: 'scheduled',
      scheduledDate: '2026-08-18',
      participation: 'assigned',
      assignedMemberId: 'member-olive',
      state: 'ready',
      photoPolicy: 'required',
      reviewPolicy: 'caregiver_review',
      tokenValue: 2,
    });
  });

  it('rejects empty drafts and non-caregiver commits', () => {
    const draft = createChoreDraft('   ', record.members);

    expect(addChoreDraftToLearningRecord(
      record,
      draft,
      'member-andrew',
      '2026-08-18T14:00:00.000Z',
      'empty',
    )).toBe(record);
    expect(addChoreDraftToLearningRecord(
      record,
      { ...draft, title: 'Sweep' },
      'member-charlie',
      '2026-08-18T14:00:00.000Z',
      'sweep',
    )).toBe(record);
  });

  it('edits the root chore without rewriting an occurrence receipt', () => {
    const series = record.series.find((item) => item.activitySeriesId === 'activity-series-bring-in-mail')!;
    const receipt = record.occurrences.find((item) => item.activitySeriesId === series.activitySeriesId)!;
    const draft = {
      ...createChoreDraftFromSeries(series),
      title: 'Bring in and sort the mail',
      assignedMemberId: 'member-charlie',
      repeatRule: 'daily' as const,
      definitionOfDone: 'The mailbox is empty and the mail is sorted on the counter.',
      photoPolicy: 'required' as const,
      reviewPolicy: 'caregiver_review' as const,
      tokenValue: 2 as const,
    };

    const next = updateChoreSeriesInLearningRecord(
      record,
      draft,
      'member-andrew',
      series.activitySeriesId,
    );

    expect(next.series.find((item) => item.activitySeriesId === series.activitySeriesId)).toMatchObject({
      title: 'Bring in and sort the mail',
      assignedMemberId: 'member-charlie',
      participation: 'assigned',
      repeatRule: 'daily',
      photoPolicy: 'required',
      reviewPolicy: 'caregiver_review',
      tokenValue: 2,
    });
    expect(next.occurrences.find((item) => item.activityOccurrenceId === receipt.activityOccurrenceId))
      .toEqual(receipt);
  });

  it('uses the edited root chore when generating the next recurring occurrence', () => {
    const series = record.series.find((item) => item.activitySeriesId === 'activity-series-feed-scout')!;
    const draft = {
      ...createChoreDraftFromSeries(series),
      title: 'Feed Scout and refresh both bowls',
      definitionOfDone: 'Both bowls are clean, full, and back on the mat.',
      photoPolicy: 'required' as const,
    };
    const edited = updateChoreSeriesInLearningRecord(
      record,
      draft,
      'member-andrew',
      series.activitySeriesId,
    );
    const completed = completeChoreOccurrence(
      edited,
      'activity-occurrence-charlie-feed-scout-2026-08-17',
      'member-charlie',
      '2026-08-18T14:30:00.000Z',
    );

    expect(completed.occurrences[0].title).toBe('Feed Scout and refill the water bowl');
    expect(completed.occurrences.at(-1)).toMatchObject({
      title: 'Feed Scout and refresh both bowls',
      definitionOfDone: 'Both bowls are clean, full, and back on the mat.',
      photoPolicy: 'required',
      scheduledDate: '2026-08-19',
    });
  });

  it('lets a caregiver delete and restore a chore series with all of its occurrences', () => {
    const seriesId = 'activity-series-feed-scout';
    const occurrenceIds = record.occurrences
      .filter((occurrence) => occurrence.activitySeriesId === seriesId)
      .map((occurrence) => occurrence.activityOccurrenceId);
    const snapshot = buildChoreSeriesDeleteSnapshot(record, seriesId);

    expect(snapshot).not.toBeNull();
    const deleted = deleteChoreSeriesFromLearningRecord(record, 'member-andrew', seriesId);

    expect(deleted.series.some((series) => series.activitySeriesId === seriesId)).toBe(false);
    expect(deleted.occurrences.some((occurrence) => occurrence.activitySeriesId === seriesId)).toBe(false);
    expect(deleted.rewardEvents).toEqual(record.rewardEvents);

    const restored = restoreDeletedChoreSeriesToLearningRecord(
      deleted,
      'member-andrew',
      snapshot!,
    );
    expect(restored.series).toEqual(record.series);
    expect(restored.occurrences).toEqual(record.occurrences);
    expect(restored.occurrences.filter((occurrence) => occurrence.activitySeriesId === seriesId)
      .map((occurrence) => occurrence.activityOccurrenceId)).toEqual(occurrenceIds);
  });

  it('does not let a child delete or restore a chore series', () => {
    const seriesId = 'activity-series-feed-scout';
    const snapshot = buildChoreSeriesDeleteSnapshot(record, seriesId)!;
    const deleted = deleteChoreSeriesFromLearningRecord(record, 'member-andrew', seriesId);

    expect(deleteChoreSeriesFromLearningRecord(record, 'member-charlie', seriesId)).toBe(record);
    expect(restoreDeletedChoreSeriesToLearningRecord(deleted, 'member-charlie', snapshot))
      .toBe(deleted);
  });
});
