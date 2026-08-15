# Supported Online Retailer Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people rank only the online grocery destinations Kwilt can actually use, showing a Kroger-backed store by its local banner and never asking them to manage unsupported stores.

**Architecture:** Keep the stored retailer ID as the internal provider route, while deriving the visible retailer list from runtime capability policy, the selected fulfillment mode, and an exact preferred grocery location. Add one focused supported-store picker that reuses the existing Kroger location search and map; persist the exact branch separately, then reconcile the preference label to the consumer banner.

**Tech Stack:** React Native, Expo, TypeScript, React Navigation, React Native Draggable FlatList, Jest, Testing Library.

---

### Task 1: Define actionable online destinations

**Files:**
- Modify: `src/capabilities/groceries/domain/onlineShoppingPreferences.ts`
- Test: `src/capabilities/groceries/domain/onlineShoppingPreferences.test.ts`

- [ ] Add failing tests proving that unsupported, unapproved, and fulfillment-incompatible retailers are omitted; a Kroger route is omitted without an exact store; and a selected Smith's location produces a `kroger` preference labeled `Smith's`.
- [ ] Run `npm test -- --runInBand src/capabilities/groceries/domain/onlineShoppingPreferences.test.ts` and confirm the new cases fail.
- [ ] Implement capability-driven retailer derivation and reconciliation while retaining schema-v1 parsing for existing stored data.
- [ ] Rerun the focused domain test and confirm it passes.

### Task 2: Combine retailer selection and priority

**Files:**
- Modify: `src/capabilities/groceries/components/RetailerPreferenceList.tsx`
- Modify: `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.tsx`
- Test: `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.test.tsx`

- [ ] Replace switches and the separate order step with one draggable list whose left handles reorder, whose quiet remove actions remove a destination, and whose labeled add action sits below the list.
- [ ] Load existing preferences and the preferred exact store, reconcile both against current runtime capability and fulfillment mode, and prepopulate only currently actionable destinations.
- [ ] Remove membership questions, custom retailer entry, `Kroger family`, and commission-order copy from the setup surface.
- [ ] Add focused screen tests for local-banner presentation, unsupported-retailer exclusion, add-store routing, accessible reordering, removal, and saved ranks.

### Task 3: Add a supported nearby-store picker

**Files:**
- Create: `src/capabilities/groceries/screens/OnlineStorePickerScreen.tsx`
- Create: `src/capabilities/groceries/screens/OnlineStorePickerScreen.test.tsx`
- Modify: `src/capabilities/groceries/components/KrogerStoreFinder.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`

- [ ] Reuse the existing map-first Kroger location search without starting product matching or cart preparation.
- [ ] Search automatically only when location is already authorized; otherwise let the person search by city, address, or ZIP or explicitly request current location.
- [ ] Persist the chosen exact location, return to setup, and let setup add the location's consumer banner to the ranked online list.
- [ ] Test manual search, banner persistence, navigation return, and the absence of corporate-owner language.

### Task 4: Reconcile legacy preferences at order time

**Files:**
- Modify: `src/capabilities/groceries/screens/OnlineOrderScreen.tsx`
- Test: `src/capabilities/groceries/screens/OnlineOrderScreen.test.tsx`

- [ ] Reconcile stored preferences against current capability and exact-store evidence before resolving an order path.
- [ ] Replace the `Kroger family` fallback with neutral local-store language and send empty reconciliations back through setup rather than rendering a blank order screen.
- [ ] Test migration of an old Kroger preference to Smith's and exclusion of remembered-only destinations.

### Task 5: Update product contracts and verify

**Files:**
- Modify: `docs/feature-briefs/online-grocery-cart-concierge.md`
- Modify: `docs/design-explorations/shopping-commerce/06-grocery-list-fulfillment-ui-contract.md`

- [ ] Record that the online priority list contains only actionable destinations and that provider ownership remains internal.
- [ ] Run the focused grocery domain and screen suites.
- [ ] Run `npm run verify:changed -- --run` and inspect the full result.
- [ ] Exercise the first-use setup, nearby-store selection, reorder, remove, and returning-order paths in the owned iOS runtime; capture screenshots if the runtime is available and report the exact proof boundary otherwise.
