import type { Activity } from '../domain/types';
import type { ActivityTagHistoryIndex } from '../store/useAppStore';
import { buildActivityTagVocabularyOptions, findExistingTagLabel } from './activityTagVocabulary';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: null,
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

describe('buildActivityTagVocabularyOptions', () => {
  it('dedupes tags case-insensitively and preserves the history label', () => {
    const history: ActivityTagHistoryIndex = {
      groceries: {
        tag: 'Groceries',
        firstUsedAt: '2026-06-01T12:00:00.000Z',
        lastUsedAt: '2026-06-10T12:00:00.000Z',
        totalUses: 4,
        recentUses: [],
      },
    };

    const options = buildActivityTagVocabularyOptions({
      activityTagHistory: history,
      activities: [activity({ id: 'milk', tags: ['groceries'], updatedAt: '2026-06-12T12:00:00.000Z' })],
    });

    expect(options[0]).toEqual({
      key: 'groceries',
      label: 'Groceries',
      activeCount: 1,
      totalUses: 4,
      lastUsedAt: '2026-06-12T12:00:00.000Z',
    });
  });

  it('puts exact and prefix matches ahead of broader contains matches', () => {
    const options = buildActivityTagVocabularyOptions({
      query: 'gro',
      activityTagHistory: {
        schoolgroceries: {
          tag: 'SchoolGroceries',
          firstUsedAt: '2026-06-01T12:00:00.000Z',
          lastUsedAt: '2026-06-20T12:00:00.000Z',
          totalUses: 20,
          recentUses: [],
        },
        groceries: {
          tag: 'Groceries',
          firstUsedAt: '2026-06-01T12:00:00.000Z',
          lastUsedAt: '2026-06-01T12:00:00.000Z',
          totalUses: 1,
          recentUses: [],
        },
      },
    });

    expect(options.map((option) => option.label)).toEqual(['Groceries', 'SchoolGroceries']);
  });

  it('can exclude tags that are already selected', () => {
    const options = buildActivityTagVocabularyOptions({
      excludeTags: ['Groceries'],
      activities: [
        activity({ id: 'milk', tags: ['Groceries'] }),
        activity({ id: 'school', tags: ['School'] }),
      ],
    });

    expect(options.map((option) => option.label)).toEqual(['School']);
  });
});

describe('findExistingTagLabel', () => {
  it('returns the canonical label for an exact normalized match', () => {
    expect(findExistingTagLabel('groceries', [{ key: 'groceries', label: 'Groceries' }])).toBe('Groceries');
  });
});
