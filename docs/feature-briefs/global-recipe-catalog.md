---
id: brief-global-recipe-catalog
title: Global Recipe Catalog
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-food-loop, brief-food-ai-operating-layer, brief-personal-meal-favorites]
owner: andrew
last_updated: 2026-08-12
---

# Global Recipe Catalog

## Context

Kwilt has 500 authored OOTB meals in the mobile bundle and 500 corresponding published catalog records in production Supabase. Before the catalog-ownership repair, those canonical records were owned by the same person as one genuine private Recipe, so the personal projection returned 501 rows and the app concatenated them with the bundled fallback for a visible total of 1,001. The ownership repair separates canonical publication records from person-owned inventory without deleting the records used by the public catalog and recipe-image pipeline. The bundle remains a last-known-good fallback during the hosted-catalog transition; hosted and bundled catalogs must never be concatenated.

## Target audience

`audience-aspirational-family-organizers` needs a shared cookbook that reduces the work of deciding and remembering meals without becoming a social feed or recipe-administration project.

## Representative persona

Maya wants to recognize a meal that looks good, understand whether it is plausible, remember her preference, benefit from useful experience from other cooks, and make “our version” privately for her household.

## Aspirational design challenge

How might we give Maya a beautiful shared Kwilt cookbook she can trust, learn from, and make her own, while preserving canonical recipe integrity, private household adaptations, calm interaction, and strong public-safety boundaries?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the catalog matters when it moves the household from “what will we eat?” toward one realistic meal decision and eventual follow-through.

## Job flow step

Primary: step 3 in `job-flow-maya-feed-household-with-less-work`, **Recognize whether it fits tonight**, currently scored 1/5. Recipe Home and image-led discovery exist, but canonical public records and truthful recipe-specific media do not.

Secondary: step 18, **Keep what was learned**. An evolving personal edition and personal rating should carry useful household learning forward without rewriting the shared source.

## JTBD framing

When the next meals are unresolved, give me a trustworthy cookbook that already contains appealing realistic choices. Let me remember what I like, see bounded practical evidence from other cooks, and make my own private version without changing the canonical recipe for everyone else.

## Design

### Authority model

| Concern | Authority | Visibility |
| --- | --- | --- |
| Canonical OOTB Recipe and immutable version | Kwilt system publisher | All eligible users through public projection |
| Canonical media | Catalog publication/editorial review | All eligible users |
| Heart | Person preference | Private |
| Star rating | Person-to-published-version event | Own rating private; thresholded aggregate public |
| Cook outcome, substitutions, and next-time note | Exact-version Cook record | Private to the cook |
| Public Cooking note | Explicit public contribution | Public under adult profile; moderated |
| Personal edition | One evolving private Recipe with exact source lineage and immutable versions | Owner and explicit grantees |

Private Recipes remain person-owned and private. Public catalog reads never broaden RLS over the private aggregate. A stable database function or security-invoker projection returns only active publication fields.

### Canonical records and import

Each authored roster entry receives:

- UUID Recipe identity plus stable unique `roster_id` source key;
- immutable RecipeVersion, ingredients, instructions, provenance, credits, and content hash;
- Kwilt system owner and public publisher identity;
- active RecipePublication pinned to the exact version;
- selected approved public media;
- editorial state and timestamps.

An idempotent importer reads the existing authored TypeScript catalog, validates all 500 records, and upserts by `roster_id` through an admin-only operation. Importing unchanged content is a no-op. Changed content creates a new immutable version and a reviewable publication replacement rather than mutating the existing version.

### Client catalog projection

The mobile repository requests a bounded projection containing publication, current version, recipe fields, ingredients, instructions, active media URLs/alt text, attribution, aggregate rating state, and legacy roster reference. It stores a last-known-good catalog cache. Empty, partial, or invalid refreshes never replace a valid complete cache.

During the transition, legacy `kwilt-recipe-<roster>` ids resolve to canonical publication ids so favorites, hidden meals, deep links, Meal Plan candidates, and Grocery snapshots remain stable. Once remote completeness and offline behavior are proven, bundled catalog records and atlas authority are removed.

### Hearts

The existing private favorite repository remains authoritative. Hearts are available on cards and Recipe Home, are reversible, and do not expose public totals or imply household preference.

### Ratings

- One integer 1–5 rating per permanent person per exact published RecipeVersion.
- A person can set, replace, or remove their rating.
- Public count/average appears only at five independent ratings; below it, Recipe Home says **Not enough ratings yet**.
- A newly published canonical version starts a new aggregate.
- Ratings never rank discovery shelves in this release.

Private Cook outcome ratings are separate evidence. They describe how one attempt turned out—including any substitutions—and never enter the public Recipe aggregate.

### Private Cook journal

Each completed Cook session creates at most one owner-only Cook record pinned to the exact canonical RecipeVersion used. The record may contain a private 1–5 outcome, a make-again signal, a next-time note, and structured substitutions linked to the exact source ingredient lines. Resaving completion learning updates the same record transactionally rather than incrementing the cook count.

Recipe Home shows the owner's total completed Cook count and the most recent relevant evidence. Stable bundled roster and ingredient IDs resolve server-side to canonical UUID rows so existing favorites, hides, plans, and deep links retain their identity while Cook history keeps canonical foreign keys. Public ratings, public Cooking notes, and community photos never read from this private journal without a later explicit contribution act.

### Cooking notes

The product calls comments **Cooking notes**. Each note is bound to an exact publication/version and contains bounded plain text. Initial authors require a permanent adult account and active chosen public profile. Authors can edit or delete their note. Readers can report a note. Moderators can hide/restore content, act on profiles, and retain minimal audit records.

Required before general availability: report reasons, moderation queue/receipts, edit history sufficient for abuse review, rate limits, blocked/disabled-profile behavior, rights/medical-risk handling, takedown, appeal/audit boundary, and child-account denial tests. There is no global feed, reply tree, comment likes, follower model, or notification loop.

### Evolving personal editions

The product does not tell a duplicate-and-revise story. When a person first changes a catalog Recipe, Kwilt creates one private personal edition attached to the exact publication and RecipeVersion it began from. That edition retains one stable Recipe identity while every later save appends an immutable version. Recipe Home opens the personal edition by default and quietly identifies it as **Your version**, **Based on Kwilt's original recipe**.

The first action is **Edit for me**; later actions are **Update recipe**. “Our version” remains deferred until shared Recipe ownership and update authority are explicitly designed. Canonical republishing never silently merges into or overwrites a personal edition.

The version identity line opens a compact history sheet. Selecting an older personal version or the Kwilt original opens a read-only Recipe Home. **Use this version** never moves a pointer backward or destroys later work; it appends a new version whose content was restored from the selected version. Finalized Meal Plans, Grocery provenance, and Cook records remain pinned to the exact versions originally used.

### AI-forward, manually complete updating

One **Update recipe** screen owns both modalities. At the top, a person may describe changes in ordinary language or voice. When connected, AI prepares a bounded structured diff against the exact current version; nothing is applied until the person reviews it, and nothing becomes canonical until **Save Version N**. The existing structured fields remain directly editable on the same screen and are never hidden behind Chat or an AI failure.

Offline, the AI affordance states that help is unavailable while every manual field remains functional. Saving creates the next version locally, makes it current on that device, and records **Saved on this device · Will sync when connected**. Reconnection applies the same idempotent expected-version mutation. A concurrent server version preserves both branches and requires explicit reconciliation; it never overwrites local work. On-device AI may later improve offline suggestions where supported, but it is not a dependency of editing or saving.

### Recipe-book image pipeline

The internal state machine is:

`missing -> queued -> generating -> generated -> editorial_review -> approved -> published`, with `rejected` and bounded `failed` paths returning to the queue.

Every attempt records publication/version, prompt/model version, output, cost metadata, automated QA, reviewer decision, rejection reason, and replacement lineage. Generation never grants publication authority.

Queue eligibility is an active publication version without approved recipe-specific media or one whose media is marked inaccurate, duplicate, low-quality, or retired. Priority uses hard category/cuisine coverage, active-Collection wave completion, current discovery visibility, mismatched-art severity, aggregated opens/plans/cooks, visual-form coverage, attempt age, and retry penalty. Individual/private user content never enters prompts or priority signals.

The first learning wave contains 25 images spanning immediately recognizable, culturally specific, and visually difficult meals. It tests the full generation, review, publication, replacement, and installed-app refresh path before later 50-recipe waves process the remaining catalog in coherent Collection/category/cuisine groups.

Art direction: beautiful modern cookbook photography; believable home-cooked texture and portions; natural window light; quiet warm surfaces; one unmistakable finished dish derived from exact recipe content; crop-safe composition; coherent tone with varied plates/angles; no hands, text, logos, packaging, impossible ingredients, excessive garnish, synthetic gloss, or culturally careless substitution.

Automated QA checks dimensions, crop safety, semantic match, forbidden text/logo, near duplication, safety, and provenance completeness. Editorial QA checks recipe truth, cultural plausibility, appetite, cookbook coherence, mobile crops, rights, attribution, and alt text using 12-image contact sheets plus full-resolution review.

### Reductive product surface

- Cards keep only the existing heart/plan controls; ratings and notes do not become shelf counters.
- Recipe Home shows rating summary and Cooking notes after core recipe facts/content.
- Update recipe stays in Recipe actions; version history is reached from the quiet recipe identity line.
- Missing media uses a quiet truthful fallback, never an unrelated food image.
- No social tab, creator feed, leaderboard, review badges, catalog settings, or image-generation UI.

### Activation

Heart is learned directly from cards. Rating is available on Recipe Home and contextually invited after Cook Complete. Cooking notes are discovered after reading/cooking a Recipe rather than promoted before useful experience. Recipe updating appears in Recipe actions and after a reviewed Cook learning. No onboarding carousel or attention campaign is added.

### Release and reversibility

Release first as production-hidden for Andrew/internal adult profiles using production-shaped Supabase and an OTA/development bundle. Widen to production-small only after the 25-image learning contact sheet, catalog continuity, private-state separation, comments moderation, abuse/rate-limit tests, and two-account signed-device matrix pass. Comments have an independent server/client gate and can remain disabled while catalog, hearts, ratings, and private versions ship.

## Success signal

A fresh account can browse all 500 database-backed canonical Recipes; two accounts can independently heart, rate, and evolve personal editions of the same publication; an approved image replacement appears after refresh without a native build; a canonical version update preserves Meal Plan snapshots, personal editions, and historical evidence; and a staged unsafe Cooking note can be reported, moderated, and audited end to end.

## Acceptance criteria

- Database count and importer receipt prove exactly 500 active canonical roster records and publications.
- Mobile never replaces a valid catalog cache with empty/partial/invalid refresh data.
- Every current catalog id maps deterministically to one UUID publication and exact version.
- Hearts, ratings, comments, and personal editions pass ownership/RLS negative matrices across two users plus anonymous/child cases.
- Rating aggregates expose no person identity and remain hidden below five ratings.
- Personal-edition content is unreadable to unrelated users and unchanged by canonical republish.
- AI suggestions produce a reviewable structured diff and cannot save; manual update and local version save remain complete without connectivity.
- Restoring an older version appends a new immutable version and never rewrites history.
- Meal Plan and Grocery snapshots retain exact recipe/version/media lineage.
- First 25 images pass automated and editorial contact-sheet review; published media resolves from Supabase CDN and can be replaced without a native build.
- `npm run verify:changed -- --run` passes; source proof, Simulator/Metro proof, signed-account/device proof, and production-default proof remain explicitly distinct.

## Learning and decision rule

See [`docs/design-explorations/global-recipe-catalog/04-learning-release.md`](../design-explorations/global-recipe-catalog/04-learning-release.md) and [`05-evaluate-learning.md`](../design-explorations/global-recipe-catalog/05-evaluate-learning.md). Preserve catalog/private-fork value even if ratings or Cooking notes fail their independent bets.

## Spec refinement

Decisions locked:

- existing immutable Recipe core plus public publication projection;
- system-owned canonical records, never direct public access to the private aggregate;
- adult-profile public notes; all permanent users may privately heart/rate and maintain an attached personal edition;
- AI-forward, manually complete, offline-honest updating with append-only version restoration;
- exact-version ratings/notes/lineage;
- 25-image accepted learning wave before later 50-recipe batches;
- staged production-hidden release with independent participation gates.

Implementation must still choose table/function names and batch sizes by following existing migration conventions and current Supabase limits. These are engineering choices, not product decisions. No user-owned product choice remains open for the first hidden slice.

## Durable control-plane draft

Kwilt connector tools were unavailable in this task. Intended durable Goal: **Ship the global Kwilt recipe catalog**.

Intended Activities:

- Migrate 500 OOTB meals to immutable catalog publications with verified client continuity.
- Publish the first 25 recipe-book-quality catalog images through the reviewed generation pipeline.
- Add private hearts/ratings/forks and gated moderated Cooking notes.
- Prove two-account RLS, offline catalog fallback, canonical republish, and image replacement without a native build.

## Open questions

- None for the production-hidden slice. Public child participation remains deliberately excluded and requires a separate child-safety decision before reconsideration.
