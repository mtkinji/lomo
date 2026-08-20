# Child Rewards Drawer Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan inline. Do not create a worktree without Andrew's explicit approval.

**Goal:** Make the child Rewards drawer state-led, age-neutral, safe-area-correct, and immediately understandable across empty, redeemable, pending, and recently paid states.

**Architecture:** Keep reward ledger behavior unchanged and derive presentation directly from the existing `ChoreRewardsProjection`. Compose the drawer from canonical `BottomDrawer`, `BottomDrawerHeader`, `BottomDrawerFooter`, `EmptyState`, and `Button`; place the primary request action in `bottomAccessory` so the shared drawer owns safe-area geometry. Keep the existing caregiver branch unchanged in this slice because caregiver follow-through is owned by its separate attention flow.

**Tech Stack:** React Native, Expo, TypeScript, Jest, React Native Testing Library.

---

### Task 1: Lock the child-state contract with focused regressions

**Files:**
- Create: `src/capabilities/chores/components/ChoreRewardsDrawer.test.tsx`

- [ ] Add a regression proving the redeem action is supplied through `BottomDrawer.bottomAccessory`, not placed in scrolling content.
- [ ] Cover the pristine empty state: illustration copy is present and balance, stepper, and request action are absent.
- [ ] Cover pending-only state: payment-request status and cancellation remain visible while zero-balance redemption controls are absent.
- [ ] Cover an available balance with a pending request and the latest settled payout receipt.
- [ ] Run `npx jest src/capabilities/chores/components/ChoreRewardsDrawer.test.tsx --runInBand` and confirm the pre-implementation assertions fail for the expected missing hierarchy.

### Task 2: Add the approved utility illustration

**Files:**
- Create: `src/capabilities/chores/assets/rewards-empty.png`

- [ ] Copy the approved transparent empty-pouch PNG into the capability-owned assets folder.
- [ ] Verify the repository copy remains RGBA and visually legible at the shared compact empty-state scale.

### Task 3: Implement the state-led child drawer

**Files:**
- Modify: `src/capabilities/chores/components/ChoreRewardsDrawer.tsx`

- [ ] Add the pristine empty state using canonical `EmptyState`, the pouch illustration, `No tokens yet`, and one concrete earning sentence.
- [ ] Replace the balance card with flat `Ready to redeem` hierarchy: tokens first, current cash equivalent second.
- [ ] Replace payout cards with one compact `Payment requested` section whose rows show amount, token count, next actor, ownership reassurance, and `Cancel request`.
- [ ] Hide the balance and amount picker when no tokens are redeemable.
- [ ] Add one quiet latest-paid receipt when it is the relevant closure state; do not add a transaction-history dashboard.
- [ ] Move the request action to canonical `BottomDrawerFooter` through `bottomAccessory` and label it `Ask for $X`.
- [ ] Enable dynamic sizing with a large maximum detent so compact states remain compact and long states can expand.

### Task 4: Update existing screen expectations and verify

**Files:**
- Modify: `src/capabilities/chores/screens/ChoresScreen.test.tsx`

- [ ] Update only child Rewards expectations to the new copy and hierarchy; preserve caregiver payout assertions.
- [ ] Run the focused drawer and Chores screen suites.
- [ ] Run `npm run verify:changed -- --run` once after the slice is complete.
- [ ] Operate the real Settings → Kwilt Labs → Chores → child Rewards path on the iPhone 17 Pro/iOS 26.5 Simulator for pristine empty, available, available-plus-pending, pending-only, and recently paid states. Record Simulator proof separately from source/tests and leave physical-device, Android, Dynamic Type, and assistive-technology proof explicit if unrun.
