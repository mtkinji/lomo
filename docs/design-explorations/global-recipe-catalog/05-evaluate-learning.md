# Evaluate Learning: Global Recipe Catalog

## Learning questions

1. Does a remote canonical catalog remain as fast, calm, and dependable as the bundled inventory?
2. Do recipe-specific images materially improve opens, planning, and recognition without becoming glossy or repetitive?
3. Can one canonical version flow through Recipe Home, Search, Collections, Meal Plan snapshots, Groceries, and private forks without identity drift?
4. Do hearts, ratings, and Cooking notes retain distinct meanings, or do users mistake them for one popularity system?
5. Are Cooking notes useful enough to justify the moderation surface and public-identity cost?
6. Does **Make my version** preserve lineage while feeling like ordinary household adaptation rather than publishing or collaboration?
7. Can the image pipeline achieve a coherent cookbook across cuisines while staying ingredient- and culture-truthful at acceptable review cost?

## Supporting evidence

- Fresh and returning catalog loads succeed with correct record/media counts and bounded latency.
- Every visible Recipe resolves to one stable publication/version id across surfaces.
- The first 48-image contact sheet passes editorial review with low duplicate and factual-rejection rates.
- Users open, plan, or cook visually corrected meals more often than the same positions with generic fallback art, without needing ratings-based ranking.
- Two permanent accounts can independently heart, rate, and fork the same publication without observing each other's private state.
- A private fork remains unchanged after a canonical republish and retains inspectable lineage.
- Cooking notes contain practical preparation/substitution/serving experience and can be reported, moderated, deleted, and audited.

## Disconfirming evidence

- Remote catalog loading regularly empties Meals or replaces last-known-good records with partial data.
- Catalog ids break existing favorites, Meal Plans, Grocery provenance, Search, or deep links.
- Images are frequently inaccurate, culturally implausible, visually repetitive, or rejected after mobile crop review.
- Ratings become a ranking proxy that crowds out household fit or appear authoritative with thin evidence.
- Cooking notes trend toward generic praise, hostility, medical/allergy claims, or social chatter with little cooking value.
- Users think **Make my version** edits the canonical source or exposes private household changes.

## Instrumentation

Record only bounded operational/product events:

- catalog refresh outcome, edition/version, count, latency, cache/fallback reason;
- publication/version opened, planned, cooked, heart toggled, rating set/removed, fork created;
- image queue reason, attempt count, prompt/model version, QA decisions, rejection reason, publication time, and delivery failures;
- Cooking-note create/edit/delete/report/moderation outcomes and rate-limit events.

Do not record private fork text, ingredients, notes, household identity, comment drafts, or image prompts containing private Recipe content in general analytics.

## Decision rule

- Proceed to production-default when catalog completeness and continuity pass, 48 images establish the accepted art direction, rating aggregates remain truthful, and the moderation/report matrix passes on real accounts.
- Revise the image prompt/queue if more than 15% of first-pass outputs fail recipe truth or more than 10% fail cookbook-coherence review.
- Keep ratings private-only if aggregates create false confidence or ranking pressure.
- Keep Cooking notes allowlisted or remove them if practical-value signal does not justify moderation burden.
- Preserve the shared catalog and private forks even if public participation is reduced; those are separable bets.

## Expected next action

After the hidden release, promote the accepted image prompt and first 48 assets, then process complete editorial/category waves while widening catalog access. Public Cooking notes widen last, after moderation operations and child/public-profile policy are proven.
