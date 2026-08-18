import type { ActivityAiEnrichment } from '../../../services/ai';
import { createChoreLearningRecord } from './choreLearning';
import {
  addChoreDraftToLearningRecord,
  applyChoreDraftEnrichment,
  createChoreDraft,
} from './choreCreation';

describe('caregiver chore creation', () => {
  const record = createChoreLearningRecord();

  it('starts with conservative household defaults and assigns only an exact child name', () => {
    expect(createChoreDraft('Wipe the table', record.members)).toMatchObject({
      title: 'Wipe the table',
      assignedMemberId: null,
      repeatRule: undefined,
      repeatCustom: undefined,
      repeatBasis: 'scheduled',
      definitionOfDone: '',
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
});
