// Jest tests for Phase 5.1 + 6 deterministic recommendation triggers.
//
// See `_shared/chapterRecommendations.ts`. These tests pin down:
//   * Phase 5: Arc Nomination triggers on a real untagged cluster,
//     doesn't fire when the cluster would duplicate an existing Arc,
//     doesn't fire when the cluster is too small.
//   * Phase 6: Goal Nomination fires when a ≥3 untagged-by-Goal
//     cluster shares a theme inside an existing Arc; Align suggestions
//     fire when ≥2 untagged activities mention an existing Arc's name.
//   * The orchestrator applies priority (`arc > goal > align`),
//     enforces the 3-cap, and dedupes cross-kind token overlap.
//   * `hasAnyRecommendation` correctly reads the output_json shape the
//     client + email template consume.
//
// The recommendation module is framework-free (no Deno imports), so we
// can `require` it directly — no Deno shim needed.

import {
  computeArcNominations,
  computeAlignSuggestions,
  computeChapterRecommendations,
  computeGoalNominations,
  extractThemeTokens,
  hasAnyRecommendation,
  MAX_RECOMMENDATIONS_PER_CHAPTER,
} from '../chapterRecommendations';

function untaggedActivity(
  id: string,
  title: string,
): { id: string; title: string; arcId: null } {
  return { id, title, arcId: null };
}

describe('extractThemeTokens', () => {
  it('drops stopwords and short tokens', () => {
    const tokens = extractThemeTokens('Read the climbing weekly plan for kids').sort();
    // English stopwords ('the', 'for') and Kwilt activity-verb stopwords
    // ('read', 'plan', 'weekly') get dropped; meaningful theme tokens
    // ('climbing', 'kids') remain.
    expect(tokens).toEqual(['climbing', 'kids']);
  });

  it('dedupes repeated tokens within the same title', () => {
    const tokens = extractThemeTokens('pottery pottery pottery pottery');
    expect(tokens).toEqual(['pottery']);
  });

  it('is case-insensitive', () => {
    const tokens = extractThemeTokens('Climbing session at GYM');
    expect(tokens.sort()).toEqual(['climbing', 'session']);
  });
});

describe('computeArcNominations — Arc Nomination trigger', () => {
  it('fires when ≥5 untagged activities share a theme token', () => {
    const recs = computeArcNominations({
      activitiesIncluded: [
        untaggedActivity('a1', 'Pottery class with Sam'),
        untaggedActivity('a2', 'Evening pottery practice'),
        untaggedActivity('a3', 'Pottery studio cleanup'),
        untaggedActivity('a4', 'Pottery wheel session'),
        untaggedActivity('a5', 'Buy pottery supplies'),
      ],
      arcById: {
        'arc-fitness': { title: 'Fitness' },
        'arc-family': { title: 'Family' },
      },
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe('arc');
    expect(recs[0].payload.title).toBe('Pottery');
    expect(recs[0].id).toBe('rec-arc-pottery');
    expect(recs[0].evidence_summary.activity_count).toBe(5);
    expect(recs[0].evidence_ids).toHaveLength(5);
    expect(recs[0].reason).toMatch(/"Pottery"/);
    expect(recs[0].reason).toMatch(/5 activities this period/);
  });

  it('does NOT fire when the token duplicates an existing Arc title', () => {
    const recs = computeArcNominations({
      activitiesIncluded: [
        untaggedActivity('a1', 'Pottery class with Sam'),
        untaggedActivity('a2', 'Evening pottery practice'),
        untaggedActivity('a3', 'Pottery studio cleanup'),
        untaggedActivity('a4', 'Pottery wheel session'),
        untaggedActivity('a5', 'Buy pottery supplies'),
      ],
      arcById: {
        'arc-pottery': { title: 'My Pottery Journey' },
      },
    });

    expect(recs).toHaveLength(0);
  });

  it('does NOT fire when fewer than 5 candidates share a token', () => {
    const recs = computeArcNominations({
      activitiesIncluded: [
        untaggedActivity('a1', 'Pottery class with Sam'),
        untaggedActivity('a2', 'Evening pottery practice'),
        untaggedActivity('a3', 'Pottery studio cleanup'),
        untaggedActivity('a4', 'Pottery wheel session'),
        // Only 4 — below the floor.
      ],
      arcById: {},
    });

    expect(recs).toHaveLength(0);
  });

  it('does NOT fire when the cluster is fully arc-tagged (no untagged candidates)', () => {
    const recs = computeArcNominations({
      activitiesIncluded: [
        { id: 'a1', title: 'Pottery class', arcId: 'arc-art' },
        { id: 'a2', title: 'Pottery studio', arcId: 'arc-art' },
        { id: 'a3', title: 'Pottery wheel', arcId: 'arc-art' },
        { id: 'a4', title: 'Pottery supplies', arcId: 'arc-art' },
        { id: 'a5', title: 'Pottery class 2', arcId: 'arc-art' },
      ],
      arcById: { 'arc-art': { title: 'Art' } },
    });

    expect(recs).toHaveLength(0);
  });

  it('ignores filler activity-verbs in the token search', () => {
    // If the miner counted "call" / "email" / "meeting", these five all
    // share "call" and would falsely trigger. The stopword list drops them.
    const recs = computeArcNominations({
      activitiesIncluded: [
        untaggedActivity('a1', 'Call mom'),
        untaggedActivity('a2', 'Call Sam'),
        untaggedActivity('a3', 'Call plumber'),
        untaggedActivity('a4', 'Call garage'),
        untaggedActivity('a5', 'Call insurance'),
      ],
      arcById: {},
    });

    expect(recs).toHaveLength(0);
  });

  it('returns at most one nomination even when multiple tokens qualify', () => {
    // Build a pool where two tokens each hit ≥5 candidates. v1 contract:
    // one winner only (the higher-count one, ties broken by insertion).
    const recs = computeArcNominations({
      activitiesIncluded: [
        untaggedActivity('a1', 'Pottery and drawing'),
        untaggedActivity('a2', 'Pottery and drawing'),
        untaggedActivity('a3', 'Pottery and drawing'),
        untaggedActivity('a4', 'Pottery and drawing'),
        untaggedActivity('a5', 'Pottery and drawing'),
        untaggedActivity('a6', 'Drawing'),
      ],
      arcById: {},
    });

    expect(recs).toHaveLength(1);
    // Both 'pottery' (5) and 'drawing' (6) qualify; the winner is the
    // higher-count token, 'drawing'.
    expect(recs[0].payload.title).toBe('Drawing');
  });
});

describe('computeGoalNominations — Goal Nomination trigger', () => {
  function untaggedAct(
    id: string,
    title: string,
  ): { id: string; title: string; arcId: null; goalId: null } {
    return { id, title, arcId: null, goalId: null };
  }

  it('fires when ≥3 untagged activities match an existing Arc\'s head token', () => {
    const recs = computeGoalNominations({
      activitiesIncluded: [
        untaggedAct('a1', 'Family dinner with Sam'),
        untaggedAct('a2', 'Family walk'),
        untaggedAct('a3', 'Family game night'),
      ],
      arcById: {
        'arc-family': { id: 'arc-family', title: 'Family' },
      },
      goalsByArcId: {},
    });
    // NOTE: the Goal trigger here fires on "family" matching the
    // "Family" Arc's head token. Arc Nomination would NOT fire (it
    // needs ≥5 and the existing "Family" Arc gates it out).
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe('goal');
    expect(recs[0].payload.title).toBe('Family');
    expect(recs[0].payload.arcId).toBe('arc-family');
    expect(recs[0].payload.arcTitle).toBe('Family');
    expect(recs[0].reason).toMatch(/Family Arc/);
  });

  it('does NOT fire when the token duplicates an existing Goal under the matched Arc', () => {
    const recs = computeGoalNominations({
      activitiesIncluded: [
        untaggedAct('a1', 'Family dinner'),
        untaggedAct('a2', 'Family walk'),
        untaggedAct('a3', 'Family game night'),
      ],
      arcById: {
        'arc-family': { id: 'arc-family', title: 'Family' },
      },
      goalsByArcId: {
        'arc-family': [{ id: 'goal-1', arcId: 'arc-family', title: 'Family Time' }],
      },
    });
    expect(recs).toHaveLength(0);
  });

  it('does NOT fire when activities already have a Goal', () => {
    const recs = computeGoalNominations({
      activitiesIncluded: [
        { id: 'a1', title: 'Family a', arcId: 'arc-family', goalId: 'g-1' },
        { id: 'a2', title: 'Family b', arcId: 'arc-family', goalId: 'g-1' },
        { id: 'a3', title: 'Family c', arcId: 'arc-family', goalId: 'g-1' },
      ],
      arcById: { 'arc-family': { id: 'arc-family', title: 'Family' } },
      goalsByArcId: {},
    });
    expect(recs).toHaveLength(0);
  });

  it('does NOT fire when no existing Arc matches the token', () => {
    // Three untagged "pottery" activities but no Pottery Arc. The
    // Phase 5 Arc Nomination trigger would handle this case (given
    // ≥5); Goal Nomination must NOT fire because there's nowhere to
    // put the new Goal.
    const recs = computeGoalNominations({
      activitiesIncluded: [
        untaggedAct('a1', 'Pottery 1'),
        untaggedAct('a2', 'Pottery 2'),
        untaggedAct('a3', 'Pottery 3'),
      ],
      arcById: { 'arc-fit': { id: 'arc-fit', title: 'Fitness' } },
      goalsByArcId: {},
    });
    expect(recs).toHaveLength(0);
  });

  it('does NOT fire when the cluster is below 3', () => {
    const recs = computeGoalNominations({
      activitiesIncluded: [
        untaggedAct('a1', 'Family 1'),
        untaggedAct('a2', 'Family 2'),
      ],
      arcById: { 'arc-family': { id: 'arc-family', title: 'Family' } },
      goalsByArcId: {},
    });
    expect(recs).toHaveLength(0);
  });
});

describe('computeAlignSuggestions — Align trigger', () => {
  function untagged(
    id: string,
    title: string,
  ): { id: string; title: string; arcId: null; goalId: null } {
    return { id, title, arcId: null, goalId: null };
  }

  it('fires when ≥2 untagged activities match an existing Goal head token', () => {
    const recs = computeAlignSuggestions({
      activitiesIncluded: [
        untagged('a1', 'Morning climbing along the crag'),
        untagged('a2', 'Evening climbing with Sam'),
        untagged('a3', 'Pottery class'),
      ],
      arcById: {
        'arc-fit': { id: 'arc-fit', title: 'Fitness' },
      },
      goalsAll: [
        { id: 'goal-climb', arcId: 'arc-fit', title: 'Climbing consistency' },
      ],
    });
    expect(recs).toHaveLength(1);
    expect(recs[0].kind).toBe('align');
    expect(recs[0].payload.goalId).toBe('goal-climb');
    expect(recs[0].payload.goalTitle).toBe('Climbing consistency');
    expect(recs[0].payload.arcId).toBe('arc-fit');
    expect(recs[0].payload.arcTitle).toBe('Fitness');
    expect(recs[0].payload.activityIds).toEqual(['a1', 'a2']);
    expect(recs[0].evidence_summary.activity_count).toBe(2);
  });

  it('does NOT fire when only 1 untagged activity matches', () => {
    const recs = computeAlignSuggestions({
      activitiesIncluded: [
        untagged('a1', 'Morning climbing'),
        untagged('a2', 'Gym'),
      ],
      arcById: { 'arc-fit': { id: 'arc-fit', title: 'Fitness' } },
      goalsAll: [{ id: 'goal-climb', arcId: 'arc-fit', title: 'Climbing project' }],
    });
    expect(recs).toHaveLength(0);
  });

  it('does NOT fire on stopword-title Goals', () => {
    const recs = computeAlignSuggestions({
      activitiesIncluded: [
        untagged('a1', 'Plan the trip'),
        untagged('a2', 'Plan the budget'),
      ],
      arcById: {},
      goalsAll: [{ id: 'goal-plan', arcId: null, title: 'Plan properly' }],
    });
    expect(recs).toHaveLength(0);
  });

  it('ignores already-tagged activities', () => {
    const recs = computeAlignSuggestions({
      activitiesIncluded: [
        { id: 'a1', title: 'Morning run', arcId: 'arc-fit', goalId: 'goal-run' },
        { id: 'a2', title: 'Evening run', arcId: 'arc-fit', goalId: 'goal-run' },
      ],
      arcById: { 'arc-fit': { id: 'arc-fit', title: 'Fitness' } },
      goalsAll: [{ id: 'goal-run', arcId: 'arc-fit', title: 'Running project' }],
    });
    expect(recs).toHaveLength(0);
  });
});

describe('computeChapterRecommendations — orchestrator', () => {
  it('prioritizes arc > goal > align under the 3-cap', () => {
    const recs = computeChapterRecommendations({
      activitiesIncluded: [
        // 5 untagged "pottery" activities → fires Arc Nomination
        // (no Pottery Arc exists).
        { id: 'p1', title: 'Pottery class 1', arcId: null, goalId: null },
        { id: 'p2', title: 'Pottery class 2', arcId: null, goalId: null },
        { id: 'p3', title: 'Pottery class 3', arcId: null, goalId: null },
        { id: 'p4', title: 'Pottery class 4', arcId: null, goalId: null },
        { id: 'p5', title: 'Pottery class 5', arcId: null, goalId: null },
        // 3 untagged "climbing" activities, existing Fitness Arc → Goal
        // nomination (Fitness has no Climbing Goal yet).
        { id: 'c1', title: 'Climbing session 1', arcId: null, goalId: null },
        { id: 'c2', title: 'Climbing session 2', arcId: null, goalId: null },
        { id: 'c3', title: 'Climbing session 3', arcId: null, goalId: null },
        // 2 untagged "reading" activities and an existing "Reading"
        // Goal → Align suggestion.
        { id: 'r1', title: 'Morning reading time', arcId: null, goalId: null },
        { id: 'r2', title: 'Evening reading with kids', arcId: null, goalId: null },
      ],
      arcById: {
        'arc-fit': { id: 'arc-fit', title: 'Fitness' },
        'arc-climbing': { id: 'arc-climbing', title: 'Climbing' },
      },
      goalsByArcId: {
        'arc-fit': [{ id: 'g-read', arcId: 'arc-fit', title: 'Reading consistency' }],
      },
      goalsAll: [{ id: 'g-read', arcId: 'arc-fit', title: 'Reading consistency' }],
    });
    // NOTE: the Phase 5 arc-nom "must-not-substring-existing-Arcs"
    // gate means Climbing clusters are actually GATED OUT on arc-nom
    // because an "Climbing" Arc exists. So 'Pottery' still fires arc;
    // 'climbing' falls to goal; 'running' falls to align. Cap = 3.
    expect(recs.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS_PER_CHAPTER);
    expect(recs.map((r) => r.kind)).toEqual(['arc', 'goal', 'align']);
  });

  it('dedupes align when the same token is claimed by a goal nomination', () => {
    // ≥3 untagged "climbing" activities. There's a Climbing Arc with
    // NO Climbing Goal → fires Goal nomination. There's also a
    // "Climbing practice" Goal under a DIFFERENT Arc — which would
    // theoretically match the align trigger. Orchestrator should keep
    // the goal nomination and drop the align.
    const recs = computeChapterRecommendations({
      activitiesIncluded: [
        { id: 'c1', title: 'Climbing session 1', arcId: null, goalId: null },
        { id: 'c2', title: 'Climbing session 2', arcId: null, goalId: null },
        { id: 'c3', title: 'Climbing session 3', arcId: null, goalId: null },
      ],
      arcById: {
        'arc-fit': { id: 'arc-fit', title: 'Climbing' },
        'arc-other': { id: 'arc-other', title: 'Hobbies' },
      },
      goalsByArcId: {
        // Empty: no Goal under the matched arc.
      },
      // But a Goal with a climbing-y title exists elsewhere. The
      // orchestrator should prefer the goal nomination (under the
      // exactly-matching Arc) over the align suggestion (under a
      // different Arc's Climbing Goal).
      goalsAll: [
        { id: 'g-other', arcId: 'arc-other', title: 'Climbing sessions with Pat' },
      ],
    });
    expect(recs.map((r) => r.kind)).toEqual(['goal']);
  });

  it('caps the output at MAX_RECOMMENDATIONS_PER_CHAPTER', () => {
    // 4 matching Arc/Goal clusters → 4 goal noms. Cap should trim to 3.
    const recs = computeChapterRecommendations({
      activitiesIncluded: [
        { id: 'a1', title: 'Family dinner 1', arcId: null, goalId: null },
        { id: 'a2', title: 'Family dinner 2', arcId: null, goalId: null },
        { id: 'a3', title: 'Family dinner 3', arcId: null, goalId: null },
        { id: 'b1', title: 'Fitness 1', arcId: null, goalId: null },
        { id: 'b2', title: 'Fitness 2', arcId: null, goalId: null },
        { id: 'b3', title: 'Fitness 3', arcId: null, goalId: null },
        { id: 'c1', title: 'Pottery 1', arcId: null, goalId: null },
        { id: 'c2', title: 'Pottery 2', arcId: null, goalId: null },
        { id: 'c3', title: 'Pottery 3', arcId: null, goalId: null },
        { id: 'd1', title: 'Drawing 1', arcId: null, goalId: null },
        { id: 'd2', title: 'Drawing 2', arcId: null, goalId: null },
        { id: 'd3', title: 'Drawing 3', arcId: null, goalId: null },
      ],
      arcById: {
        'arc-family': { id: 'arc-family', title: 'Family' },
        'arc-fitness': { id: 'arc-fitness', title: 'Fitness' },
        'arc-pottery': { id: 'arc-pottery', title: 'Pottery' },
        'arc-drawing': { id: 'arc-drawing', title: 'Drawing' },
      },
      goalsByArcId: {},
      goalsAll: [],
    });
    expect(recs).toHaveLength(MAX_RECOMMENDATIONS_PER_CHAPTER);
    for (const r of recs) expect(r.kind).toBe('goal');
  });
});

describe('hasAnyRecommendation', () => {
  it('returns false for legacy output_json without the field', () => {
    expect(hasAnyRecommendation({ sections: [] })).toBe(false);
    expect(hasAnyRecommendation({})).toBe(false);
    expect(hasAnyRecommendation(null)).toBe(false);
    expect(hasAnyRecommendation(undefined)).toBe(false);
  });

  it('returns false for an empty recommendations array', () => {
    expect(hasAnyRecommendation({ recommendations: [] })).toBe(false);
  });

  it('returns true when at least one well-formed recommendation is present', () => {
    expect(
      hasAnyRecommendation({
        recommendations: [
          { id: 'rec-arc-x', kind: 'arc', payload: { title: 'X' }, reason: 'y', evidence_ids: [] },
        ],
      }),
    ).toBe(true);
  });

  it('ignores malformed entries', () => {
    expect(
      hasAnyRecommendation({
        recommendations: [null, { no_kind: true }, 'rec'],
      }),
    ).toBe(false);
  });
});
