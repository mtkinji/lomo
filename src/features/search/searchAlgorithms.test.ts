import type { Arc, Goal } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';
import {
  flattenChapterNarrative,
  getRecentArcs,
  getRecentChapters,
  getRecentGoals,
  searchArcs,
  searchChapters,
  searchGoals,
} from './searchAlgorithms';

function makeArc(overrides: Partial<Arc>): Arc {
  const nowIso = new Date().toISOString();
  return {
    id: overrides.id ?? 'arc-1',
    name: overrides.name ?? 'Untitled Arc',
    narrative: overrides.narrative,
    status: overrides.status ?? 'active',
    createdAt: overrides.createdAt ?? nowIso,
    updatedAt: overrides.updatedAt ?? nowIso,
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal>): Goal {
  const nowIso = new Date().toISOString();
  return {
    id: overrides.id ?? 'goal-1',
    arcId: overrides.arcId ?? null,
    title: overrides.title ?? 'Untitled Goal',
    description: overrides.description,
    status: overrides.status ?? 'in_progress',
    forceIntent: overrides.forceIntent ?? {},
    metrics: overrides.metrics ?? [],
    createdAt: overrides.createdAt ?? nowIso,
    updatedAt: overrides.updatedAt ?? nowIso,
    ...overrides,
  };
}

function makeChapter(overrides: Partial<ChapterRow> & { output_json?: any }): ChapterRow {
  const nowIso = new Date().toISOString();
  return {
    id: overrides.id ?? 'chapter-1',
    user_id: 'user-1',
    template_id: 'tpl-1',
    period_start: overrides.period_start ?? nowIso,
    period_end: overrides.period_end ?? nowIso,
    period_key: overrides.period_key ?? '2026-W16',
    input_summary: overrides.input_summary ?? null,
    metrics: overrides.metrics ?? null,
    output_json: overrides.output_json ?? null,
    status: overrides.status ?? 'ready',
    error: overrides.error ?? null,
    emailed_at: overrides.emailed_at ?? null,
    user_note: overrides.user_note ?? null,
    user_note_updated_at: overrides.user_note_updated_at ?? null,
    created_at: overrides.created_at ?? nowIso,
    updated_at: overrides.updated_at ?? nowIso,
  };
}

describe('searchArcs', () => {
  test('returns only arcs whose name/narrative matches the query', () => {
    const arcs = [
      makeArc({ id: 'a1', name: 'Deep Focus Craftsman' }),
      makeArc({ id: 'a2', name: 'Family Rhythms', narrative: 'Show up for Sunday dinners.' }),
      makeArc({ id: 'a3', name: 'Wandering Reader' }),
    ];
    expect(
      searchArcs({ arcs, query: 'focus', includeClosed: false }).map((a) => a.id),
    ).toEqual(['a1']);
    expect(
      searchArcs({ arcs, query: 'sunday', includeClosed: false }).map((a) => a.id),
    ).toEqual(['a2']);
  });

  test('excludes archived arcs unless includeClosed is true', () => {
    const arcs = [
      makeArc({ id: 'a1', name: 'Focus', status: 'archived' }),
      makeArc({ id: 'a2', name: 'Focus again', status: 'active' }),
    ];
    expect(searchArcs({ arcs, query: 'focus', includeClosed: false }).map((a) => a.id)).toEqual([
      'a2',
    ]);
    expect(searchArcs({ arcs, query: 'focus', includeClosed: true }).map((a) => a.id).sort()).toEqual([
      'a1',
      'a2',
    ]);
  });

  test('ranks name matches higher than narrative matches', () => {
    const arcs = [
      makeArc({ id: 'name-hit', name: 'Craftsman' }),
      makeArc({ id: 'narr-hit', name: 'Family', narrative: 'Be a craftsman at home.' }),
    ];
    const results = searchArcs({ arcs, query: 'craftsman', includeClosed: false });
    expect(results[0]?.id).toBe('name-hit');
  });
});

describe('searchGoals', () => {
  test('excludes completed and archived goals unless includeClosed is true', () => {
    const goals = [
      makeGoal({ id: 'g1', title: 'Write book', status: 'in_progress' }),
      makeGoal({ id: 'g2', title: 'Write daily', status: 'completed' }),
      makeGoal({ id: 'g3', title: 'Write less', status: 'archived' }),
    ];
    expect(
      searchGoals({ goals, query: 'write', includeClosed: false }).map((g) => g.id),
    ).toEqual(['g1']);
    expect(
      searchGoals({ goals, query: 'write', includeClosed: true }).map((g) => g.id).sort(),
    ).toEqual(['g1', 'g2', 'g3']);
  });

  test('matches against parent arc name via arcNameById', () => {
    const goals = [makeGoal({ id: 'g1', title: 'Daily essay', arcId: 'arc-1' })];
    const results = searchGoals({
      goals,
      query: 'craftsman',
      includeClosed: false,
      arcNameById: { 'arc-1': 'Deep Focus Craftsman' },
    });
    expect(results.map((g) => g.id)).toEqual(['g1']);
  });
});

describe('searchChapters', () => {
  test('matches against LLM-authored title, dek, and user note', () => {
    const chapters = [
      makeChapter({
        id: 'c1',
        output_json: { title: 'A week of slow mornings', dek: 'Rest returned.' },
      }),
      makeChapter({
        id: 'c2',
        output_json: { title: 'Launch sprint' },
      }),
      makeChapter({
        id: 'c3',
        user_note: 'Worth remembering: the sleep routine stuck.',
      }),
    ];
    expect(searchChapters({ chapters, query: 'slow mornings' }).map((c) => c.id)).toEqual(['c1']);
    expect(searchChapters({ chapters, query: 'launch' }).map((c) => c.id)).toEqual(['c2']);
    expect(searchChapters({ chapters, query: 'sleep' }).map((c) => c.id)).toEqual(['c3']);
  });

  test('skips non-ready chapters', () => {
    const chapters = [
      makeChapter({ id: 'c1', status: 'pending', output_json: { title: 'Draft' } }),
      makeChapter({ id: 'c2', status: 'ready', output_json: { title: 'Draft' } }),
    ];
    expect(searchChapters({ chapters, query: 'draft' }).map((c) => c.id)).toEqual(['c2']);
  });
});

describe('flattenChapterNarrative', () => {
  test('caps concatenated text at 800 characters', () => {
    const longBody = 'a'.repeat(2000);
    const out = flattenChapterNarrative({ sections: [{ body: longBody }] });
    expect(out.length).toBe(800);
  });

  test('returns empty string for null/undefined output', () => {
    expect(flattenChapterNarrative(null)).toBe('');
    expect(flattenChapterNarrative(undefined)).toBe('');
  });
});

describe('getRecent helpers', () => {
  test('getRecentArcs respects includeClosed and sorts by updatedAt desc', () => {
    const arcs = [
      makeArc({ id: 'old', updatedAt: '2024-01-01T00:00:00.000Z' }),
      makeArc({ id: 'new', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeArc({ id: 'arch', status: 'archived', updatedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(getRecentArcs({ arcs, includeClosed: false }).map((a) => a.id)).toEqual(['new', 'old']);
    expect(getRecentArcs({ arcs, includeClosed: true }).map((a) => a.id).slice(0, 1)).toEqual([
      'arch',
    ]);
  });

  test('getRecentGoals and getRecentChapters respect limit', () => {
    const goals = Array.from({ length: 10 }, (_, i) => makeGoal({ id: `g${i}`, title: `G${i}` }));
    expect(getRecentGoals({ goals, includeClosed: true, limit: 3 }).length).toBe(3);

    const chapters = Array.from({ length: 4 }, (_, i) =>
      makeChapter({ id: `c${i}`, period_start: `2026-0${i + 1}-01T00:00:00.000Z` }),
    );
    expect(getRecentChapters({ chapters, limit: 2 }).map((c) => c.id)).toEqual(['c3', 'c2']);
  });
});
