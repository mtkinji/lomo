// Jest tests for Phase 5.1 deterministic recommendation triggers.
//
// See `_shared/chapterRecommendations.ts`. These tests pin down:
//   * the Arc Nomination trigger FIRES on a real untagged cluster
//     (≥5 activities sharing a meaningful theme token),
//   * it DOES NOT FIRE when the cluster would duplicate an existing Arc,
//   * it DOES NOT FIRE when the cluster is too small,
//   * the dismissal helper `hasAnyRecommendation` correctly reads the
//     output_json shape the client + email template consume.
//
// The recommendation module is framework-free (no Deno imports), so we
// can `require` it directly — no Deno shim needed.

import {
  computeArcNominations,
  extractThemeTokens,
  hasAnyRecommendation,
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
