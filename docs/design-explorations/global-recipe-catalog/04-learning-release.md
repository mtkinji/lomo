# Learning Release: Global Recipe Catalog

## Concept To Build

Replace the bundled starter catalog with a database-published Kwilt cookbook whose canonical recipes are available to every eligible user, while personal hearts, ratings, cooking notes, and private adaptations retain distinct ownership.

## Capability Delta

Today, the user cannot:

- receive canonical OOTB Recipes or recipe-specific media from Supabase;
- make a private editable version with durable lineage;
- rate or leave a moderated cooking note on an exact canonical version.

After this release, the user can:

- browse all 500 canonical Recipes from the shared catalog;
- see a reviewed first wave of 48 recipe-specific cookbook images and truthful fallbacks elsewhere;
- privately heart and rate catalog Recipes;
- make a private independently editable version;
- under the initial allowlist, post/delete/report version-bound Cooking notes through an adult public profile.

Still intentionally not supported:

- public user Recipe publishing;
- child or anonymous public comments;
- replies, comment likes, follower graphs, creator feeds, or engagement ranking;
- automatic merging between canonical and private versions;
- public release of unreviewed generated imagery.

## User Experience

Meals opens on the existing discovery shelves and Recipe Home. The visual and navigation grammar stays intact, but catalog records come from the current database publication projection. A card can be hearted as today. Recipe Home shows the current canonical version and reviewed image, offers **Make my version** in its actions, and shows a quiet rating summary plus **Cooking notes** below the recipe content. Making a version creates a private Recipe and opens the existing editor; the canonical source remains linked and unchanged.

## Existing Product Relationship

- Enhances Meals discovery and Recipe Home.
- Reuses private Recipe versions, lineage, favorites, editing, Meal Plan snapshots, Search, and offline cache.
- Replaces bundled catalog authority and eventually retires atlas artwork.
- Leaves editorial Collections, Meal Planning, Groceries, Cook Mode, and private Recipe sharing authoritative in their existing capabilities.

## Buildable Slice

Must be real:

- production-shaped schema, RLS/RPC/public projection, system publisher identity, and idempotent 500-recipe import;
- exact immutable canonical versions, ingredients, instructions, provenance, media, and publication state;
- remote catalog repository with last-known-good cache and stable legacy-ref mapping;
- private hearts, version-bound ratings, private forks with lineage, and bounded Cooking notes;
- adult public-profile enforcement, author edit/delete, report, moderation state, rate limits, and audit trail before comments leave the allowlist;
- public catalog-media bucket and review-approved publication path;
- deterministic image queue, prompt records, attempts, QA results, review decision, and 48 accepted images;
- end-to-end Recipe Home, Meal Plan, Search, Grocery snapshot, and offline/failure verification.

Can be thin or temporary:

- image generation is operated through a repository script/CLI and review manifest before a full editorial console exists;
- comment moderation may use an internal SQL/admin workflow during the allowlisted release if actions are audited and consumer posting is gated;
- source recipe import may run as an idempotent deployment script before a long-term authoring workbench exists;
- atlas fallback remains while image coverage is incomplete.

Intentionally excluded:

- a consumer-facing image state or catalog-management UI;
- public profile discovery pages;
- rating-based recommendations;
- notifications for comments or ratings;
- unbounded analytics or storage of private household text in the image pipeline.

## Release Channel

Start `Production-hidden` for Andrew's account and explicit internal profiles, using the real production-shaped Supabase path and an OTA/development bundle. This proves source ownership, remote catalog loading, migration, offline fallback, Recipe Home, planning continuity, and participation boundaries without exposing half-reviewed public content.

Move to `Production-small` only after the 48-image contact sheet, comment moderation path, abuse/rate-limit tests, and two-account signed-device matrix pass. Move to `Production-default` after catalog freshness, legacy favorites, local forks, and current-version ratings remain correct through a real publication update.

## Brand-Goodwill Guardrails

- A generated image never appears before editorial approval.
- Missing images use a calm honest fallback, never a mismatched meal.
- Rating aggregates remain hidden below five independent ratings.
- Cooking notes appear after recipe content and never dominate discovery.
- Private adaptations are labeled **Your version** and remain private unless a future explicit publishing flow is separately approved.
- Comments have visible report and author deletion paths before general availability.

## Reversibility

The client retains a last-known-good catalog edition and atlas fallback during migration. Catalog publications, media, ratings projection, and comments have independent gates. Comments can be disabled without removing recipes, hearts, ratings, or private forks. A publication or image can be withdrawn without deleting its immutable source/audit history. The app can temporarily fall back to its embedded catalog until remote catalog completeness is proven, but the database remains the intended authority.

## Permanent Product Threshold

Promote to accepted product capability when a fresh account can browse all 500 records, two accounts independently heart/rate/fork the same canonical Recipe, an approved image replacement appears without an app build, a canonical version update preserves history without corrupting private forks or Meal Plans, and the moderation/report path handles a staged unsafe note end to end.
