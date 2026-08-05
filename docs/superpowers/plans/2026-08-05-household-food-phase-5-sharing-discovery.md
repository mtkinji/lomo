# Household Food Phase 5: Recipe Sharing and Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the private Recipe Box into consent-first recipe continuity across family members and a public-ready ad-free discovery layer where a person may deliberately publish their own or authorized Recipe version with chosen attribution, while Kwilt catalog content remains Kwilt-authored, licensed, public-domain, or otherwise verified for distribution.

**Architecture:** Sharing deepens in explicit levels: independent copy with provenance, live sharing of one authoritative private Recipe, a named family collection earned by repeated collaboration, unlisted publication, then discoverable publication. Public identity is opt-in and separate from private account/household identity. Every publication pins one immutable Recipe version, attribution snapshot, rights attestation, approved media, and selected distribution scopes. Discovery combines eligible user publications with a separately licensed catalog and creates an owned private copy only after review; it never exposes private collections or bulk-copies publisher expression.

**Tech Stack:** Supabase Postgres/RLS/RPC/Storage, existing Household/relationship invitations and Shared Home, React Native, Recipe versions, content-license manifests, search indexing, Jest/RNTL, and pgTAP.

---

## Entry gate

Start only after users repeatedly reuse their own Recipes and can articulate a
need to send, co-maintain, or discover more. A visually empty library is not a
reason to manufacture a public catalog.

## Scope and file map

Create:

- `supabase/migrations/20260806050000_recipe_sharing_and_catalog.sql`
- `supabase/tests/recipe_sharing_and_catalog.sql`
- `src/capabilities/recipes/domain/recipeSharing.ts` and test
- `src/capabilities/recipes/data/recipeSharingRepository.ts` and test
- `src/capabilities/recipes/screens/RecipeShareScreen.tsx` and test
- `src/capabilities/recipes/screens/SharedRecipeScreen.tsx` and test
- `src/capabilities/recipes/screens/RecipeCollectionsScreen.tsx` and test
- `src/capabilities/recipes/screens/PublicCreatorProfileScreen.tsx` and test
- `src/capabilities/recipes/screens/RecipePublicationReviewScreen.tsx` and test
- `src/capabilities/recipes/screens/RecipeReportScreen.tsx` and test
- `src/capabilities/recipes/screens/RecipeDiscoveryScreen.tsx` and test
- `src/capabilities/recipes/domain/recipePublication.ts` and test
- `src/capabilities/recipes/data/recipePublicationRepository.ts` and test
- `supabase/functions/_shared/recipeCatalogPolicy.ts` and Deno test
- `supabase/functions/recipe-catalog/index.ts`
- `supabase/functions/recipe-publication-moderation/index.ts`
- `docs/capabilities/recipes/catalog-sources/README.md`

Modify Recipe detail/library, Shared Home deliveries, capability manifest,
search, export/deletion, and safe analytics.

### Task 1: Add independent Recipe copy with immutable provenance

- [ ] **Step 1: Write schema/RLS tests** for a targeted offer, recipient-only
  preview, accept/decline/revoke/expire, copy-on-accept, unrelated denial, and
  no continuing access to the sender's Recipe after copy.
- [ ] **Step 2: Implement `send_kwilt_recipe_copy` and
  `accept_kwilt_recipe_copy`.** Acceptance creates a new recipient-owned Recipe
  at version 1 with provenance `{ method: 'copy', sourceRecipeId,
  sourceVersion, contributedBy }`. Future sender edits do not change it.
- [ ] **Step 3: Deliver through Shared Home** with no ingredient/instruction
  content in push payload. Preview reveals only the explicitly offered Recipe
  version.
- [ ] **Step 4: Run negative authorization tests and commit.**

### Task 2: Add explicit live sharing for one Recipe

- [ ] **Step 1: Write tests** for viewer/contributor roles, invitation,
  acceptance, optimistic version conflict, attribution, owner transfer refusal,
  contributor removal, self-leave, source deletion, and no access to any other
  Recipe or collection.
- [ ] **Step 2: Add `kwilt_recipe_collaborators`** and RPC-only invite/respond/
  remove/leave mutations. Contributors may create a new RecipeVersion; viewers
  may only read/export. Every version records the authoring user.
- [ ] **Step 3: Add conflict UI.** A stale save never overwrites; show the newer
  version and let the contributor copy their draft or reapply edits.
- [ ] **Step 4: Run two-account device proof and commit.**

### Task 3: Earn named family collections without blanket Household access

- [ ] **Step 1: Write tests** for collection owner, explicit member, Recipe
  inclusion by Recipe owner, removal, leave, deleted Recipe, child eligibility,
  and Household member who was never invited.
- [ ] **Step 2: Implement `RecipeCollection`, membership, and Recipe reference
  rows.** A collection references Recipes whose owners explicitly included
  them. Collection membership does not grant edit rights unless the Recipe's
  own collaborator row does.
- [ ] **Step 3: Offer collection creation only after repeated copy/live-share
  use.** Do not create one automatically from Household membership.
- [ ] **Step 4: Run and commit.**

### Task 4: Add opt-in public identity and immutable Recipe publication

- [ ] **Step 1: Write schema/RLS tests** for private user without a public
  profile, profile creation with chosen public name, publication draft,
  unlisted and discoverable states, exact Recipe version pinning, selected
  distribution scopes, publisher-only mutation, collaborator denial,
  anonymous public projection, private aggregate denial, republish, withdrawal,
  and child-account denial under the initial policy.
- [ ] **Step 2: Implement `PublicCreatorProfile` separately from private
  person/account identity.** Never prefill or expose the account/household name
  without explicit user choice. Profile deletion/disable has an explicit effect
  on active publications.
- [ ] **Step 3: Implement `RecipePublication`.** Require
  `published_recipe_version_id`, public slug, public creator profile,
  attribution snapshot, rights attestation, license where relevant, only media
  assets marked public-allowed, and explicit distribution scopes. Creating a
  new private Recipe version never changes public content.
- [ ] **Step 4: Build publication review.** Show the exact public preview,
  identity, credits, lineage, source attribution, media, rights statement, and
  Kwilt/public-web scopes before confirmation. Republish repeats the review.
- [ ] **Step 5: Prove cross-Kwilt consumption** through the publication
  projection and stable public identifier. Mobile, desktop, and web may render
  selected scopes; none reads the publisher's private Recipe rows.

### Task 5: Build reporting, moderation, rights, and withdrawal operations

- [ ] **Step 1: Write lifecycle tests** for user report, rights complaint,
  moderation queue, temporary restriction, takedown, publisher withdrawal,
  appeal, final resolution, audit access, discovery removal, cached-public
  invalidation, and retained lineage/attribution minimums.
- [ ] **Step 2: Implement least-privilege reporting and moderation RPCs.** A
  reporter never gains publisher identity or private Recipe access. Moderators
  see only the evidence required for the case.
- [ ] **Step 3: Add urgent remote removal and cache invalidation.** Withdrawal
  or moderation stops discovery and new access promptly without deleting an
  authorized recipient's independent private copy contrary to its lineage and
  license rules.
- [ ] **Step 4: Complete legal, privacy, community, and child-safety review**
  before any discoverable user publication flag can leave internal testing.

### Task 6: Establish a license manifest and ingestion gate

- [ ] **Step 1: Write policy tests** requiring every catalog item to name source,
  immutable source version/hash, content license/status, allowed fields,
  attribution, image rights, modification rights, distribution scope, and
  termination/export behavior.
- [ ] **Step 2: Implement `recipeCatalogPolicy`.** Reject any source missing a
  required right or attempting to import a web-search result's instructions.
  Link-only metadata may remain discovery metadata but cannot become ad-free
  cooking content until the user lawfully imports/reviews it.
- [ ] **Step 3: Seed only Kwilt-authored fixtures first.** Licensed/open sources
  enter through reviewed source-specific adapters; there is no generic crawler.
- [ ] **Step 4: Run and commit.**

### Task 7: Build quiet discovery grounded in the current planning horizon

- [ ] **Step 1: Write tests** for search across eligible user publications and
  licensed catalog records, filters, creator and source attribution, lineage,
  no sponsored ranking, dietary filter as explicit user input, current-plan
  context, explanation, preview, save-as-owned-copy, publication withdrawal,
  provider-source removal, and offline previously saved Recipe.
- [ ] **Step 2: Implement discovery as a finite library/search surface.** Default
  ranking uses explicit query, prior saved/repeated Recipe categories, current
  horizon, and explicit constraints. It never infers allergies, health goals,
  or family-member preferences from private responses.
- [ ] **Step 3: Saving creates a private owned Recipe copy** with publication or
  catalog source, source version, lineage, license, attribution, and version.
  Removing a publication/catalog source removes future discovery but follows
  the applicable rights/termination rule for already authorized private copies.
- [ ] **Step 4: Run and commit.**

### Task 8: Expose AI preparation and bounded operations without moving authority

- [ ] **Step 1: Add capability-manifest tests** for Recipe search/read, prepare
  copy/share proposal, invite collaborator, prepare publication, publish exact
  version, withdraw publication, report publication, save an independent copy,
  add candidate to current MealPlan, and exact native return.
- [ ] **Step 2: Implement AI-assisted publication preparation.** AI may propose
  a description, tags, credits, lineage labels, alt text, and source
  attribution from evidence. It may not choose a public identity, infer rights,
  add a distribution scope, or publish silently.
- [ ] **Step 3: Require explicit native review and capability-owned receipt** for
  collaboration invitations, distribution, republishing, and withdrawal.
  Recipe and Meal Planning providers retain reads, validation, mutation,
  receipt, and return destinations.
- [ ] **Step 4: Run Chat coverage/eval tests and commit.**

### Task 9: Completion gate

- [ ] Prove copy and live-share on separate accounts/devices, including removal
  and wrong-user negative cases.
- [ ] Review every catalog source's rights manifest and takedown path; obtain
  counsel review before external catalog launch.
- [ ] Prove public identity never derives from private account/household
  identity; prove private edits do not alter published snapshots; prove
  report/moderate/withdraw/cache-invalidate behavior before public launch.
- [ ] Obtain legal, privacy, community, and child-safety approval for public
  publication policy and operational response ownership.
- [ ] Measure whether discovery is used after household reuse is already
  healthy; do not use catalog breadth to mask a weak planning loop.
- [ ] Run Supabase, Deno, Jest, product lint, Chat coverage, and
  `npm run verify:changed -- --run`.
- [ ] Keep collections only if repeated sharing actually benefits from a durable
  group. Otherwise retain independent copies and one-Recipe live sharing.
- [ ] Keep discoverable user publication only if creators value attribution and
  discovery without unacceptable rights, moderation, privacy, or safety burden;
  otherwise retain private copies, collaboration, and unlisted links.
