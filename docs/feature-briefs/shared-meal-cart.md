---
id: brief-shared-meal-cart
title: Shared Meal Cart
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [household-food-loop]
owner: andrew
last_updated: 2026-08-07
---

# Shared Meal Cart

## Context

Kwilt's current Meal Planning implementation connects Meals to Groceries but
models household participation as an organizer-opened frozen choice round. The
result exposes planning administration instead of letting the family build one
natural pool of meals together. The existing top-right Plan count and drawer are
liked and already provide the right persistent handle.

## Target audience

`audience-aspirational-family-organizers`: families who want ordinary household
life to move with less coordination without adopting a productivity methodology.

## Representative persona

Maya carries the mental load of deciding what the household will eat. She wants
useful participation from the people affected while retaining authority over the
settled plan and its grocery/spending consequences.

## Aspirational design challenge

How might we help Maya's household build and react to one shared cart of meals,
so the family contributes naturally and Maya can settle a realistic plan with
less coordination, while preserving private participation, clear authorship,
organizer authority, and calm family dynamics?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - the valuable outcome is moving the
household from meal uncertainty into a small set it can shop for and cook, not
engagement with a planner.

## Job flow step

`job-flow-maya-feed-household-with-less-work`:

- **Prepare a plausible short list** is `2/5`; current candidates are
  organizer-heavy and lack a coherent decision surface.
- **Gather household input** is `2/5`; participants require an explicit frozen
  choice round and cannot add directly to the active plan.
- **Make the final call** is `2/5`; authority exists, but generic finalization
  exposes configuration more strongly than the household's emerging decision.

## JTBD framing

When the next few meals are undecided, help everyone put food they would
genuinely eat into one household-private place and show lightweight positive
support, so Maya can make a realistic decision without chasing people, running a
formal vote, or rebuilding their ideas herself.

## Design

### Product contract

- Preserve the existing top-right Plan count as the persistent entry point.
- Open one full Plan drawer from the existing top-right count; adding a meal must
  not reveal a partial drawer.
- Eligible active household members can read the current cart.
- Activated children can participate; deactivated or removed members cannot.
- Any eligible member can add a catalog meal, already household-visible Recipe,
  or plain meal idea.
- Adding records `Added by <name>` and implicitly records the contributor's own
  support.
- Any eligible member can add or remove their own named **Sounds good** reaction.
- Reactions are positive-only, household-visible, reversible, and never used for
  ranking or automatic selection.
- Contributors can withdraw their own unsettled addition; the organizer can
  remove any unsettled candidate.
- Only the household owner/organizer can enter settlement, choose a subset, and
  create the immutable settled plan version.
- Groceries consumes only settled meal/Recipe provenance and never contributor
  or reaction data.

### Active-plan resolution

Production may contain a finalized plan and a newer draft simultaneously. The
shared cart resolves the newest draft first. If none exists, the first addition
creates an open draft under the household's single active owner. Historical
finalized plans remain untouched for Grocery provenance and revision history.

### Authority and persistence

- Use additive production tables/functions; preserve legacy choice-round data.
- Public tables explicitly grant only required Data API access and enable RLS.
- Clients receive projections through household-scoped reads and mutate through
  narrow authenticated `security definer` RPCs with empty `search_path`, explicit
  permanent-user checks, actor resolution, and server-enforced authority.
- Direct client insert/update/delete on cart/reaction tables is revoked.
- Candidate insertion is append-oriented and idempotent; reaction uniqueness is
  person plus candidate.
- Realtime uses existing `postgres_changes` publication/invalidation without
  modifying the locked `realtime` schema.
- Historical private choice responses are never transformed into visible
  reactions.

### Drawer experience

The full drawer keeps one list in insertion order. Each row shows artwork,
title, contributor, compact named support, and only the controls authorized for
the current viewer. **Choose next meals** is a quiet neutral continuation.
Settlement temporarily adds selection controls in the same drawer; the single
dominant charcoal **Use these meals** action creates the settled version. Brand
green is not used for ordinary controls. Default diners/servings do not require
a separate screen. A real exception opens one focused resolver.

The complete UI contract is
[`ui-contract.md`](../design-explorations/shared-meal-cart/ui-contract.md).

### Reductive exclusions

No downvotes, vetoes, comments, mentions, reminders, popularity sorting, winners,
response meters, `Considering`/`Next up` status, AI summary, automatic expiry,
horizon questionnaire, Food dashboard, or parallel planning object.

### Analytics

Capture role, operation kind, result, and count buckets only. Never capture meal
titles, Recipe ids, person names, person-to-meal preference graphs, food needs,
or reaction membership.

### Learning and release

Deploy the additive authority layer to production Supabase while existing app
binaries remain unaware of it. Verify migration history, grants, RLS, RPC
authority, anonymous and cross-household denial, advisors, and schema probes.
Then verify the local app path with two permanent accounts before TestFlight.

See:

- [`03-converge.md`](../design-explorations/shared-meal-cart/03-converge.md)
- [`04-learning-release.md`](../design-explorations/shared-meal-cart/04-learning-release.md)
- [`05-evaluate-learning.md`](../design-explorations/shared-meal-cart/05-evaluate-learning.md)

## Success signal

Across three real food cycles, at least two household members contribute or
react in the same cart; Maya settles without off-app polling; participants
understand support is not commitment; the cart remains clear without another
persistent state; and production authority/security probes show no cross-scope
access or reaction leakage into Groceries.

## Open questions

None for the accepted learning-release scope. Later evidence decides whether a
reversible **Next up** boundary or explicit cart cleanup is needed.

## Spec refinement

Resolved before implementation:

- **Organizer creation:** the single active household owner owns a cart created
  by a non-organizer's first addition.
- **Multiple historical plans:** newest draft wins; finalized plans remain
  historical/current Grocery provenance and are not subject to a new non-archived
  uniqueness constraint.
- **Private Recipes:** only catalog and already household-visible Recipe
  snapshots participate initially; no implicit Recipe-library sharing.
- **Reaction privacy:** named positive reactions are visible to eligible cart
  members; historical private responses remain private.
- **Selection:** popularity never preselects; Maya explicitly selects every
  settled meal.
- **Unselected candidates:** remain after settlement until Maya removes them;
  no expiry in this release.
- **Legacy flow:** choice-round schema and historical reads remain, but new entry
  points disappear from the primary UI.
- **Production rollout:** database deploy precedes app release and is additive;
  existing binaries do not call the new surface.

Acceptance requires source tests, migration contract tests, production schema and
authority probes, advisor review, diff-aware repository verification, and
available Simulator evidence. Two-account physical-device, VoiceOver, Android,
signed-build, and TestFlight evidence remain explicit later gates.
