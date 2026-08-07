# Frame: Global Recipe Catalog

## What the user said

> I need all meals properly in the DB, not bundled into the app. OOTB meals should be available to all users, and all users should be able to heart them, comment on them, create local revisions on them, and give them star ratings.

This broader direction supersedes the scope of `recipe-catalog-imagery-pipeline`; image generation and publication become one internal subsystem of the global catalog.

## Restated in user voice

When Maya needs meal ideas, she wants a dependable shared cookbook that already contains appealing, trustworthy recipes; she wants to remember what she likes, learn from other cooks, and adapt a recipe for her own household without changing the canonical recipe for everyone else.

## Target audience

`audience-aspirational-family-organizers` — Aspirational family organizers who want useful food knowledge without becoming recipe-database administrators or participating in a noisy social feed.

## Representative persona

Maya is choosing the next few meals and wants both inspiration and grounded evidence that a recipe works in ordinary household life.

- Current situation: 500 Kwilt-authored meals are bundled as JavaScript fixtures with string ids and a small repeated image atlas; production Supabase currently has one private Recipe and no active Recipe media rows.
- What she is trying to do: Recognize a promising meal, trust that it is cookable, remember it, learn practical experience from others, and make a household-specific variation.
- Emotional state or tension: Open to help, but wary of glossy content feeds, unreliable ratings, public oversharing, and losing her own adjustments.
- What would make this feel wrong: popularity theater, anonymous abuse, ratings detached from cooking, comments that become a social feed, silent edits to canonical recipes, or private family changes becoming public.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — A useful catalog helps Maya move from “what will we eat?” to a plausible household decision.

## Job flow step

Primary: step 3 in `job-flow-maya-feed-household-with-less-work`, **Recognize whether it fits tonight**.

- Desired outcome: Recipe discovery and Recipe Home answer appetite, time, yield, source, and readiness before dense detail.
- Current offering: image-led shelves and Recipe Home exist, but the OOTB catalog is local bundle data with generic imagery and no durable public identity.
- Delivery score: 1/5.
- Gap: recipe-specific media, durable catalog records, public evidence, and a safe path to private adaptation.

Secondary: step 18, **Keep what was learned**. Private local revisions and a person's own rating can carry useful cooking experience forward without rewriting the canonical source.

## Active anchors

- `jtbd-move-the-few-things-that-matter` — Catalog discovery, practical evidence, and private adaptation help Maya choose and reuse realistic meals.
- `jtbd-trust-this-app-with-my-life` — Canonical versions, lineage, rating integrity, moderation, attribution, and private/public separation determine whether the cookbook is trustworthy.

Generic public engagement is not itself an anchored job. Hearts, comments, and ratings should survive only insofar as they improve recognition, cookability, adaptation, and trust; Kwilt should not optimize them as engagement inventory.

## Friction we're addressing

The current 500-meal catalog is not a real shared domain object. It cannot be independently published, updated, imaged, moderated, rated, commented on, or safely forked without a JavaScript release. At the same time, placing public participation directly on the private Recipe aggregate would collapse Kwilt's established boundary between private household knowledge and public publication.

## System alignment

Constraint posture: `Bend the system`

The current private-owner-first Recipe model blocks the desired global cookbook. The justified bend is to make the existing public publication aggregate real and let the OOTB catalog live there, while keeping private Recipes private.

Current system facts:

- Existing surface: Meals discovery, Search, editorial Collections, Recipe Home, Meal Plan, Groceries, favorites, and Cook Mode already consume Recipe-shaped projections.
- Existing user flow: discover -> open canonical recipe -> heart, add to plan, adapt, or cook -> retain useful learning.
- Existing domain/data model: private `Recipe` and immutable `RecipeVersion` rows are UUID-backed and person-owned; publication contracts already pin a public projection to an exact version with media and rights. The publication schema and moderation services are not implemented.
- Existing participation model: hearts already persist privately in `kwilt_recipe_favorites` using flexible text references. Comments and ratings do not exist. `RecipeLineage` already distinguishes copied/adapted work conceptually.
- Existing technical affordances: repository projections, caches, remote image rendering, Supabase RLS/RPC patterns, and immutable version snapshots exist. The 500 authored recipes are presently source files, not database seed data.
- Existing safety position: public publication previously remained gated on public identity, reporting, moderation, rights complaints, takedown, appeal, and child-safety policy.
- Existing UX grammar: calm object pages, quiet reversible heart, no default-public family feed, and explicit authority boundaries.

Constraints to preserve:

- Canonical OOTB Recipe versions are Kwilt-owned, immutable once published, globally readable, and updated only through reviewed publication.
- Hearts remain private per person and never imply household consensus or public popularity.
- A local revision creates a new private user-owned Recipe with lineage to the exact canonical version; it never mutates the canonical publication.
- Comments and rating events belong to the publication, not the private Recipe aggregate.
- Public comments use an explicit public identity and require report, moderation, deletion, and audit boundaries before launch.
- Canonical imagery is recipe-specific, Kwilt-authored/rights-cleared, versioned, alt-texted, and replaceable; an image generation run cannot self-publish.
- Household membership does not grant public identity or expose private revisions.
- The app consumes a stable catalog projection and a bounded user-state projection rather than joining unrestricted public/private tables client-side.

Constraints we are intentionally changing:

- OOTB Recipes will no longer be bundled as the authoritative catalog.
- `artworkIndex` and the atlas become bootstrap/failure fallback only, then can be retired after offline catalog caching is proven.
- Ratings and comments become supported evidence on Recipe Home, superseding the earlier blanket exclusion of ratings and social proof.

## Capability ownership

| Concern | Authoritative owner | Visibility |
| --- | --- | --- |
| Canonical OOTB recipe and version | Kwilt catalog publication | All eligible app users |
| Canonical media | Catalog media publication | All eligible app users |
| Heart | Person preference | Private to that person |
| Star rating event | Person-to-publication rating | Person's own score private; aggregate public |
| Comment | Public contribution attached to publication/version | Public under chosen profile, moderation-controlled |
| Local revision | New private Recipe plus lineage | Owner and explicit grantees only |
| Aggregate rating/count | Server projection | Public, thresholded to resist false precision |

## Design implication

Implement a public catalog/publication read model with stable UUID identities, immutable versions, media, editorial state, and moderated participation. Import the 500 authored source recipes idempotently into that model. The mobile app reads the remote catalog, overlays private heart/rating/fork state, and caches enough data and media references for a dignified offline experience. Image generation becomes a prioritized editorial queue that attaches review-approved media to exact publication versions.

## Aspirational design challenge

How might we give Maya a beautiful shared Kwilt cookbook she can trust, learn from, and make her own, while preserving canonical recipe integrity, private household adaptations, calm interaction, and strong public-safety boundaries?

## Out of scope

- An infinite recipe feed or engagement-ranked home.
- User publishing of arbitrary private Recipes in the first catalog migration.
- Automatic promotion of local revisions into canonical recipes.
- Direct messages, follower graphs, creator monetization, or default-public household activity.
- AI-authored comments, AI star ratings, or generated evidence of cook success.

## Open question

For the first public-participation release, should comments require an adult public profile while every permanent user can heart, privately revise, and rate—or does “all users” intentionally include child accounts posting publicly?
