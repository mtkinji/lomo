import type { Activity } from '../../domain/types';
import { searchActivities } from './activitySearchAlgorithm';

function makeActivity(overrides: Partial<Activity>): Activity {
  const nowIso = new Date().toISOString();
  return {
    id: overrides.id ?? 'a',
    goalId: overrides.goalId ?? null,
    title: overrides.title ?? 'Untitled',
    type: overrides.type ?? 'task',
    tags: overrides.tags ?? [],
    status: overrides.status ?? 'planned',
    forceActual: overrides.forceActual ?? {},
    createdAt: overrides.createdAt ?? nowIso,
    updatedAt: overrides.updatedAt ?? nowIso,
    ...overrides,
  };
}

describe('activitySearchAlgorithm.searchActivities', () => {
  test('does not include non-matching activities even if they are very recent', () => {
    const q = 'app launch checklist';
    const goalTitleById: Record<string, string> = {};

    const matching = makeActivity({
      id: 'match',
      title: 'App launch checklist',
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // older
    });

    const nonMatchingRecent = makeActivity({
      id: 'recent-non-match',
      title: 'Finalize marketing site & screenshots',
      updatedAt: new Date().toISOString(), // very recent => high recency score
    });

    const results = searchActivities({
      activities: [nonMatchingRecent, matching],
      query: q,
      goalTitleById,
    });

    expect(results.map((a) => a.id)).toEqual(['match']);
  });

  test('matches against goal title as well as activity title', () => {
    const goalTitleById: Record<string, string> = { g1: 'App launch' };
    const a = makeActivity({ id: 'a1', title: 'Checklist', goalId: 'g1' });

    const results = searchActivities({
      activities: [a],
      query: 'app launch',
      goalTitleById,
    });

    expect(results.map((row) => row.id)).toEqual(['a1']);
  });
});


