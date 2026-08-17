# Amazon Batch Cart Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Amazon's one-item-at-a-time shopping pass with a transient whole-list handoff that can use a provider-issued batch cart URL without pretending generic links populated a cart.

**Architecture:** Add a pure preparation contract that partitions provider evidence into ready, review, and unavailable items. The Amazon provider invokes a server-owned preparation endpoint when configured; internal builds without provider evidence render a clearly labeled unavailable handoff state, while only a provider-issued cart URL enables the explicit `Open Amazon` handoff. Items without sufficient evidence stay on the Kwilt list automatically rather than becoming a second review workflow.

**Tech Stack:** React Native, Expo, TypeScript, Supabase Edge Functions, Jest, Testing Library.

---

## UI contract

- **Job:** When Maya has a reviewed grocery list, she needs Kwilt to carry the obvious products into Amazon together and quietly retain everything else.
- **Authority chain:** accepted grocery concierge brief -> Kwilt UI primitives and grocery review precedent -> Amazon provider evidence -> Amazon-owned cart and checkout.
- **Three-second read:** Kwilt is preparing the shop, then how many items are ready and how many will stay in Kwilt.
- **Primary action:** `Open Amazon` appears only for a provider-issued batch-cart URL; the return receipt can reopen Amazon or return to Groceries.
- **Reveal later:** nothing item-by-item in the handoff. The retained items remain available in the normal grocery list.
- **Must not add:** guessed ASINs, inferred cart success, automatic checkout, embedded WebViews, or a list-sized mandatory confirmation loop.
- **Required states:** preparing, ready, opening, opened receipt, provider unavailable, handoff failure, preview-only, and nothing remaining.

### Task 1: Define deterministic preparation state

**Files:**
- Create: `src/capabilities/groceries/domain/retailerBatchPreparation.ts`
- Test: `src/capabilities/groceries/domain/retailerBatchPreparation.test.ts`

- [ ] Test parsing, duplicate/unknown item rejection, partitioning, and batch-handoff eligibility.
- [ ] Implement the minimal types, parser, partition, and summary helpers.
- [ ] Run the focused domain suite.

### Task 2: Add the provider boundary

**Files:**
- Create: `src/capabilities/groceries/providers/amazonCartPreparationProvider.ts`
- Test: `src/capabilities/groceries/providers/amazonCartPreparationProvider.test.ts`

- [ ] Invoke the server-owned preparation endpoint and parse its bounded response.
- [x] Provide a clearly labeled internal preview state with no cart URL and no ready-item claim.
- [ ] Run the focused provider suite.

### Task 3: Replace the mandatory item loop

**Files:**
- Modify: `src/capabilities/groceries/screens/RetailerLinkShoppingScreen.tsx`
- Modify: `src/capabilities/groceries/screens/RetailerLinkShoppingScreen.test.tsx`

- [x] Render a transient preparation state rather than a match-management screen.
- [x] Wait for explicit consent before opening a provider-issued cart URL, then show a compact receipt when the user returns.
- [x] Keep unresolved items on the Kwilt list without exposing individual exception searches.
- [x] Prove preview data never opens Amazon or claims a real cart was changed.

### Task 4: Align product truth and verify

**Files:**
- Modify: `docs/feature-briefs/online-grocery-cart-concierge.md`
- Modify: `src/capabilities/groceries/FEATURE.md`

- [x] Record transient whole-list Amazon behavior and the separate provider/batch-handoff gates.
- [ ] Run focused grocery suites and `npm run verify:changed -- --run`.
- [x] Verify the preview receipt in the owned iOS runtime.
