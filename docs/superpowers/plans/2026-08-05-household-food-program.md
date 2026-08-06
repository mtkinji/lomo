# Household Food Program Implementation Plan

## Implementation checkpoint — August 5, 2026

The first testable spine is implemented on `codex/household-food-ai-exploration`:
private Recipe capture/import/review/cooking, organizer and family Meal Planning,
deterministic Grocery compilation/review/export, and an honest Instacart list-link
handoff. The feature remains pre-deployment until the three new migrations and
Edge Functions pass Supabase Local, then signed Simulator/device QA.

Savings/Kroger and public discovery remain intentionally gated. They are not
stubbed as working features: Kroger requires disposable-account OAuth, product,
price, and cart proof after real grocery cycles; coupon activation remains
`not_authorized` without a provider acknowledgement API; public discovery waits
for private reuse plus moderation and rights operations.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement the linked phase plans task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, AI-native, private, ad-free household food loop that turns photos, URLs, spoken knowledge, and natural-language requests into reviewable Recipes, flexible household meal choices, trustworthy groceries, evidence-backed savings, and a reviewed retailer handoff without claiming authority Kwilt does not have.

**Architecture:** Recipes, Meal Planning, and Groceries are separate capability owners with server-authoritative records and narrow projections between them. AI operates these capabilities through the canonical operation manifest and proposal/receipt ledger; it never owns parallel food state. Import extraction produces temporary evidence-backed drafts, private sharing and public publication are separate aggregates, and immutable Recipe versions feed plans and public snapshots. Activities host optional reminders and capability-owned context/action cards; retailer access is isolated behind provider adapters, idempotent handoffs, remote disable switches, and exact evidence states. The program ships a polished import-first vertical spine before expanding participation, retailer depth, savings, or public discovery.

**Tech Stack:** Expo SDK 55, React Native 0.83, React Navigation 7, Zustand 5, Supabase Postgres/RLS/Realtime/Edge Functions, Deno TypeScript, Expo Notifications, PostHog feature flags, Jest/RNTL, schema.org Recipe JSON-LD, Instacart Developer Platform, and Kroger Public APIs.

---

## The outcome and the constraint

The target experience is:

```text
private recipe knowledge
  -> choose the next meals on the household's real cadence
  -> gather bounded family input when useful
  -> finalize the plan
  -> compile and review groceries
  -> find a few worthwhile, evidence-backed savings
  -> open a reviewed retailer handoff
  -> optionally reconcile the real receipt
```

The build must remain valuable if every external provider is unavailable. A
user can always create, cook, plan, compile, edit, export, copy, and share a
plain list. Instacart and Kroger improve the last mile; they are not the data
model.

## Locked capability boundaries

| Owner | Canonical records | Mutations it alone authorizes | Projections it may consume |
| --- | --- | --- | --- |
| Recipes | Recipe, RecipeVersion, RecipeIngredientLine, RecipeProvenance, RecipeCredit, RecipeLineage, RecipeAccessGrant, RecipeCollection, RecipeMediaAsset, RecipeImportDraft, PublicCreatorProfile, RecipePublication | prepare/approve import, create/edit/version/delete/share/copy/collaborate/export/prepare and publish a reviewed version | source provenance, person identity, household invitation eligibility |
| Meal Planning | MealPlan, MealCandidate, MealChoiceRound, MealChoiceResponse, MealPlanEntry | open/close round, submit/withdraw response, finalize/revise plan | Recipe snapshots, Household invitation eligibility |
| Groceries | GroceryList, GroceryItem, ProductMapping, PriceQuote, Offer, SavingsPlan, SavingsOutcome, RetailerHandoff | compile/correct list, select product, accept savings, create handoff, reconcile receipt | finalized MealPlan version, provider evidence |
| Activities | optional reminder/cooking/shopping Activity and action-card binding | ordinary Activity lifecycle only | capability-owned projection and receipt |

Deleting or completing an Activity never finalizes or deletes a MealPlan.
Revising a Recipe never silently rewrites a finalized MealPlan. Reopening a
finalized MealPlan creates a new version and marks derived GroceryLists stale.
Refreshing prices never rewrites an accepted SavingsPlan or realized outcome.

## Program decomposition

This is intentionally seven execution plans rather than one enormous mutable
branch:

1. [Preflight domain and AI contracts](2026-08-05-household-food-phase-preflight-domain-ai-contracts.md)
2. [Foundation, feasibility, and Activity projections](2026-08-05-household-food-phase-0-foundation.md)
3. [Private Recipe Box](2026-08-05-household-food-phase-1-recipes.md)
4. [Meal Planning and family choice](2026-08-05-household-food-phase-2-meal-planning.md)
5. [Groceries and Instacart fulfillment](2026-08-05-household-food-phase-3-groceries-instacart.md)
6. [Kroger Basket Truth and Savings Autopilot](2026-08-05-household-food-phase-4-savings.md)
7. [Recipe sharing, family collections, and discovery](2026-08-05-household-food-phase-5-sharing-discovery.md)

Execute sequentially in the repository's existing checkout and branch. Each
phase ends in working software and a go/no-go decision. Do not start the next
phase simply because source tests pass.

The plans are numbered by capability dependency, but the first external release
uses a narrower cross-phase execution order:

1. prove preflight contracts and import/model feasibility;
2. build photo/URL import, review, private Recipe versions, and clean cooking;
3. build the organizer-only planning core and AI candidate proposal;
4. build deterministic grocery compilation, ambiguity review, Already have,
   and plain export;
5. dogfood three end-to-end household cycles; then
6. add family participation, retailer handoff, savings, and public sharing only
   as their preceding evidence gates are earned.

This is a thin **scope** with a high quality bar. Photo and URL import, source
evidence, correction, provenance, save retry, clean cooking, and deterministic
plan-to-list continuity are required for the first lovable release.

## AI operating-layer contract

AI should be able to invoke every reasonable user-meaningful food operation,
but authority is not uniform. Each operation is registered once in
`KWILT_CAPABILITY_MANIFEST` with its capability owner, typed input/output,
effect, consequence, reversibility, confirmation, provider eligibility,
evidence, receipt, exact return path, and channel coverage.

| Authority | Behavior | Food examples |
| --- | --- | --- |
| Direct | read or complete low-risk reversible work after an explicit request | search/read Recipes; create an empty draft |
| Reviewed | stage an evidence-backed proposal for correction/approval | approve import; edit Recipe content; accept a plan proposal; reconcile receipt lines |
| Explicit consequential | require a named confirmation and durable receipt | invite a person; publish a version; confirm a product; activate an authorized offer; add products to a cart |
| Native handoff | prepare context and return to the provider-owned action | account login, delivery slot, payment, checkout |
| Excluded | report the boundary and offer a safe next action | infer rights; silently publish; claim allergy safety; invent/apply unsupported coupons; autonomously pay |

Native Food, Unified Chat, Activity action cards, Phone, and future Gmail
ingestion use these same operations. A channel is not `live` merely because its
model can name a tool; it must collect the required evidence, show required
review, return the authoritative receipt, and deep-link to the owning resource.

AI may extract, interpret, propose, explain, and execute operations at the
declared authority. It may not invent source facts, Recipe facts, rights,
participant consent, price, availability, offer eligibility, activation, cart
state, order state, or realized savings. Deterministic code owns ingredient
conversion, qualification, unit economics, basket arithmetic, and evidence
state transitions.

The detailed authority and learning decision is in
[`food-ai-operating-layer`](../../design-explorations/food-ai-operating-layer/03-converge.md).

## Recipe object and publication contract

The implementation-grade Recipe model is defined in
[`object-models.md`](../../design-explorations/meals-recipes-groceries/object-models.md).
The release-one architecture includes immutable versions, provenance, credits,
lineage, explicit access grants, collections, media rights, and temporary
import drafts.

Public distribution is never represented by a private Recipe visibility flag.
It uses an opted-in `PublicCreatorProfile` and a `RecipePublication` that points
to one exact reviewed Recipe version, attribution snapshot, approved media,
rights attestation, and selected Kwilt/public distribution scopes. Private edits
do not silently republish. Reporting, moderation, rights complaints,
withdrawal, and child-safety policy are required before discoverable public
publication launches.

## Cross-phase data contracts

### Recipe snapshot consumed by Meal Planning

```ts
export type PlannedRecipeSnapshot = {
  recipeId: string;
  recipeVersionId: string;
  recipeVersion: number;
  title: string;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  ownerPersonId: string;
  sourceAttribution: string | null;
};
```

Meal Planning snapshots the exact Recipe version used. It does not receive
private story text, edit rights, broad collection access, or live mutation
authority.

### Finalized plan contract consumed by Groceries

```ts
export type FinalizedMealPlanProjection = {
  mealPlanId: string;
  mealPlanVersion: number;
  finalizedAt: string;
  entries: Array<{
    id: string;
    kind: 'recipe' | 'meal_note';
    recipeId: string | null;
    recipeVersionId: string | null;
    recipeVersion: number | null;
    title: string;
    servings: number | null;
  }>;
};
```

Groceries loads ingredient lines from the referenced immutable Recipe versions
on the server and records their provenance. It rejects a projection whose plan
version is no longer finalized.

### Activity projection contract

```ts
export type ActivityActionCardBinding = {
  providerId: 'screen_time' | 'meal_planning' | 'groceries' | 'gmail';
  projectionKind: string;
  resourceRef: string;
  sourceVersion: string | null;
};
```

The provider resolves viewer authorization and current state at render/action
time. Activities store no provider token, arbitrary remote UI, participant
responses, retailer cart payload, or coupon state.

### Retailer adapter contract

```ts
export interface GroceryRetailerAdapter {
  readonly provider: 'instacart' | 'kroger';
  capabilities(): ReadonlySet<
    'list_link' | 'location_search' | 'product_search' | 'promo_price' | 'cart_add'
  >;
  prepare(request: GroceryHandoffRequest): Promise<GroceryHandoffPreparation>;
  commit(request: GroceryHandoffCommit): Promise<RetailerHandoffReceipt>;
}
```

The registry advertises only capabilities proven by the configured provider.
There is no generic `checkout`, `order`, or `apply_coupon` capability.

## Release sequence and gates

### Gate 0: provider and import feasibility

Before retailer-dependent product work:

- generate ten Instacart development list pages and score whether the user
  corrects products rather than recreating the basket;
- verify nearby retailer results for Utah ZIP codes, including whether Harmons
  appears;
- validate Kroger/Smith's location search, product search, regular/promo price,
  OAuth, and cart-add with a disposable list;
- run structured import against 50 representative recipe URLs;
- record provider terms, caching limits, attribution requirements, rate limits,
  credential rotation, and remote-disable procedure.

Exit with one of three recorded outcomes per provider: `proceed`,
`plain_handoff_only`, or `blocked_by_access`. A blocked provider cannot hold up
Recipes, Meal Planning, or Groceries.

### Release 1: private Recipe Box

Permanent threshold: Andrew's household saves and cooks from at least ten real
recipes from a representative mix of photographs, URLs, dictation, and manual
entry; can correct uncertain fields without retyping; and no longer needs the
source page for ordinary cooking. Import remains private, user-initiated,
attributed, evidence-backed, and reviewed. Photo and URL import are release
criteria, not later enhancements.

### Release 2: organizer Meal Planning

Permanent threshold: at least three planning cycles use next-shop, meal-count,
or date-range horizons without users forcing the product back into a weekly
calendar. Optional day placement remains subordinate.

### Release 3: bounded family choice

Permanent threshold: separately authenticated invited members willingly
respond, organizers report less guessing or negotiation, and negative
authorization tests plus two-device runtime proof show that uninvited members
cannot see candidates or responses.

### Release 4: Groceries

Permanent threshold: three finalized plans compile to lists whose corrections
are materially smaller than manual reconstruction. Already-have review removes
work without creating a pantry-maintenance job.

### Release 5: Instacart

Permanent threshold: reviewed list pages materially reduce retailer re-entry
and users reach checkout often enough to matter. The receipt remains
`ready_for_retailer_review` or user-reported completion; it never claims an
order.

### Release 6: Kroger Basket Truth

Begin only after Instacart usage proves the last-mile demand. Keep Kroger if
confirmed product mappings plus promo evidence yield a meaningfully closer
handoff without making match review slower than retailer search.

### Release 7: Savings Autopilot

Begin only after product matching is dependable. Keep it if accepted
recommendations improve itemized realized outcomes without increasing unwanted
substitutions, waste, store splitting, or deal-management time.

### Gate 8: authorized coupon activation

No implementation begins until a documented provider contract supplies:

- offer enumeration;
- eligibility and qualification rules;
- explicit activation authority;
- activation acknowledgement;
- expiration and stacking semantics; and
- redemption or itemized receipt evidence.

Without all six, Kwilt may show promotion evidence or an official activation
handoff but may not say **applied**.

## Navigation and activation

The first product surface is one feature-flagged **Food** destination that
opens the most relevant of Recipes, Next meals, or Groceries. The three owners
have independent manifests and navigators behind that entry. Do not add three
permanent global rows before dogfood shows that users need them.

Progressive offers:

- first recipe from share/paste/manual capture;
- **Plan the next meals** after three saved Recipes;
- **Ask the family** only with an open plan and an eligible activated member;
- **Make grocery list** only from two or more finalized meal entries;
- **Shop ingredients** only after list review;
- **Find savings** only when current product/price evidence exists.

## Offline, sync, and source-of-truth policy

- Recipes and GroceryLists have user-keyed local read caches for cooking and
  list access; server rows remain authoritative for sharing and versioned
  transformations.
- Meal Planning rounds are server-authoritative and do not accept offline
  finalization or stale response mutation. The UI may cache a read-only round
  snapshot and queues only a re-fetch, never an offline response replay after
  closure.
- Recipe draft editing may be local-first, but save creates one versioned
  server mutation.
- External handoff and savings mutations always require an online server
  acknowledgement.
- Account change clears every food cache before another user's data renders.

## Security and privacy acceptance

- RLS tests cover owner, explicitly shared reader/contributor, invited round
  participant, uninvited household member, removed member, unrelated account,
  and anonymous user.
- Household membership is eligibility, never blanket Recipe, MealPlan, Grocery,
  price, offer, retailer-account, or dietary access.
- Child invitation projections contain only candidate title/image snapshot,
  response rule, close time, inviter label, and the child's own response.
- Recipe URLs and imported content are treated as untrusted input. Server fetch
  blocks private/link-local addresses, redirects are bounded, response size and
  content type are capped, and embedded prompt instructions grant no authority.
- OAuth tokens and API keys remain server-side and encrypted. Analytics and
  logs exclude recipe text, grocery items, source URLs, family notes, dietary
  data, member names, provider account IDs, and cart contents.
- Deletion covers canonical rows, caches, import artifacts, images, provider
  mappings, OAuth credentials, handoffs, receipts, and derived search indexes.

## Copyright and content acceptance

- No bulk crawl, public mirror, or removal of a publisher's source
  attribution.
- Every import stores source, method, import time, rights basis, and exact
  fields requiring review.
- Publisher images are not copied unless the import path has an explicit rights
  basis; otherwise use no image or a user-owned replacement.
- Export preserves provenance. Public discovery contains only Kwilt-authored,
  licensed, or verified open content.
- External launch waits for terms/copyright/takedown review; local dogfood may
  proceed with private user-supplied content.

## Verification ladder

Every phase distinguishes:

1. pure domain tests;
2. migration/RLS tests;
3. repository/component tests;
4. local Supabase function tests;
5. signed-in Simulator proof;
6. independent-device Household proof;
7. development-provider proof;
8. production-key review and TestFlight proof;
9. real grocery-cycle evidence.

No lower rung is reported as a higher one. A generated Instacart URL is not an
order. Kroger cart-add acknowledgement is not checkout. A promo quote is not a
coupon. A bank transaction is not itemized savings evidence.

## Program-level analytics

Safe dimensions: capability, event kind, horizon kind, counts, correction
buckets, latency buckets, provider, evidence class, outcome, and feature-flag
variant. Prohibited properties: titles, ingredients, instructions, URLs,
source authors, family names, response selections, dietary notes, retailer
account IDs, product IDs, prices tied to an item, receipt images, and cart URLs.

North-star sequence:

```text
recipe_reused
  -> meal_plan_finalized
  -> grocery_list_reviewed
  -> retailer_handoff_opened
  -> next_cycle_started
```

Family participation and savings are supporting evidence, not required gates
for every cycle.

AI/import evaluation additionally records privacy-safe buckets for source type,
confidence, warning class, correction count, extraction latency, model/prompt
version, proposal outcome, and receipt outcome. Private images, source text,
Recipe content, user corrections, and rationales do not enter standard
analytics. Repository evaluation fixtures must be synthetic, public-domain, or
expressly releasable; real household artifacts remain outside Git.

## Monetization posture and implementation gate

The primary business model is subscription value for removed household work,
not access to coupons that are free elsewhere. Do not place the first private
Recipe, first planning cycle, or plain GroceryList behind a paywall; those prove
the loop. After three completed cycles, test one clearly explained Food upgrade
offer around high-value continuity such as larger family collections, extended
planning history, multi-retailer Basket Truth, or Savings reconciliation.

Disclosed affiliate revenue from a retailer handoff is acceptable only when:

- ranking is unchanged by commission;
- the user can always choose the plain-list fallback;
- the handoff labels the retailer and remaining checkout work truthfully;
- analytics separate user value from affiliate conversion; and
- a provider losing commercial terms does not remove the household's Recipes,
  MealPlans, GroceryLists, or exports.

Before implementing a paywall, add a separate experiment brief defining the
free value boundary, entitlement, restore/export behavior, price, success and
harm metrics, and stop rule. “Applied coupons” or inflated nominal savings may
never be used to manufacture paywall value.

## Global non-goals

- Silent autonomous meal finalization or checkout. AI-generated planning
  proposals with organizer review are in scope.
- Nutrition, weight-loss, or diet scoring as the product center.
- Continuous pantry inventory.
- Generic polling or majority-rule family governance.
- Public copied recipe catalog.
- Retailer password storage, browser automation, or logged-in scraping.
- Universal Walmart/Target/Harmons direct cart APIs without documented access.
- Coupon-count gamification, sponsored ranking, or false lowest-price claims.
- Gmail ingestion as a dependency for any food release.

## Completion definition

The program is not complete when all phase branches merge. It is complete when
one household has completed three real cycles, the family participation path is
proven on separate accounts/devices, the ingredient compiler's correction
burden is acceptable, at least one retailer handoff demonstrably reduces
re-entry, and every savings claim matches its evidence class. At that point run
`reflect-after-ship`, update `job-flow-maya-move-family-life-forward`, and decide
whether discovery, broader sharing, Kroger, or offer partnerships earn the next
investment.
