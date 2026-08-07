# Household Food Phase 4: Kroger Basket Truth and Savings Implementation Plan

## Current gate — not started

This phase is intentionally held. No real grocery-cycle evidence, disposable
Kroger OAuth/cart proof, or authorized coupon activation scope exists in this
worktree. The implemented Food spine therefore exposes neither a Savings UI nor
an “apply coupon” mutation. Promotion comparison and retailer handoff may begin
only after the entry gate below; coupon activation remains `not_authorized`
until a provider can enumerate, activate, and acknowledge it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a closer Kroger-family cart handoff and a calm Savings Autopilot that distinguishes promotion evidence, activation requirements, estimates, and itemized realized savings without pretending Kwilt can universally clip coupons.

**Architecture:** Kroger OAuth, store/product search, price evidence, mappings, cart-add, and receipts live behind the provider adapter and server-only encrypted tokens. A deterministic matcher proposes products for explicit confirmation; a deterministic optimizer ranks no more than three net-outcome changes. Accepted SavingsPlans are immutable evidence snapshots and SavingsOutcomes require itemized receipt/order evidence or remain user-reported.

**Tech Stack:** Supabase Postgres/RLS/Storage/Edge Functions, Kroger Public APIs with authorization code + PKCE, `packages/food-core`, React Native, OCR/structured receipt review, Jest/RNTL, Deno tests, and pgTAP.

---

## Entry gate

Do not execute this plan until:

- real Groceries cycles show dependable canonical items;
- Instacart/plain handoff demonstrates last-mile demand;
- the Kroger developer application proves Smith's location search, product
  search, regular/promo price fields, customer OAuth, and cart-add;
- actual developer-console scopes are recorded; and
- there is no assumption of coupon enumeration or activation authority.

If any gate fails, retain Instacart/plain handoff and stop this phase without
weakening Recipes, Meal Planning, or Groceries.

## Scope and file map

Create:

- `supabase/migrations/20260806040000_grocery_savings.sql`
- `supabase/tests/grocery_savings.sql`
- `src/capabilities/groceries/domain/productMatching.ts` and test
- `packages/food-core/src/savings/basketOptimizer.ts` and test
- `src/capabilities/groceries/data/krogerConnectionRepository.ts` and test
- `src/capabilities/groceries/screens/KrogerConnectionScreen.tsx` and test
- `src/capabilities/groceries/screens/ProductMatchReviewScreen.tsx` and test
- `src/capabilities/groceries/screens/SavingsReviewScreen.tsx` and test
- `src/capabilities/groceries/screens/ReceiptReconciliationScreen.tsx` and test
- `supabase/functions/_shared/krogerAdapter.ts` and Deno test
- `supabase/functions/kroger-auth-start/index.ts`
- `supabase/functions/kroger-auth-callback/index.ts`
- `supabase/functions/kroger-api/index.ts`
- `supabase/functions/grocery-savings/index.ts`
- `supabase/functions/grocery-receipt/index.ts`

Modify Connected Tools, retailer registry, Grocery Activity card, analytics,
credential-expiration monitoring, and Groceries feature documentation.

## Evidence vocabulary

```text
PriceQuote: regular | promo | member_unverified
Offer: promotion | loyalty_price | coupon | basket_offer | rebate
Offer state:
  offer_found -> eligibility_unknown | eligible
  -> activation_required | promotion_included
  -> activation_confirmed | retailer_confirmation_required
Savings evidence:
  checkout_estimate -> receipt_verified -> savings_realized
```

Only a provider acknowledgement can produce `activation_confirmed`. Only
itemized receipt/order evidence can produce `savings_realized`.

### Task 1: Add provider account, product, quote, offer, plan, and outcome schema

**Files:** migration and pgTAP

- [ ] **Step 1: Write RLS/schema tests** for `kwilt_grocery_provider_accounts`,
  server-only token table, locations, product mappings, price quotes, offers,
  immutable SavingsPlans, accepted recommendations, receipt artifacts, and
  SavingsOutcomes. Prove owner control, wrong-account denial, no client token
  reads, quote expiry, list-revision binding, and append-only evidence.
- [ ] **Step 2: Implement tables and RPCs.** Tokens follow the existing calendar
  token isolation pattern but use a provider-specific encryption key and scoped
  account row. Client RPCs expose connection label, store, granted capabilities,
  last sync, and revoke—never token payload.
- [ ] **Step 3: Add deletion/revocation.** Revocation removes tokens, disables
  mappings that require the account, expires quotes/offers, preserves historical
  accepted plan/outcome evidence, and leaves GroceryLists intact.
- [ ] **Step 4: Run pgTAP and commit.**

### Task 2: Implement Kroger OAuth with PKCE and explicit scopes

**Files:** auth functions, repository, Connected Tools/Kroger screen/tests

- [ ] **Step 1: Write tests** for PKCE verifier/challenge, signed state, expiry,
  replay, wrong user, denied consent, missing scope, refresh rotation, revoke,
  callback deep link, and token non-disclosure.
- [ ] **Step 2: Implement `kroger-auth-start`.** Create 10-minute signed state
  tied to current Kwilt user, PKCE challenge, and exact recorded scopes. Return
  the provider authorization URL.
- [ ] **Step 3: Implement callback.** Validate state once, exchange server-side,
  encrypt tokens, persist granted capabilities, and return
  `kwilt://settings/connections/kroger?status=connected`. Never log code, token,
  state, account id, or redirect query.
- [ ] **Step 4: Implement refresh and revoke** with one retry after 401 and no
  automatic retry after ambiguous write operations.
- [ ] **Step 5: Run Deno/mobile tests, signed OAuth proof, and commit.**

### Task 3: Add store selection and product matching proposals

**Files:** `krogerAdapter.ts`, Deno test, `productMatching.ts`, test, connection/match screens

- [ ] **Step 1: Write tests** for ZIP/radius store search, explicit store
  selection, query construction, household-confirmed preference, UPC, brand
  preference, generic search, allergy-safe refusal, no match, stale mapping,
  location change, and price freshness.
- [ ] **Step 2: Implement matching order:**

```text
confirmed household mapping at this location
-> last user-confirmed mapping
-> trusted UPC
-> constrained provider search
-> generic search
-> no match
```

Never treat title similarity as allergy or dietary safety. Each proposal shows
product label, size, regular/promo evidence, confidence, and why it was chosen.
- [ ] **Step 3: Implement explicit confirmation.** Confirmation writes a
  location-scoped ProductMapping; rejection records only safe reason codes and
  does not poison other locations.
- [ ] **Step 4: Run fixture/live disposable-list proof and commit.**

### Task 4: Add idempotent cart-add with ambiguous-write protection

**Files:** Kroger adapter/API tests, Handoff screen/card tests

- [ ] **Step 1: Write tests** for confirmed products only, max provider batch,
  stale list/quote, duplicate local request, provider acknowledgement, 4xx, 429,
  timeout before response, timeout after possible commit, token refresh, and
  exact next-step copy.
- [ ] **Step 2: Implement `cart_add_requested` and
  `cart_add_acknowledged`.** Hash the exact list revision/product/quantity
  payload. On an ambiguous timeout, set `confirmation_required`; do not retry
  automatically because duplicates may be added. The UI tells the user to
  inspect the Kroger cart.
- [ ] **Step 3: After acknowledgement show:** “Added to Kroger cart—review
  products, substitutions, slot, payment, and checkout there.” Never say
  ordered, delivered, reserved, or coupon-applied.
- [ ] **Step 4: Run and commit.**

### Task 5: Build the deterministic basket optimizer

**Files:** `basketOptimizer.ts`, test

- [ ] **Step 1: Write exhaustive pure tests** for regular/promo price, unit
  price, required quantity, package rounding, expected waste, preferred/avoided
  brand, fees, membership/minimum, store split penalty, rebate versus checkout
  discount, unknown member price, expiry, tie, and “saving” that costs more.

```text
goods after eligible offers
+ known delivery/service fees
+ expected tip
+ membership/minimum effects
+ store-splitting cost
+ expected waste penalty
= recommended household outcome
```

- [ ] **Step 2: Implement candidate baskets and recommendation ranking.** Return
  at most three recommendations exceeding the household's worthwhile threshold.
  Every result includes before/after arithmetic, freshness, evidence class,
  uncertainty, required action, and preference impact.
- [ ] **Step 3: Prohibit unsupported states in types.** No public source may
  construct `eligible` or `activation_confirmed` without provider evidence.
- [ ] **Step 4: Run property/table tests and commit.**

### Task 6: Build one calm Savings review

**Files:** Savings screen/test, API function, analytics

- [ ] **Step 1: Write tests** for no useful savings, up to three changes,
  promo included, activation required, member price unverified, rebate after
  purchase, price expired, accept/reject, unwanted substitution, detailed
  arithmetic, and immutable accepted snapshot.
- [ ] **Step 2: Implement `Find savings` only after list/product review.** Lead
  with a bounded estimated total or “No worthwhile changes found,” not coupon
  count. Accepting changes updates product selections through Groceries policy
  and records the exact SavingsPlan; it does not claim retailer activation.
- [ ] **Step 3: Add official retailer handoff** for activation-required offers.
  Returning from the retailer leaves state `retailer_confirmation_required`
  until supported provider or user evidence confirms more.
- [ ] **Step 4: Run and commit.**

### Task 7: Reconcile user-supplied itemized receipts

**Files:** receipt function/screen/tests, Storage policy tests

- [ ] **Step 1: Write tests** for photo upload ownership, size/type limits, OCR
  draft, merchant/date/items/discounts/fees/total review, manual correction,
  duplicate receipt, deletion, bank-total-only evidence, estimate comparison,
  and realized-savings refusal without itemized data.
- [ ] **Step 2: Implement private upload and review.** OCR/model output is a
  draft. The user reviews item lines, discounts, fees, and total before save.
  Images are private, time-limited in processing, and deletable.
- [ ] **Step 3: Reconcile immutable estimates.** Preserve the accepted
  SavingsPlan and create a separate SavingsOutcome. A bank transaction may
  confirm merchant/total only; itemized receipt/order data is required for
  product or coupon realization.
- [ ] **Step 4: Run and commit.**

### Task 8: Add operational controls and complete deletion

**Files:** Connected Tools, credential monitoring, provider remote config/tests

- [ ] **Step 1: Test connection view, scopes, store, last use, revoke, provider
  disable, credential expiry alert, deletion, and fallback.**
- [ ] **Step 2: Implement a server remote-disable switch** that removes Kroger
  actions immediately while preserving plain/Instacart list handoff.
- [ ] **Step 3: Add safe observability.** Log provider operation, request id,
  response class, latency, payload hash, quote age, and state only. Never log
  products, items, prices associated with names, tokens, cart, receipt, or user.
- [ ] **Step 4: Run and commit.**

### Task 9: Authorized coupon activation gate

- [ ] Record the actual Kroger/public provider scopes and evidence. If offer
  enumeration, eligibility, activation, acknowledgement, and redemption are
  not all documented, close this task as `not_authorized` with no activation
  code.
- [ ] If a future provider supplies all required authority, create a new
  feature brief and implementation plan; do not extend the generic adapter with
  guessed `applyCoupon` behavior.

### Task 10: Phase completion gate

- [ ] Run Supabase, Deno, `food-core`, Jest, product lint, security-negative,
  and changed-verification gates.
- [ ] Prove OAuth/revoke/token isolation with a disposable account and signed
  device; prove cart-add with a disposable list and inspect the actual retailer
  cart.
- [ ] Reconcile at least three itemized real receipts and measure estimate error.
- [ ] Confirm recommendations reduce landed cost without unwanted products,
  excessive quantity, waste, or extra store trips.
- [ ] Keep Savings only if users report better outcomes without learning a deal
  workflow. Otherwise retain promotion evidence and retire the optimizer UI.
