# Automated testing strategy (scalable)

This doc defines an automated testing strategy for Kwilt as the app grows, with extra focus on:

- **Keyboard avoidance**: the active input should never be covered.
- **Bottom drawers**: opening/closing drawers should never leave the screen “dead” to taps.

It’s intentionally **layered** so you can start small and expand coverage without drowning in brittle tests.

---

## What we’re optimizing for

- **Confidence without exhaustive manual QA**
- **Fast feedback** on PRs (minutes)
- **High-signal E2E coverage** for native interaction regressions (keyboard + gestures + overlays)
- Preserve the app’s fundamental UX layering:
  - **App shell**: primary nav + margins around the page canvas
  - **App canvas**: the main interaction surface

---

## Testing layers (what goes where)

### 1) “Static” checks (always-on, cheapest)

- **Typecheck**: `npm run lint` (currently `tsc --noEmit`)
- Optional but recommended as the codebase grows:
  - **eslint** (fast, catches footguns)
  - **prettier** (format stability)

These should run on every PR.

---

### 2) Unit tests (Jest) — pure logic, deterministic

Use these for:

- **Domain logic** in `src/domain/*`
- **Utility functions** in `src/utils/*`
- **Store selectors / reducers-like logic** (Zustand derived logic)
- **Services** with mocked time/network (e.g. notification scheduling calculations)

Avoid these for:

- Keyboard, gesture, safe-area, bottom sheet interactions (these are native and need E2E)

**Heuristic**: if you can test it without rendering RN views, it belongs here.

---

### 3) Component/integration tests (Jest + React Native Testing Library)

Recommended add-on: `@testing-library/react-native` (RTL for RN).

Use these for:

- “Does this screen show the right UI given state X?”
- “Does tapping button Y call callback Z?”
- “Does `BottomDrawer`/`Dialog` render the right structure when visible?”

Avoid brittle geometry assertions:

- Don’t try to assert pixel-perfect layout or keyboard overlap here—RN/JSDOM can’t simulate native keyboard frames.

---

### 4) E2E tests (native, real gestures) — the regression net

This is the most important layer for your two pain points.

**Recommendation**: start with **Maestro** because it’s fast to author, runs on iOS/Android simulators, and is great at “tap/scroll/type” regressions.

What E2E should cover:

- **Smoke**: app launches, app shell intact, basic navigation works
- **Keyboard safety**: input focus + typing doesn’t trap the user (no “input under keyboard” dead ends)
- **Drawer touchability**: after closing a drawer, the canvas is tappable again
- A few “golden flows” (Activities quick add/edit, Goal edit, etc.) once the basics are stable

---

## Where to focus first (the “Never break” suite)

Keep this suite small (5–10 tests), high-signal, and run it often.

### A) App shell integrity (smoke)

- Open the drawer, navigate between **Arcs / Goals / Activities / Settings**
- Verify screens stay within the normal shell margins/canvas (no overlap/clipping)

### B) Drawer touchability regression (your “dead taps” bug)

Create a deterministic harness and assert:

1. Navigate to **Dev Mode → Gallery**
2. Tap “Open bottom sheet”
3. Tap “Close sheet”
4. Tap a “Tap target (N)” button on the underlying page
5. Assert the counter increments (meaning touches are working)

This is the single best canary for “invisible overlay intercepting touches.”

**Implementation note**: the DevTools Gallery now includes a small harness with testIDs:

- `e2e.openBottomDrawer`
- `e2e.closeBottomDrawer`
- `e2e.tapTarget`

### C) Keyboard avoidance regressions (practical, testable)

E2E should validate **user outcomes**, not geometry:

- Focus the last input in a form and type — user can still proceed / tap next action
- With keyboard open, tapping a button still works (`keyboardShouldPersistTaps`-style regressions)
- Switching inputs quickly doesn’t “lose” the caret or trap the scroll

To make this reliable, add one dedicated **Keyboard Harness** screen in DevTools later:

- A long form (10–15 inputs) using `KeyboardAwareScrollView`
- A “Submit” button at the bottom
- Test asserts: focus last input → type → tap Submit succeeds

This catches the most painful keyboard failures without relying on pixel overlap checks.

---

## Major interactions coverage matrix (E2E-first)

This is the definition of “comprehensive major-interaction coverage” for Kwilt.
The goal is *not* to test every pixel; it’s to ensure **every major interaction path is exercised at least once** in automation.

### App shell + navigation

- **Drawer opens/closes reliably**: `nav.drawer.toggle`
- **All primary destinations reachable** (Arcs/Goals/Activities/Settings + DevTools in dev)
- **App shell preserved** (canvas margins, no stuck overlays)

### Overlays & modals

- **BottomDrawer open/close** and **tap-through after close**
- **Dialogs** open/close and do not leave touch blockers
- **Toasts/interstitial overlays** do not block interaction after dismiss

### Keyboard safety

- **Long form**: last input focusable, typing works, actions tappable while keyboard open
- **Inside drawer**: sheet input focusable, keyboard doesn’t trap user, close returns to tappable canvas

### Core object workflows (seeded / deterministic)

These should be driven via DevTools “seed” actions so tests don’t depend on existing user data:

- **Activities**: create → open detail → edit title/notes → open scheduling drawers → return
- **Goals**: create → open detail → edit fields → open coach drawer → return
- **Arcs**: create → open detail → navigate to related objects → return

---

## Current Maestro suite mapping

- **Smoke (DevTools reachable)**: `e2e/maestro/smoke-devtools.yaml`
- **Bottom drawer tap-through regression**: `e2e/maestro/bottomdrawer-touch-regression.yaml`
- **Keyboard harness (form + sheet)**: `e2e/maestro/keyboard-harness.yaml`
- **Agent workspace smoke (composer + close)**: `e2e/maestro/agent-workspace-smoke.yaml`
- **Activities quick add (dock expand → create)**: `e2e/maestro/activities-quickadd.yaml`
- **Activity detail (key actions drawers)**: `e2e/maestro/activity-detail-key-actions.yaml`

---

## Conventions that make tests reliable

### testID strategy

- Give stable `testID`s to:
  - Primary nav targets
  - Drawer open/close buttons
  - Any bottom drawer open/close CTAs
  - Form submit buttons and the last input in a form
- Prefer **semantic IDs**: `goal.edit.titleInput`, `activity.quickAdd.submit`

### “Harness-first” for tricky native regressions

For keyboard + overlays, build a tiny deterministic harness once (in DevTools) rather than trying to test flaky real flows.

---

## Suggested execution plan (incremental)

### Week 1: get the regression net in place

- Add Maestro (locally) and commit 2–3 flows:
  - **smoke** (launch → open drawer → go to Dev Mode)
  - **bottom drawer touchability** (open/close → tap target increments)
- Wire these to run manually before shipping and in CI later.

### Week 2: add keyboard harness + tests

- Add DevTools Keyboard Harness screen
- Add 2–3 Maestro flows:
  - focus last input → type → submit works
  - open a drawer with an input → type → close drawer → page tappable

### Week 3+: expand “golden flows” carefully

Only add E2E coverage for flows that:

- regress frequently, or
- are mission-critical for launch trust (Activities + core editing flows)

---

## CI guidance (when you’re ready)

You currently don’t have `.github/workflows/*`. When you add CI:

- Run **typecheck + Jest unit tests** on every PR.
- Run **E2E**:
  - on main nightly (full suite),
  - and a tiny smoke subset on PRs (optional, depending on runtime).

---

## Visual regression (UI changes + layout drift)

Behavioral E2E will catch "broken taps" and keyboard regressions, but it can miss
"looks weird" changes unless they break a flow. Visual regression adds a safety
net by taking deterministic screenshots and diffing them in CI.

### What we snapshot

- App shell + canvas margins (root surfaces)
- BottomDrawer open/close states
- Keyboard harness screen with keyboard open
- Activity detail key actions surface

### Baseline workflow (one-time, then as-needed)

1. Run the visual Maestro flows locally.
2. Collect screenshots:
   - `npm run visual:collect`
3. Update the baseline:
   - `npm run visual:update`
4. Commit the images under `e2e/visual-baseline/`.

### When a visual diff fails in CI

- Inspect the `visual-regression-artifacts` uploaded by the workflow.
- If the change is expected, update the baseline locally and re-commit.
- If the change is unexpected, fix the UI and rerun CI.

---

## Tooling quickstart (Maestro)

Maestro isn’t installed in this repo yet; keep it as a local tool.

Add flows under `e2e/maestro/` and run them against a simulator build of your dev client.

See the starter flow files:

- `e2e/maestro/smoke-devtools.yaml`
- `e2e/maestro/bottomdrawer-touch-regression.yaml`


