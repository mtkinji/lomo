# Amazon and Walmart Product-Ready Shopping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Amazon and Walmart complete, preference-respecting online-shopping destinations that can be enabled after exact-surface approval without redesigning the product.

**Architecture:** Keep commercial approval in `RetailerRuntimePolicy`, but make an approved `product_links` retailer a real primary outcome rather than a secondary one-item link. A person-scoped, list-revision-scoped local session records only explicit `reported_added` and `kept_for_later` decisions; it never claims retailer cart or order evidence.

**Tech Stack:** React Native, Expo, TypeScript, React Navigation, AsyncStorage, Jest, Testing Library.

---

### Task 1: Preserve the complete supported-retailer starter list

**Files:**
- Modify: `src/capabilities/groceries/domain/onlineShoppingPreferences.ts`
- Test: `src/capabilities/groceries/domain/onlineShoppingPreferences.test.ts`
- Modify: `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.tsx`
- Test: `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.test.tsx`

- [x] Add failing tests proving newly approved destinations are appended to an existing preference list, while an explicitly removed destination remains disabled and can be re-added.
- [x] Run `npm test -- --runInBand src/capabilities/groceries/domain/onlineShoppingPreferences.test.ts src/capabilities/groceries/screens/OnlineShoppingSetupScreen.test.tsx` and confirm the new assertions fail.
- [x] Reconcile actionable destinations with stored enabled and disabled records; use `enabled: false, rank: 0` as the durable removal state.
- [x] Render and rank only enabled entries, but offer disabled actionable entries under `Add store`.
- [x] Rerun the focused tests and confirm they pass.

### Task 2: Add a truthful retailer-link shopping session

**Files:**
- Create: `src/capabilities/groceries/domain/retailerLinkSession.ts`
- Test: `src/capabilities/groceries/domain/retailerLinkSession.test.ts`
- Create: `src/capabilities/groceries/data/retailerLinkSessionRepository.ts`
- Test: `src/capabilities/groceries/data/retailerLinkSessionRepository.test.ts`

- [x] Add failing tests for this contract:

```ts
type RetailerLinkDecision = 'reported_added' | 'kept_for_later';
type RetailerLinkSession = {
  schemaVersion: 1;
  listId: string;
  listRevision: number;
  retailerId: 'amazon' | 'walmart';
  decisions: Record<string, RetailerLinkDecision>;
  updatedAt: string;
};
```

- [x] Prove invalid, stale-revision, duplicate, and no-longer-needed state is rejected or safely reconciled.
- [x] Implement pure create, parse, reconcile, record-decision, and progress functions.
- [x] Persist by person, list, and retailer in AsyncStorage; clear invalid state instead of surfacing corrupt progress.
- [x] Rerun both focused suites and confirm they pass.

### Task 3: Build the one-item-at-a-time handoff screen

**Files:**
- Create: `src/capabilities/groceries/screens/RetailerLinkShoppingScreen.tsx`
- Test: `src/capabilities/groceries/screens/RetailerLinkShoppingScreen.test.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`

- [x] Render `Shop at Amazon` or `Shop at Walmart`, one current Grocery item, quiet progress, and one primary `Find [item] at [retailer]` action.
- [x] Open only the already-approved qualifying link through the system owner.
- [x] After the handoff resolves, ask for the explicit decision `I added it` or `Keep for later`; persist the answer and advance.
- [x] Show `Paid link` beside each qualifying-link action and plainly state that Kwilt cannot see the retailer cart, availability, price, or checkout.
- [x] At completion, report only user statements such as `7 reported added` and `1 kept for later`; do not mutate Grocery completion or claim a cart/order.
- [x] Test first item, link open, explicit decision, persistence, resume, link failure, empty remainder, and completion.

### Task 4: Make the preferred destination the primary outcome

**Files:**
- Modify: `src/capabilities/groceries/screens/OnlineOrderScreen.tsx`
- Test: `src/capabilities/groceries/screens/OnlineOrderScreen.test.tsx`

- [x] When the highest-ranked ready outcome is `product_links`, render `Shop this list at Amazon/Walmart` as the hero and route to `RetailerLinkShopping`.
- [x] When the highest-ranked ready outcome is `cart_prepare`, retain the existing cart-preparation hero.
- [x] Reveal lower-ranked ready destinations as direct alternative actions instead of explanatory text only.
- [x] Preserve the evidence boundary: link assistance cannot claim coverage or price, and cart preparation cannot claim checkout or order.
- [x] Run the order and navigation tests and confirm they pass.

### Task 5: Update contracts and verify the learning release

**Files:**
- Modify: `docs/feature-briefs/online-grocery-cart-concierge.md`
- Modify: `docs/design-explorations/shopping-commerce/06-grocery-list-fulfillment-ui-contract.md`
- Modify: `src/capabilities/groceries/FEATURE.md`

- [x] Record the distinction between product-ready code, exact-surface approval, and live attribution proof.
- [x] Record the assisted-shopping session as a user-reported progress aid, not a retailer cart.
- [x] Run the focused grocery suites.
- [x] Run `npm run verify:changed -- --run`.
- [ ] In the owned iOS runtime, enable test-only approval configuration, walk Amazon and Walmart through setup, primary outcome, one item decision, resume, completion, and alternative switching, then capture screenshots. Keep production gates disabled until external approval and live attribution proof exist.

Runtime note: setup, preferred primary outcome, both retailer passes, and alternative switching are visually proven in Simulator. Decision, resume, and completion are covered by component and domain tests; live-link interaction remains intentionally unproved until approved qualifying URLs and attribution are available.
