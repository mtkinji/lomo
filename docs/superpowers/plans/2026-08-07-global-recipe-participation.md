# Global Recipe Participation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution.

**Goal:** Let every permanent user privately heart and rate catalog meals, maintain one evolving personal edition attached to its source, and—when using an active adult public profile—write moderated public Cooking notes.

**Architecture:** Participation attaches to immutable `RecipePublication` and exact published version IDs. Hearts remain private with no public counts. Ratings are one integer per person per version and expose an aggregate only at five ratings. A catalog change creates one person-owned Recipe with immutable adaptation lineage; every later update or restoration appends another version to that same identity. Cooking notes are a deliberately gated public surface with profile, reporting, moderation, deletion, and audit boundaries.

**Tech Stack:** Supabase Postgres/RLS/RPC, React Native, existing Recipe store/contracts, Jest/RNTL, pgTAP.

---

## Task 1: Canonicalize private hearts

- [ ] Migrate `kwilt_recipe_favorites.recipe_ref` values from legacy roster refs to canonical publication IDs while retaining alias resolution for old clients.
- [ ] Update `set_kwilt_recipe_favorite` to validate that the target is either a readable personal Recipe or active catalog publication.
- [ ] Test per-person privacy, add/remove idempotency, withdrawn publication behavior, and cross-account denial.
- [ ] Keep heart controls on library cards; do not add public totals.

## Task 2: Add exact-version ratings

- [ ] Add `kwilt_recipe_ratings(person_id, publication_id, recipe_version_id, rating, created_at, updated_at)` with a 1–5 constraint and one row per person/publication/version.
- [ ] Add an authenticated RPC to set or remove the caller's rating after validating the publication/version pair.
- [ ] Add a security-barrier aggregate projection exposing `average_rating` and `rating_count` only when count is at least five; never expose raters.
- [ ] Add repository/store tests and a quiet Recipe Home rating control after the recipe content, not on discovery cards.

## Task 3: Create one attached personal edition

- [ ] Add `start_kwilt_personal_recipe_edition` RPC tests first: exact source version, one edition per person/publication, new private owner, version 1, catalog provenance, `adaptation` lineage, idempotency, withdrawn source rules, and unrelated-user denial.
- [ ] Implement the transaction by copying the pinned version, ingredients, and instructions into one person-owned Recipe without copying public notes or aggregate ratings.
- [ ] Add **Edit for me** to catalog Recipe actions. The user experiences an attached edition, not a loose duplicate.
- [ ] Resolve that person's edition before the canonical publication by default while keeping **Based on Kwilt's original recipe** visible.
- [ ] Prove later catalog republishing never mutates or silently merges into the personal edition.

## Task 4: Add AI-forward, manually complete recipe updates

- [ ] Write prompt-builder, schema-parser, and draft-diff tests first. AI receives only the exact authorized RecipeVersion plus the person's bounded instruction and returns a structured proposal; it never mutates.
- [ ] Put **Tell Kwilt what changed** above the existing editable fields on one Update Recipe screen. Applying a suggestion changes only the local draft and highlights the proposed fields.
- [ ] Keep direct fields fully usable when AI is unavailable, times out, returns invalid data, or the device is offline.
- [ ] Save each reviewed draft as the next immutable version with expected-version and idempotency authority.

## Task 5: Add offline version saves and reconciliation

- [ ] Write the local queue and reconciliation tests first: account-keyed storage, create/update ordering, idempotent retry, same-version acknowledgment, account clearing, network interruption, concurrent server update, and no silent overwrite.
- [ ] Make an offline save current on that device immediately and show **Saved on this device · Will sync when connected**.
- [ ] Reconcile automatically when connectivity returns. If server authority advanced, retain both local and remote drafts and open explicit conflict review.
- [ ] Prove the user can reopen, cook, and edit the locally saved version before sync.

## Task 6: Add quiet version history and restoration

- [ ] Add history projection tests for current personal version, prior immutable versions, and the exact catalog source version.
- [ ] Open history from the Recipe Home identity line, not a persistent title dropdown or a new management tab.
- [ ] Open historical versions read-only. **Use this version** appends a new version restored from the selection; it never rewrites the current pointer backward.
- [ ] Keep finalized Meal Plan, Grocery, and Cook snapshots pinned to the version originally used.

## Task 7: Establish opt-in adult public profiles

- [ ] Implement `kwilt_public_creator_profiles` separately from account and Household identity, with a user-chosen public name and active/disabled/deleted states.
- [ ] Require `kwilt_people.kind = 'adult'`; do not prefill a public profile from private display name without confirmation.
- [ ] Add create/update/disable RPCs and RLS tests for owner mutation, public projection, child/dependent denial, and identity non-disclosure.

## Task 8: Add moderated Cooking notes

- [ ] Add notes, reports, moderation cases, and immutable audit events with bounded text, edit history metadata, soft deletion, rate limits, and indexes for publication/time pagination.
- [ ] Permit reads only for active notes on active publications; permit writes only from permanent adult users with active public profiles.
- [ ] Add author edit/delete, viewer report, moderator restrict/remove/restore, and audit RPC tests before UI.
- [ ] Add a finite “Cooking notes” section on Recipe Home with compose/report actions; omit replies, likes, follower counts, notifications, and a global feed.

## Task 9: Release and proof

- [ ] Ship hearts, ratings, and private revisions behind independent flags from Cooking notes.
- [ ] Prove two permanent accounts can independently heart/rate/evolve the same catalog meal without observing each other's private state.
- [ ] Prove connected AI suggestion review, fully offline manual update/save/reopen, reconnect sync, and concurrent-version reconciliation.
- [ ] Prove public-note profile gating, reporting, moderation, withdrawal, cache invalidation, and child-account denial before enabling comments.
- [ ] Run Supabase tests, related Jest/RNTL, `npm run product:lint`, and `npm run verify:changed -- --run`.
