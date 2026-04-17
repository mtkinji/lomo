// Chapter Next Steps — deterministic recommendation triggers.
//
// See docs/chapters-plan.md Phase 5. Recommendations are a typed,
// server-computed output that powers the Next Steps UI on the Chapter detail
// screen and the Next-Steps hint in the weekly digest email.
//
// Design choices (v1):
//   * Deterministic only — no LLM. Each trigger is a pure function over
//     metrics + evidence, unit-testable and safe to run on every Chapter.
//   * `reason` is a deterministic template string. The plan leaves room to
//     upgrade `reason` to LLM-authored copy later; that requires adding a
//     new prompt-schema field + validator slot. We ship the deterministic
//     copy as v1 to keep the trigger side shippable in isolation.
//   * v1 ships a single `kind: 'arc'` trigger via untagged-activity cluster.
//     Phase 6 (goal / activity / align) will add more triggers behind the
//     same `recommendations[]` field + the shared 3-cap prioritization
//     (`arc > goal > activity > align`).
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

export type ChapterRecommendation = ChapterRecommendationArc;

export type RecommendationActivity = {
  id: string;
  title?: string | null;
  arcId?: string | null;
};

export type RecommendationArc = {
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
}): ChapterRecommendation[] {
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
