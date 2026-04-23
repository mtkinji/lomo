// Chapter Next Steps — deterministic recommendation triggers.
//
// See docs/chapters-plan.md Phases 5–6. Recommendations are a typed,
// server-computed output that powers the Next Steps UI on the Chapter detail
// screen and the Next-Steps hint in the weekly digest email.
//
// Design choices:
//   * Deterministic only — no LLM. Each trigger is a pure function over
//     metrics + evidence, unit-testable and safe to run on every Chapter.
//   * `reason` is a deterministic template string. The plan leaves room to
//     upgrade `reason` to LLM-authored copy later; that requires adding a
//     new prompt-schema field + validator slot. We ship the deterministic
//     copy to keep the trigger side shippable in isolation.
//   * Phase 5 v1 shipped `kind: 'arc'` (untagged-activity cluster).
//     Phase 6 adds `kind: 'goal'` (untagged-by-Goal cluster under an
//     existing Arc) and `kind: 'align'` (untagged activities whose titles
//     match an existing Arc). The `kind: 'activity'` trigger is
//     *deferred* — it naturally depends on prior-Chapter context
//     (`next_experiments` prose carried forward by Phase 7 / the Next-
//     Step-outcomes work in Phase 8), and is cleanest to ship once that
//     context plumb exists.
//   * Triggers share the `recommendations[]` field + the 3-cap
//     prioritization (`arc > goal > activity > align`) enforced by
//     `computeChapterRecommendations`.
//   * Kept framework-free (no Deno / Supabase imports) so Jest can test it
//     alongside periodLabels / emailTemplates.
//
// IMPORTANT: the shapes defined here are contracts consumed by the client
// (`src/features/chapters/ChapterDetailScreen.tsx`) and the digest email
// builder (`supabase/functions/_shared/emailTemplates.ts`). Keep them
// stable or version them.

export type ChapterRecommendationArc = {
  id: string;
  kind: 'arc';
  payload: { title: string };
  reason: string;
  evidence_ids: string[];
  evidence_summary: { activity_count: number; sample_titles: string[] };
};

export type ChapterRecommendationGoal = {
  id: string;
  kind: 'goal';
  payload: {
    title: string;
    // The existing Arc this Goal should be created under. Surfacing both
    // fields lets the client deep-link into the Arc (`arcId`) and show
    // readable copy (`arcTitle`) without a round-trip.
    arcId: string;
    arcTitle: string;
  };
  reason: string;
  evidence_ids: string[];
  evidence_summary: { activity_count: number; sample_titles: string[] };
};

export type ChapterRecommendationAlign = {
  id: string;
  kind: 'align';
  payload: {
    // The target Goal the untagged activities should be assigned to.
    // Activities in the Kwilt model belong to Goals (not directly to
    // Arcs), so Align always targets a specific Goal — the Arc is
    // carried alongside purely for display copy.
    goalId: string;
    goalTitle: string;
    arcId: string | null;
    arcTitle: string | null;
    // The activity ids the user is invited to tag in one tap. Kept
    // inline in the payload (not only in evidence_ids) so the client
    // can render and act on them without joining against Chapter
    // metrics.
    activityIds: string[];
  };
  reason: string;
  evidence_ids: string[];
  evidence_summary: { activity_count: number; sample_titles: string[] };
};

export type ChapterRecommendation =
  | ChapterRecommendationArc
  | ChapterRecommendationGoal
  | ChapterRecommendationAlign;

export type RecommendationActivity = {
  id: string;
  title?: string | null;
  arcId?: string | null;
  goalId?: string | null;
};

export type RecommendationArc = {
  id?: string | null;
  title?: string | null;
};

export type RecommendationGoal = {
  id?: string | null;
  arcId?: string | null;
  title?: string | null;
};

// Common filler tokens the untagged-cluster miner should ignore. Kept small
// and conservative; the goal is to suppress obvious English glue + Kwilt's
// most common activity-verb noise, not to do full NLP. Four-char minimum on
// token extraction already filters most garbage (e.g. "and", "the", "for",
// "my").
export const RECOMMENDATION_STOPWORDS = new Set<string>([
  'about', 'after', 'again', 'against', 'another', 'around', 'because',
  'before', 'being', 'between', 'could', 'doing', 'during', 'every',
  'first', 'from', 'further', 'going', 'have', 'having', 'here', 'into',
  'just', 'keep', 'kind', 'last', 'later', 'like', 'make', 'making',
  'maybe', 'most', 'much', 'need', 'next', 'once', 'only', 'other',
  'over', 'some', 'such', 'take', 'than', 'that', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'today',
  'tomorrow', 'want', 'week', 'weekly', 'well', 'were', 'what', 'when',
  'where', 'which', 'while', 'will', 'with', 'would', 'your', 'yours',
  // Kwilt-specific: verbs that appear in activity titles but aren't the
  // *domain* of a potential Arc. ("Send follow-up" doesn't suggest a
  // Follow-up Arc.)
  'call', 'email', 'meet', 'meeting', 'send', 'review', 'update',
  'reply', 'follow', 'check', 'book', 'plan', 'prep', 'note', 'read',
  'write', 'draft', 'edit', 'task', 'item',
]);

/**
 * Extract candidate theme tokens from an activity title. Lowercase,
 * pull all 4+ letter word tokens, drop stopwords, dedupe per-title so a
 * single activity whose title repeats a token doesn't count twice toward
 * that token's cluster.
 */
export function extractThemeTokens(title: string): string[] {
  const lower = title.toLowerCase();
  const matches = lower.match(/[a-z]{4,}/g) ?? [];
  const out = new Set<string>();
  for (const t of matches) {
    if (RECOMMENDATION_STOPWORDS.has(t)) continue;
    out.add(t);
  }
  return Array.from(out);
}

/**
 * Arc Nomination trigger (Phase 5.1).
 *
 * Detects ≥5 in-period activities that share a detectable theme token AND
 * belong to NO existing Arc. Returns 0 or 1 nomination — v1 caps at a
 * single Arc Nomination per Chapter; Phase 6 expands to other `kind`s
 * under a shared 3-cap.
 *
 * Rejection conditions (return empty array):
 *   1. Fewer than 5 in-period, arc-less candidate activities exist.
 *   2. No single token is shared by ≥5 candidates.
 *   3. The winning token appears as a substring in any existing Arc's
 *      title (case-insensitive). This is the plan's "must be distinct
 *      from every existing Arc" gate — coarse but reliable for a
 *      top-token heuristic.
 *
 * The returned `reason` is deterministic template copy. See module header
 * for why.
 */
export function computeArcNominations(params: {
  activitiesIncluded: RecommendationActivity[];
  arcById: Record<string, RecommendationArc | undefined>;
}): ChapterRecommendationArc[] {
  const { activitiesIncluded, arcById } = params;

  const candidates = activitiesIncluded.filter((a) => !a.arcId);
  if (candidates.length < 5) return [];

  const tokenCounts = new Map<
    string,
    { count: number; ids: string[]; titles: string[] }
  >();

  for (const a of candidates) {
    const title = typeof a.title === 'string' ? a.title : '';
    if (!title.trim()) continue;
    const tokens = extractThemeTokens(title);
    for (const t of tokens) {
      const cur = tokenCounts.get(t) ?? { count: 0, ids: [], titles: [] };
      cur.count += 1;
      cur.ids.push(String(a.id));
      cur.titles.push(title.trim());
      tokenCounts.set(t, cur);
    }
  }

  let winner:
    | { token: string; count: number; ids: string[]; titles: string[] }
    | null = null;
  for (const [token, data] of tokenCounts.entries()) {
    if (data.count < 5) continue;
    if (!winner || data.count > winner.count) {
      winner = { token, count: data.count, ids: data.ids, titles: data.titles };
    }
  }
  if (!winner) return [];

  const existingArcTitles = Object.values(arcById)
    .map((a) => (typeof a?.title === 'string' ? a.title.toLowerCase() : ''))
    .filter((s): s is string => s.length > 0);
  if (existingArcTitles.some((t) => t.includes(winner!.token))) return [];

  const titleCase =
    winner.token.length > 0
      ? winner.token.charAt(0).toUpperCase() + winner.token.slice(1)
      : winner.token;
  const samples = winner.titles.slice(0, 3);
  const samplesQuoted = samples.map((t) => `"${t}"`).join(', ');
  const reason =
    `${winner.count} activities this period — including ${samplesQuoted} — share a "${titleCase}" theme but don't belong to any Arc. Naming an Arc here turns a thread you're already pulling into something Kwilt can track.`;

  return [
    {
      id: `rec-arc-${winner.token}`,
      kind: 'arc',
      payload: { title: titleCase },
      reason,
      evidence_ids: winner.ids.slice(0, 10),
      evidence_summary: {
        activity_count: winner.count,
        sample_titles: samples,
      },
    },
  ];
}

/**
 * Goal Nomination trigger (Phase 6).
 *
 * Detects ≥3 in-period activities that have NO Goal attached
 * (`goalId == null`) AND share a theme token that matches the head
 * token of an EXISTING Arc. Emits one Goal Nomination per qualifying
 * (Arc × theme token) pair. The orchestrator applies the global 3-cap
 * and priority ordering.
 *
 * Semantics match the Kwilt data model: activities are assigned to
 * Arcs via a Goal (there is no direct `activity.arcId`). "Create a
 * Goal for this cluster" is only meaningful when the Arc already
 * exists — otherwise the right next step is an Arc Nomination, which
 * the Phase 5 trigger already handles.
 *
 * Rejection conditions (per Arc × token):
 *   1. Fewer than 3 matching candidates.
 *   2. The winning token is a substring of any existing Goal title
 *      under the target Arc (case-insensitive). Prevents re-nominating
 *      a Goal the user already has.
 *   3. The token matches an existing Arc title (would have fired an
 *      Arc Nomination elsewhere) — this is handled by the orchestrator
 *      dedupe step, not here, to keep this function independent and
 *      testable.
 */
export function computeGoalNominations(params: {
  activitiesIncluded: RecommendationActivity[];
  arcById: Record<string, RecommendationArc | undefined>;
  goalsByArcId: Record<string, RecommendationGoal[]>;
}): ChapterRecommendationGoal[] {
  const { activitiesIncluded, arcById, goalsByArcId } = params;

  // Candidates are activities with no Goal. Whether they have an
  // effective arcId or not doesn't block goal-nom consideration — the
  // match is against the theme token, not the assigned Arc.
  const candidates = activitiesIncluded.filter((a) => !a.goalId);
  if (candidates.length < 3) return [];

  // Count theme tokens across candidates.
  const tokenCounts = new Map<
    string,
    { count: number; ids: string[]; titles: string[] }
  >();
  for (const a of candidates) {
    const title = typeof a.title === 'string' ? a.title : '';
    if (!title.trim()) continue;
    const tokens = extractThemeTokens(title);
    for (const t of tokens) {
      const cur = tokenCounts.get(t) ?? { count: 0, ids: [], titles: [] };
      cur.count += 1;
      cur.ids.push(String(a.id));
      cur.titles.push(title.trim());
      tokenCounts.set(t, cur);
    }
  }

  const out: ChapterRecommendationGoal[] = [];

  for (const [token, data] of tokenCounts.entries()) {
    if (data.count < 3) continue;

    // Find an Arc whose head token matches this theme. Head-token
    // match is deliberate (rather than full-title substring) so an Arc
    // "Family Time" matches untagged "family dinner" activities.
    let matchedArcId: string | null = null;
    let matchedArcTitle: string | null = null;
    for (const [arcId, arc] of Object.entries(arcById)) {
      const rawTitle = typeof arc?.title === 'string' ? arc.title.trim() : '';
      if (!rawTitle) continue;
      const head = rawTitle.toLowerCase().match(/[a-z]{4,}/)?.[0];
      if (!head || RECOMMENDATION_STOPWORDS.has(head)) continue;
      if (head === token) {
        matchedArcId = arcId;
        matchedArcTitle = rawTitle;
        break;
      }
    }
    if (!matchedArcId || !matchedArcTitle) continue;

    // Don't nominate a Goal that's already there.
    const existingGoalTitlesInArc = (goalsByArcId[matchedArcId] ?? [])
      .map((g) => (typeof g?.title === 'string' ? g.title.toLowerCase() : ''))
      .filter((s): s is string => s.length > 0);
    if (existingGoalTitlesInArc.some((t) => t.includes(token))) continue;

    const titleCase = token.charAt(0).toUpperCase() + token.slice(1);
    const samples = data.titles.slice(0, 3);
    const samplesQuoted = samples.map((t) => `"${t}"`).join(', ');
    const reason =
      `${data.count} untagged activities this period — including ${samplesQuoted} — match the ${matchedArcTitle} Arc. Adding a ${titleCase} Goal under ${matchedArcTitle} gives this thread a home for next week.`;

    out.push({
      id: `rec-goal-${matchedArcId}-${token}`,
      kind: 'goal',
      payload: {
        title: titleCase,
        arcId: matchedArcId,
        arcTitle: matchedArcTitle,
      },
      reason,
      evidence_ids: data.ids.slice(0, 10),
      evidence_summary: {
        activity_count: data.count,
        sample_titles: samples,
      },
    });
  }

  return out;
}

/**
 * Align Suggestion trigger (Phase 6).
 *
 * Detects ≥2 untagged (no goalId) activities whose titles share a
 * theme word with an EXISTING Goal's title. Emits one Align suggestion
 * per qualifying Goal. CTA: tag these activities with that Goal in
 * one step.
 *
 * Rejection conditions (per Goal):
 *   * Goal title has no theme token ≥4 chars (after stopword filter).
 *   * Fewer than 2 matching untagged activities.
 *
 * De-duplication with Arc nominations is handled by
 * `computeChapterRecommendations`, not here.
 */
export function computeAlignSuggestions(params: {
  activitiesIncluded: RecommendationActivity[];
  arcById: Record<string, RecommendationArc | undefined>;
  goalsAll: RecommendationGoal[];
}): ChapterRecommendationAlign[] {
  const { activitiesIncluded, arcById, goalsAll } = params;

  const untagged = activitiesIncluded.filter((a) => !a.goalId);
  if (untagged.length === 0) return [];

  const out: ChapterRecommendationAlign[] = [];

  for (const goal of goalsAll) {
    const goalId = typeof goal?.id === 'string' && goal.id ? goal.id : null;
    const rawGoalTitle =
      typeof goal?.title === 'string' ? goal.title.trim() : '';
    if (!goalId || !rawGoalTitle) continue;

    // First theme token of the goal title, filtered by stopwords.
    const headToken = rawGoalTitle.toLowerCase().match(/[a-z]{4,}/)?.[0];
    if (!headToken) continue;
    if (RECOMMENDATION_STOPWORDS.has(headToken)) continue;

    const matchRegex = new RegExp(`\\b${headToken}\\b`, 'i');
    const matches = untagged.filter((a) => {
      const title = typeof a.title === 'string' ? a.title : '';
      return title && matchRegex.test(title);
    });
    if (matches.length < 2) continue;

    const ids = matches.map((a) => String(a.id));
    const titles = matches
      .map((a) => (typeof a.title === 'string' ? a.title.trim() : ''))
      .filter((s): s is string => s.length > 0);
    const samples = titles.slice(0, 3);
    const samplesQuoted = samples.map((t) => `"${t}"`).join(', ');

    const arcId = typeof goal?.arcId === 'string' ? goal.arcId : null;
    const arcTitle = arcId
      ? typeof arcById[arcId]?.title === 'string'
        ? arcById[arcId]!.title!
        : null
      : null;

    const reason =
      `${matches.length} untagged activities this period — including ${samplesQuoted} — look like ${rawGoalTitle}${arcTitle ? ` (${arcTitle})` : ''} work. Tagging them sharpens next week's signal without adding anything new.`;

    out.push({
      id: `rec-align-${goalId}`,
      kind: 'align',
      payload: {
        goalId,
        goalTitle: rawGoalTitle,
        arcId,
        arcTitle,
        activityIds: ids.slice(0, 20),
      },
      reason,
      evidence_ids: ids.slice(0, 10),
      evidence_summary: {
        activity_count: matches.length,
        sample_titles: samples,
      },
    });
  }

  return out;
}

// Priority order for the global 3-cap. A higher-priority `kind` is
// surfaced before a lower-priority one when the cap binds. This matches
// the plan's explicit ordering: `arc > goal > activity > align`. The
// 'activity' slot is reserved so when the deferred trigger lands it can
// drop in without touching the sort call site.
const KIND_PRIORITY: Record<string, number> = {
  arc: 0,
  goal: 1,
  activity: 2,
  align: 3,
};

export const MAX_RECOMMENDATIONS_PER_CHAPTER = 3;

/**
 * Orchestrator (Phase 6). Runs all deterministic triggers, deduplicates
 * cross-kind overlaps, applies the global 3-cap, and returns the final
 * ordered recommendation list stamped onto `output_json.recommendations`
 * by the generator.
 *
 * Dedup rules (conservative — only remove clear overlaps):
 *   1. If an `arc` nomination's theme token matches an `align`
 *      suggestion's Arc head token, drop the `align` — the user's
 *      better next step is to create the Arc, not tag activities
 *      against the closest existing one.
 *   2. If a `goal` nomination's theme token matches a token already
 *      claimed by an `arc` nomination, drop the `goal` — the Arc is
 *      the bigger structural move.
 *
 * Why not LLM-reorder? The trigger set is small and the product copy
 * is already deterministic; priority sorting + a couple of explicit
 * overlap rules beats an LLM call on predictability and cost.
 */
export function computeChapterRecommendations(params: {
  activitiesIncluded: RecommendationActivity[];
  arcById: Record<string, RecommendationArc | undefined>;
  goalsByArcId: Record<string, RecommendationGoal[]>;
  goalsAll: RecommendationGoal[];
  /**
   * Phase 8 of docs/chapters-plan.md — Governance: don't re-nominate
   * what the user just acted on or dismissed.
   *
   *   * `dismissedRecommendationIds` — stable recommendation ids the
   *     user has tapped "Not now" on within the sleep window
   *     (default 90 days, applied upstream). The orchestrator filters
   *     matching ids out of every kind after dedup so the card
   *     doesn't resurface.
   *   * `suppressedArcTokens` — theme tokens that should be
   *     considered "already covered" by an existing Arc (e.g. because
   *     the user created a matching Arc in this period via a
   *     Next-Step CTA, so the token no longer constitutes an
   *     under-served theme). Lowercase.
   *   * `suppressedGoalTokens` — analogous coverage for existing
   *     Goals: a token whose Goal already exists shouldn't produce a
   *     Goal Nomination.
   *
   * All three fields are optional; omission keeps the pre-Phase-8
   * behavior.
   */
  dismissedRecommendationIds?: Iterable<string>;
  suppressedArcTokens?: Iterable<string>;
  suppressedGoalTokens?: Iterable<string>;
}): ChapterRecommendation[] {
  const arcRecs = computeArcNominations({
    activitiesIncluded: params.activitiesIncluded,
    arcById: params.arcById,
  });
  const goalRecs = computeGoalNominations({
    activitiesIncluded: params.activitiesIncluded,
    arcById: params.arcById,
    goalsByArcId: params.goalsByArcId,
  });
  const alignRecs = computeAlignSuggestions({
    activitiesIncluded: params.activitiesIncluded,
    arcById: params.arcById,
    goalsAll: params.goalsAll,
  });

  // Tokens claimed by higher-priority recommendations. Each trigger
  // writes its theme token to `payload.title` (arc + goal) as a
  // lowercased-then-titlecased word, so we read it back straight from
  // the payload rather than parsing ids (which may embed hyphenated
  // arcIds and are brittle).
  const arcTokens = new Set<string>();
  for (const r of arcRecs) {
    const t = typeof r.payload?.title === 'string' ? r.payload.title.toLowerCase() : '';
    if (t) arcTokens.add(t);
  }

  const goalTokens = new Set<string>();
  for (const r of goalRecs) {
    const t = typeof r.payload?.title === 'string' ? r.payload.title.toLowerCase() : '';
    if (t) goalTokens.add(t);
  }

  // Drop align suggestions whose Goal head token matches an arc nom
  // OR a goal nom — in both cases the user's better next step is the
  // higher-priority recommendation.
  const alignFiltered = alignRecs.filter((r) => {
    const goalTitle =
      typeof r.payload?.goalTitle === 'string'
        ? r.payload.goalTitle.toLowerCase()
        : '';
    const head = goalTitle.match(/[a-z]{4,}/)?.[0] ?? '';
    if (head && arcTokens.has(head)) return false;
    if (head && goalTokens.has(head)) return false;
    return true;
  });

  const merged: ChapterRecommendation[] = [
    ...arcRecs,
    ...goalRecs,
    ...alignFiltered,
  ];

  // Phase 8 governance — apply caller-supplied suppressions as the
  // final pass so they bind across kinds and dedup:
  //   1. Drop any recommendation whose stable id matches the
  //      dismissed set. The recommendation id is deterministic
  //      (`rec-arc-<token>`, `rec-goal-<arcId>-<token>`,
  //      `rec-align-<goalId>`) so this is a stable key across weeks.
  //   2. Drop Arc nominations whose theme token is already "covered"
  //      by a suppressed-arc-tokens entry (i.e. the user created the
  //      matching Arc this period out of band — the trigger would
  //      otherwise re-fire if the new Arc's title didn't yet contain
  //      the token, which happens when the user edited the name on
  //      the way in).
  //   3. Drop Goal nominations analogously, and the matching Align
  //      suggestion is dropped transitively by the same arc/goal
  //      token suppression applied further upstream (the
  //      align-filter loop above reads `payload.goalTitle` tokens,
  //      so a Goal-token suppression still suppresses the Align as
  //      long as the head token matches).
  const dismissedSet = new Set<string>();
  for (const id of params.dismissedRecommendationIds ?? []) {
    if (typeof id === 'string' && id.trim().length > 0) {
      dismissedSet.add(id.trim());
    }
  }
  const arcSup = new Set<string>();
  for (const t of params.suppressedArcTokens ?? []) {
    if (typeof t === 'string' && t.trim().length > 0) {
      arcSup.add(t.trim().toLowerCase());
    }
  }
  const goalSup = new Set<string>();
  for (const t of params.suppressedGoalTokens ?? []) {
    if (typeof t === 'string' && t.trim().length > 0) {
      goalSup.add(t.trim().toLowerCase());
    }
  }

  const governed = merged.filter((r) => {
    if (dismissedSet.has(r.id)) return false;
    if (r.kind === 'arc') {
      const token = typeof r.payload?.title === 'string' ? r.payload.title.toLowerCase() : '';
      if (token && arcSup.has(token)) return false;
    }
    if (r.kind === 'goal') {
      const token = typeof r.payload?.title === 'string' ? r.payload.title.toLowerCase() : '';
      if (token && goalSup.has(token)) return false;
    }
    return true;
  });

  governed.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
  return governed.slice(0, MAX_RECOMMENDATIONS_PER_CHAPTER);
}

/**
 * Helper for the digest email template: true iff `output_json.recommendations`
 * contains at least one non-empty entry. Defensive against legacy outputs
 * and malformed shapes.
 */
export function hasAnyRecommendation(outputJson: unknown): boolean {
  if (!outputJson || typeof outputJson !== 'object') return false;
  const recs = (outputJson as { recommendations?: unknown }).recommendations;
  if (!Array.isArray(recs)) return false;
  return recs.some(
    (r) => r && typeof r === 'object' && typeof (r as any).kind === 'string',
  );
}
