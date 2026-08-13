# Living Recipe Cookbook Roadmap

**Outcome:** One public Kwilt recipe can accumulate private cooking history, one evolving personal edition per person, exact-version ratings, deliberately shared photos, and moderated community tips without duplicating catalog content or exposing household learning.

**Product rule:** A Cook record remembers what happened once. A personal edition remembers what the person wants to do next time. A community contribution is a separately reviewed act of publication.

## Stage 1 — Canonical catalog boundary

Deliver exactly one runtime representation of each of the 500 OOTB recipes.

- Mark database catalog Recipes as catalog-owned rather than personal inventory.
- Keep direct Recipe-table reads private; expose catalog content only through the bounded publication projection.
- Make the app choose the hosted catalog or its bundled last-known-good fallback, never concatenate both.
- Preserve legacy roster IDs, favorites, hides, Meal Plan snapshots, Grocery provenance, and Cook links.
- Gate: a user with one personal recipe sees 501 total recipes; a fresh user sees 500.

Detailed plans:

- [`2026-08-12-canonical-recipe-inventory-repair.md`](2026-08-12-canonical-recipe-inventory-repair.md)
- [`2026-08-07-global-recipe-catalog-foundation.md`](2026-08-07-global-recipe-catalog-foundation.md)

## Stage 2 — Private Cook journal

**Status:** Structured outcome, make-again, substitution, note, count, and last-cook evidence implemented on 2026-08-12. Private Cook photos remain the next Stage 2 slice.

Make each completed cook a durable, inspectable record pinned to the exact RecipeVersion used.

- Record completion, serving scale, personal outcome rating, make-again signal, and freeform learning.
- Record ingredient substitutions as structured observations linked to source ingredient lines.
- Attach private finished-meal or step photos to the Cook record, not to the canonical Recipe.
- Show the most relevant prior learning on Recipe Home and provide a complete private history.
- Gate: a person can cook the same Recipe three times and accurately recover what changed and how each attempt turned out.

Detailed plan: [`2026-08-12-structured-recipe-cook-learning.md`](2026-08-12-structured-recipe-cook-learning.md).

## Stage 3 — One evolving personal edition

Promote durable learning without manufacturing a new Recipe for every cook.

- Offer **Remember for next time** from a Cook record.
- Create at most one personal edition per person and catalog publication.
- Append immutable personal versions with exact source Cook and catalog lineage.
- Keep canonical republishing from overwriting or silently merging personal changes.
- Gate: two people can independently evolve the same public Recipe without seeing or changing each other's editions.

Detailed plan: [`2026-08-07-global-recipe-participation.md`](2026-08-07-global-recipe-participation.md), Tasks 3–6.

## Stage 4 — Ratings and public recipe pages

Use the same canonical publication in the app and on the ad-free public website.

- Store one 1–5 rating per person per exact published RecipeVersion.
- Show only thresholded aggregates; never expose rater identity.
- Serve stable public slugs, Recipe structured data, print/share, and a quiet **Open in Kwilt** action.
- Keep private variants, notes, substitutions, Cook photos, and household context out of the public projection.
- Gate: a published Recipe has one identity, content version, aggregate rating, and media set across app and web.

Detailed plan: [`2026-08-07-global-recipe-participation.md`](2026-08-07-global-recipe-participation.md), Tasks 1–2, plus a separate `kwilt-site` implementation plan after the API projection is stable.

## Stage 5 — Deliberate community contributions

Let useful lived experience improve the cookbook without creating a social feed.

- Let an adult explicitly submit a selected Cook learning or photo as a public contribution.
- Preview exactly what becomes public and strip private household context.
- Bind tips and photos to the exact publication/version they concern.
- Require reporting, moderation, edit/delete, rate limits, rights confirmation, and audit receipts.
- Omit replies, likes, followers, leaderboards, engagement notifications, and a global feed.
- Gate: an unsafe contribution can be reported, hidden, restored, or removed end to end without affecting the private source Cook record.

Detailed plan: [`2026-08-07-global-recipe-participation.md`](2026-08-07-global-recipe-participation.md), Tasks 7–9, extended with Cook-derived media submissions after Stage 2.

## Release order

Each stage is independently shippable and reversible. Stage 1 is the current work. Stages 2 and 3 may ship privately before ratings. Public tips and community photos remain independently gated even if the catalog, Cook journal, personal editions, ratings, and public pages are accepted.
