# Contextual Capability Entry Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task by task. Apply `pragmatic-tdd-posture`: tests first for contracts, persistence, gesture decisions, routing decisions, and analytics; presentational layout may be implemented directly and must be visually verified.

**Goal:** Replace the development-only first-install card chooser with one Parchment Welcome followed by four ranked, full-screen value doors that can be swiped in either direction from anywhere, launch real Money, Meals, Goals, and Chat experiences, and reveal the real capability menu unobscured when the person chooses to explore.

**Architecture:** Keep `capability-onboarding` as a thin universal coordinator. A versioned door registry supplies order, copy, illustrations, handoffs, and first-value ownership. A full-surface pager owns only Welcome/value-story navigation. Selecting a door persists the selection and delegates to the owning capability. The production entry policy remains unchanged; the new reel is reachable only from Developer Tools in this slice.

**Tech stack:** React Native, TypeScript, React Navigation, Zustand with AsyncStorage persistence, React Native `Animated`/`PanResponder`, existing `FullScreenInterstitial`, `Coachmark`, analytics, Jest/`@testing-library/react-native`, Expo iOS runtime.

## Scope and fixed decisions

- The rehearsal contains Welcome plus four doors, in this order:
  1. Put spending apps behind your budget
  2. Make meals easier
  3. Set goals and make a plan
  4. Ask Kwilt for help across the app
- Chores, Games, generic Screen Time, Groceries, and Explore-as-a-door are out of this slice.
- There is no card chooser, `Something else` row, progress bar, top back button, `Swipe to choose` copy, or onboarding overlay on the capability side sheet.
- Welcome has no Continue button. The indicators are tappable and accessible, and the whole surface accepts horizontal swipes.
- Swiping forward past the last door is equivalent to **Explore Kwilt**.
- Money starts in the real Money summary. In the onboarding entry mode, tapping a real category opens that category's existing App Controls screen.
- Meals ends its illustrated orientation in the real Recipe library. There is no onboarding-only meal picker.
- Goals enters the original question-led FTUX in `capability-path` mode so its own generic Welcome is not replayed.
- Chat opens a fresh native Chat with no generated message and no automatic send.
- Production first launch remains on the current FTUX.
- The working tree already contains unrelated changes. Never use `git add -A`; inspect and stage exact paths only after confirming their diffs.

---

## Task 1: Replace chooser contracts with a ranked value-door registry

**Files:**

- Modify: `src/features/capability-onboarding/capabilityOnboardingContracts.ts`
- Modify: `src/features/capability-onboarding/capabilityOnboardingContracts.test.ts`
- Modify: `src/features/capability-onboarding/CapabilityOnboardingEntryPolicy.ts`
- Modify: `src/features/capability-onboarding/CapabilityOnboardingEntryPolicy.test.ts`

### Step 1: Write the failing registry tests

Replace chooser-oriented expectations with tests that assert:

```ts
expect(getCapabilityOnboardingDoors('development').map(({ id }) => id)).toEqual([
  'budget-app-controls',
  'make-meals-easier',
  'make-progress',
  'ask-kwilt',
]);

expect(getCapabilityOnboardingDoors('development')).toHaveLength(4);
expect(getCapabilityOnboardingDoors('production').map(({ id }) => id)).toEqual([
  'make-progress',
]);
```

Also require every promoted door to have a positive unique rank, non-empty headline/body/action
copy, a valid illustration key, a typed handoff, one coordinator, at least one terminal owner, and
authoritative first-value evidence. Assert that no registry copy contains `disabled`, `coming
soon`, or `unique`.

Update the entry-policy tests so development rehearsal still routes only Developer Tools into the
coordinator and production remains on current FTUX until every production-required door is
explicitly promoted. Do not encode the current four-door rehearsal as the permanent production
threshold.

### Step 2: Run the tests and confirm the expected failure

Run:

```bash
npm test -- --runInBand +  src/features/capability-onboarding/capabilityOnboardingContracts.test.ts +  src/features/capability-onboarding/CapabilityOnboardingEntryPolicy.test.ts
```

Expected: failures for missing Money/Chat IDs, missing story metadata, old order, and old
production-threshold assumptions.

### Step 3: Implement the door registry

Define these public types:

```ts
export type CapabilityOnboardingPathId =
  | 'budget-app-controls'
  | 'make-meals-easier'
  | 'make-progress'
  | 'ask-kwilt'
  | 'screen-time-controls'
  | 'household-chores'
  | 'play-together';

export type CapabilityOnboardingIllustrationKey =
  | 'money-app-control'
  | 'meals'
  | 'goals'
  | 'chat'
  | 'screen-time'
  | 'chores'
  | 'games';

export type CapabilityOnboardingHandoff =
  | { kind: 'money-app-control' }
  | { kind: 'food-meal-loop' }
  | { kind: 'identity-workflow' }
  | { kind: 'unified-chat' }
  | { kind: 'screen-time-setup' }
  | { kind: 'chores-setup' }
  | { kind: 'games-entry' };
```

Extend `CapabilityOnboardingContract` with:

```ts
reelRank: number | null;
story: {
  headline: string;
  body: string;
  actionLabel: 'Try it now' | 'Get started';
  illustrationKey: CapabilityOnboardingIllustrationKey;
  illustrationLabel: string;
};
```

Use these first four stories:

```ts
{
  id: 'budget-app-controls',
  reelRank: 1,
  story: {
    headline: 'Put spending apps behind your budget',
    body: 'Choose a budget, choose the apps, and let Kwilt pause them when your spending reaches the boundary you set.',
    actionLabel: 'Try it now',
    illustrationKey: 'money-app-control',
    illustrationLabel: 'A shopping app held behind a calm budget boundary',
  },
}

{
  id: 'make-meals-easier',
  reelRank: 2,
  story: {
    headline: 'Make meals easier',
    body: 'Choose meals together, turn them into one shared list, and keep the recipe easy to follow while you cook.',
    actionLabel: 'Try it now',
    illustrationKey: 'meals',
    illustrationLabel: 'A family choosing a meal and building one grocery list',
  },
}

{
  id: 'make-progress',
  reelRank: 3,
  story: {
    headline: 'Set goals and make a plan',
    body: 'Name what matters, shape a realistic goal, and turn it into the next steps you can actually do.',
    actionLabel: 'Get started',
    illustrationKey: 'goals',
    illustrationLabel: 'A person turning an aspiration into a practical plan',
  },
}

{
  id: 'ask-kwilt',
  reelRank: 4,
  story: {
    headline: 'Ask Kwilt for help across the app',
    body: 'Talk through what you need, then review real changes to your goals, plans, meals, chores, and more.',
    actionLabel: 'Try it now',
    illustrationKey: 'chat',
    illustrationLabel: 'A conversation connecting several parts of family life',
  },
}
```

Keep future contracts unranked with `reelRank: null`; they must not appear in the reel.
`getCapabilityOnboardingDoors(surface)` filters for non-null rank and allowed promotion state,
sorts ascending, rejects duplicate ranks in development, and caps the result at six.

### Step 4: Re-run the focused tests

Run the command from Step 2.

Expected: PASS.

### Step 5: Review the exact diff before any checkpoint commit

Run:

```bash
git diff -- +  src/features/capability-onboarding/capabilityOnboardingContracts.ts +  src/features/capability-onboarding/capabilityOnboardingContracts.test.ts +  src/features/capability-onboarding/CapabilityOnboardingEntryPolicy.ts +  src/features/capability-onboarding/CapabilityOnboardingEntryPolicy.test.ts
```

If those files contain only this task's changes, stage those exact paths and create the checkpoint
commit `feat: define ranked capability onboarding doors`. Otherwise leave them uncommitted and
record the overlap for integration.

---

## Task 2: Migrate persistence from chooser state to reel state

**Files:**

- Modify: `src/features/capability-onboarding/capabilityOnboardingState.ts`
- Modify: `src/features/capability-onboarding/capabilityOnboardingState.test.ts`
- Modify: `src/features/capability-onboarding/useCapabilityOnboardingStore.ts`
- Modify: `src/features/capability-onboarding/useCapabilityOnboardingStore.test.ts`
- Modify: `src/features/capability-onboarding/CapabilityOnboardingResumeScreen.tsx`

### Step 1: Add failing reducer and migration tests

Specify a version-two record:

```ts
type CapabilityOnboardingUniversalState = 'reel' | 'chosen' | 'explored';

type CapabilityOnboardingRecord = {
  schemaVersion: 2;
  universalState: CapabilityOnboardingUniversalState;
  activePageId: 'welcome' | CapabilityOnboardingPathId;
  selectedPathId: CapabilityOnboardingPathId | null;
  checkpoint: string | null;
  pathCheckpoints: Partial<Record<CapabilityOnboardingPathId, string>>;
  completedPaths: Partial<Record<CapabilityOnboardingPathId, CapabilityOnboardingCompletion>>;
  updatedAt: number | null;
};
```

Cover:

- a new record starts at `reel/welcome`;
- `view-page` persists a valid door without selecting it;
- selecting a door preserves its last capability checkpoint;
- `choose-another-door` returns to that door in the reel without deleting capability progress;
- `explore` is terminal for universal onboarding but not a capability completion;
- completion still requires a non-empty owner receipt;
- a v1 `welcome` maps to v2 `reel/welcome`;
- a v1 `chooser` maps to v2 `reel/budget-app-controls`;
- a v1 valid `chosen` path and checkpoint are preserved;
- v1 `looked-around` and `something-else` both map to v2 `explored`;
- unknown versions and removed path IDs reset safely.

### Step 2: Run and confirm failure

```bash
npm test -- --runInBand +  src/features/capability-onboarding/capabilityOnboardingState.test.ts +  src/features/capability-onboarding/useCapabilityOnboardingStore.test.ts
```

Expected: failures because schema v2 and reel actions do not exist.

### Step 3: Implement the v2 reducer and conservative v1 normalization

Use actions:

```ts
type CapabilityOnboardingAction =
  | { type: 'view-page'; pageId: 'welcome' | CapabilityOnboardingPathId; now: number }
  | { type: 'select-path'; pathId: CapabilityOnboardingPathId; now: number }
  | { type: 'checkpoint'; checkpoint: string; now: number }
  | { type: 'choose-another-door'; now: number }
  | { type: 'explore'; now: number }
  | { type: 'complete-path'; pathId: CapabilityOnboardingPathId; receiptId: string; now: number }
  | { type: 'reset' };
```

Keep the existing AsyncStorage key so stored v1 records are actually encountered and migrated.
The store's persisted output becomes v2 after the next write. Do not create a second key that
silently strands v1 progress.

Update resume copy/actions to:

- **Continue where I left off**
- **Choose another starting point**
- **Explore Kwilt**

### Step 4: Re-run the focused tests

Expected: PASS.

---

## Task 3: Build the full-surface bidirectional pager

**Files:**

- Create: `src/features/capability-onboarding/capabilityOnboardingPagerModel.ts`
- Create: `src/features/capability-onboarding/capabilityOnboardingPagerModel.test.ts`
- Create: `src/features/capability-onboarding/CapabilityOnboardingPager.tsx`
- Create: `src/features/capability-onboarding/CapabilityOnboardingPager.test.tsx`
- Modify: `src/features/capability-onboarding/OnboardingPageIndicator.tsx`
- Create: `src/features/capability-onboarding/OnboardingPageIndicator.test.tsx`

### Step 1: Test gesture decisions as pure logic

Create:

```ts
export function shouldCaptureHorizontalPagerGesture(dx: number, dy: number): boolean {
  return Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy) * 1.15;
}

export function resolveCapabilityPagerRelease(input: {
  index: number;
  pageCount: number;
  width: number;
  dx: number;
  velocityX: number;
}):
  | { kind: 'page'; index: number }
  | { kind: 'explore' };
```

Test short drags returning to the same page, distance and velocity thresholds in both directions,
right-edge clamping on Welcome, previous-page navigation, next-page navigation, and a forward swipe
from the final door returning `{ kind: 'explore' }`.

### Step 2: Run the model test and confirm failure

```bash
npm test -- --runInBand +  src/features/capability-onboarding/capabilityOnboardingPagerModel.test.ts
```

Expected: module-not-found failure.

### Step 3: Implement the model

Use an 18% width threshold or absolute velocity of `0.65`. Clamp page results to
`0..pageCount - 1`; only a forward release from the last page may return `explore`.

### Step 4: Write failing component tests

Test that the pager:

- renders Welcome plus the supplied doors in registry order;
- starts at the persisted page ID;
- calls `onPageChanged` after settling;
- calls `onStartDoor` from the visible door CTA;
- calls `onExplore` from **Explore Kwilt**;
- makes every dot a 44-point Pressable with `Go to page N of M` accessibility copy;
- exposes `increment` and `decrement` accessibility actions for non-gesture paging; and
- never renders `Swipe to choose`, `Continue`, or a progress bar.

### Step 5: Implement the pager

Render a single horizontal `Animated.View` track containing all pages at the measured viewport
width. Attach one `PanResponder` to the full track container:

```tsx
const panResponder = PanResponder.create({
  onMoveShouldSetPanResponder: (_event, gesture) =>
    shouldCaptureHorizontalPagerGesture(gesture.dx, gesture.dy),
  onPanResponderMove: (_event, gesture) => {
    translateX.setValue(baseOffset(index, width) + rubberBandAtEdges(gesture.dx, index, pages.length));
  },
  onPanResponderRelease: (_event, gesture) => {
    settle(resolveCapabilityPagerRelease({
      index,
      pageCount: pages.length,
      width,
      dx: gesture.dx,
      velocityX: gesture.vx,
    }));
  },
});
```

Each page uses a vertical `ScrollView` only when Dynamic Type requires it. Because the parent
captures only clearly horizontal motion, vertical reading remains available. Use
`getAccessibleAnimationDuration` for programmatic settles and zero-duration page changes when
Reduce Motion is enabled. Do not disable direct gesture tracking under Reduce Motion.

Change `OnboardingPageIndicator` to accept:

```ts
type Props = {
  currentIndex: number;
  count: number;
  onSelectPage: (index: number) => void;
};
```

The dots remain visually small but each Pressable supplies a minimum 44 by 44 touch target. The
active dot is 22 points wide; inactive dots are 7 points. The indicator reports `Page N of M`.

### Step 6: Run the pager tests

```bash
npm test -- --runInBand +  src/features/capability-onboarding/capabilityOnboardingPagerModel.test.ts +  src/features/capability-onboarding/CapabilityOnboardingPager.test.tsx +  src/features/capability-onboarding/OnboardingPageIndicator.test.tsx
```

Expected: PASS.

---

## Task 4: Build the balanced Welcome and shared value-door page

**Files:**

- Modify: `src/features/capability-onboarding/CapabilityWelcomeScreen.tsx`
- Create: `src/features/capability-onboarding/CapabilityValueDoorScreen.tsx`
- Create: `src/features/capability-onboarding/CapabilityValueDoorScreen.test.tsx`
- Create: `src/features/capability-onboarding/capabilityOnboardingIllustrations.ts`
- Create: `assets/illustrations/capability-onboarding/money-app-control.png`
- Create: `assets/illustrations/capability-onboarding/meals.png`
- Create: `assets/illustrations/capability-onboarding/chat.png`
- Reuse: `assets/illustrations/welcome.png`
- Reuse: `assets/illustrations/goal-set.png`

### Step 1: Make Welcome presentational

Remove its private `PanResponder`, private `Animated.Value`, Continue cue, and hard-coded
two-page indicator. The pager owns all progression. Keep:

- Parchment background;
- 22-point Kwilt mark at top left;
- current Welcome illustration;
- `Welcome to Kwilt` immediately above the bottom body copy; and
- this message:

```text
Life has a lot of moving parts. Kwilt brings goals, money, meals, chores, play, and more into one
place. Swipe through a few ways it can help, then start wherever feels useful.
```

The final sentence clearly sets the next action without adding a separate swipe instruction.

### Step 2: Test the value-door content contract

Require one illustration, one header, one body, one primary CTA, and one quiet **Explore Kwilt**
action. Assert the absence of eyebrows and feature-list rows.

### Step 3: Implement the shared value-door page

Use the same top/bottom geometry as Welcome:

```text
small Kwilt mark

          truthful illustration

headline
short body
primary action
Explore Kwilt
page indicators (owned by pager)
```

Use `typography.titleSm` rather than an oversized display title so the lower region stays light.
Keep copy width at or below 440 points. Let the illustration slot flex and cap it near 35% of the
viewport height. Do not wrap the primary action in a fully rounded card treatment; use the existing
button grammar only for the action itself.

### Step 4: Generate and inspect the three missing illustrations

Use the `imagegen` skill during implementation. Generate transparent PNGs at a consistent square
canvas and use this art direction:

```text
Kwilt editorial illustration: friendly hand-drawn black linework, slightly imperfect organic
shapes, flat muted colors from pine, parchment, turmeric, orange, and restrained blue; warm family
life, no gradients, no text, no logos, no phone mockup, no photorealism, generous transparent
negative space, centered composition that remains legible around 280 points.
```

Scene-specific direction:

- Money: a calm budget boundary between a shopping bag/app tile and an intentional purchase; avoid
  fear, locks, punishment, dollar rain, or surveillance imagery.
- Meals: two household members choosing between meal cards while one shared grocery list forms;
  avoid a restaurant menu or recipe-only composition.
- Chat: one warm conversation connecting small goal, calendar, meal, and chore symbols; avoid a
  generic robot, sparkles-only AI, or dense feature collage.

Inspect every generated file visually before adding it. Normalize dimensions without changing
aspect ratio:

```bash
sips -g pixelWidth -g pixelHeight +  assets/illustrations/capability-onboarding/money-app-control.png +  assets/illustrations/capability-onboarding/meals.png +  assets/illustrations/capability-onboarding/chat.png
```

Expected: three square, transparent, similarly weighted assets. Reject any image with text,
off-palette branding, cropped hands/faces, or a composition heavier than the existing Welcome art.

### Step 5: Run the component test

```bash
npm test -- --runInBand +  src/features/capability-onboarding/CapabilityValueDoorScreen.test.tsx
```

Expected: PASS.

---

## Task 5: Rebuild the universal host around the reel

**Files:**

- Modify: `src/features/capability-onboarding/CapabilityOnboardingHost.tsx`
- Create: `src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx`
- Delete: `src/features/capability-onboarding/CapabilityPathChooserScreen.tsx`
- Delete: `src/features/capability-onboarding/CapabilityPathChooserScreen.test.tsx`

### Step 1: Write failing host tests

Cover:

- a fresh record renders the pager at Welcome;
- a persisted door reopens at that door;
- viewing pages dispatches `view-page` without selecting a capability;
- a CTA dispatches `select-path`, captures selection analytics, and calls the typed handoff;
- Meals activates `FoodOnboardingFlow` inside the modal;
- Goals, Money, and Chat dismiss the modal and delegate immediately;
- **Explore Kwilt** dispatches `explore`, dismisses the modal, and calls `onExploreKwilt`;
- a forward swipe past Chat follows the same Explore path;
- resumed Meals can continue, choose another door, or explore; and
- no chooser or `Something else` callback remains.

### Step 2: Run and confirm failure

```bash
npm test -- --runInBand +  src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx
```

Expected: failures against the old Welcome/chooser branches.

### Step 3: Implement one orchestration path

Change props to:

```ts
type Props = {
  visible: boolean;
  userId: string;
  surface: 'development' | 'production';
  onStartPath: (path: CapabilityOnboardingContract) => void;
  onExploreKwilt: () => void;
};
```

When universal state is `reel`, render `CapabilityOnboardingPager`. When the selected path is
Meals, keep the existing Food resume boundary. Other selected paths leave the modal immediately and
resume in their native capability. Remove `chooserEnteredFromSwipe`, `onSomethingElse`, and all
chooser-state branching.

Keep `StatusBar style="dark"` for the Parchment universal reel. Food owns its own status-bar
choice while active. Delete the chooser files only after all imports and tests are removed.

### Step 4: Re-run the host test

Expected: PASS.

---

## Task 6: Make the Money door continue through real Money UI

**Files:**

- Modify: `src/capabilities/money/navigation/types.ts`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyAppControlScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyAppControlScreen.test.tsx`
- Create: `src/capabilities/money/domain/moneyAppControlOnboarding.ts`
- Create: `src/capabilities/money/domain/moneyAppControlOnboarding.test.ts`

### Step 1: Test the native routing decision

Add:

```ts
export type MoneySummaryEntryIntent = 'app-control-onboarding';

export function getMoneyCategoryDestination(input: {
  categoryId: string;
  entryIntent?: MoneySummaryEntryIntent;
}):
  | { screen: 'MoneyCategoryDetail'; params: { categoryId: string; monthOffset: number } }
  | { screen: 'MoneyAppControl'; params: { categoryId: string } };
```

Test that ordinary category taps still open `MoneyCategoryDetail`, while the onboarding intent
opens `MoneyAppControl` for the exact chosen category.

### Step 2: Run and confirm failure

```bash
npm test -- --runInBand +  src/capabilities/money/domain/moneyAppControlOnboarding.test.ts
```

Expected: module-not-found failure.

### Step 3: Add the typed entry intent

Change the route type:

```ts
MoneySummary: { entryIntent?: 'app-control-onboarding' } | undefined;
```

In `MoneySummaryScreen`, use the pure destination helper in every current-category tap path so
tile and list presentations behave identically. Historical month pages must ignore the onboarding
intent and retain ordinary detail navigation.

### Step 4: Add contextual guidance to the real summary

When `route.params?.entryIntent === 'app-control-onboarding'` and current categories exist, attach
the existing `Coachmark` to the current category collection with:

- Title: **Choose a budget**
- Body: **Pick the kind of spending you want to use as a boundary. You’ll choose the apps and when
  to pause them next.**
- Action: **Got it**
- Secondary action: **Not now**, which clears the route intent without leaving Money.

The coachmark must not cover the category target at default and large text sizes. Do not create an
onboarding category picker.

If Money has no snapshot or no categories, preserve its existing setup/loading/error/empty
experience. Add one inline sentence to the existing setup action only when the intent is present:
**Set up Money first, then you can connect a budget to app controls.** Do not claim that account
connection or budget creation has completed the onboarding path.

### Step 5: Preserve first-value truth on App Controls

Add an optional `source: 'capability-onboarding'` param to `MoneyAppControl`. Pass it from the
summary routing helper. When a save results in:

```ts
authorizationStatus === 'approved' &&
policy.enabled &&
policy.selectedApps.length + policy.selectedCategories.length > 0
```

capture `CapabilityOnboardingPathCompleted` with `path_id: 'budget-app-controls'`,
`category_id`, and the selected preset. This is a local completion receipt only. Do not report
signed-device enforcement as proven.

### Step 6: Run Money tests

```bash
npm test -- --runInBand +  src/capabilities/money/domain/moneyAppControlOnboarding.test.ts +  src/capabilities/money/screens/MoneySummaryScreen.test.tsx +  src/capabilities/money/screens/MoneyAppControlScreen.test.tsx
```

Expected: PASS, with ordinary Money navigation unchanged outside the entry intent.

---

## Task 7: Align Meals FTUX and wire all four native handoffs

**Files:**

- Modify: `src/features/household-food/onboarding/FoodOnboardingFlow.tsx`
- Modify: `src/features/household-food/onboarding/FoodOnboardingFlow.test.tsx`
- Modify: `src/features/household-food/onboarding/foodOnboardingModel.ts`
- Modify: `src/features/household-food/onboarding/foodOnboardingModel.test.ts`
- Modify: `src/features/dev/DevToolsScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` only if the root handoff cannot be expressed through the existing typed navigation prop
- Modify: `src/features/onboarding/FirstTimeUxFlow.tsx` only if the existing `capability-path` entry still replays generic Welcome
- Modify: `src/features/onboarding/firstTimeUxEntryMode.test.ts`

### Step 1: Lock the Meals instructional sequence

Keep two capability-owned moments:

1. **Choose meals together** — choose an existing meal or add one; household members can share and
   vote when a household exists.
2. **Carry the meal through** — compile ingredients into one shared list and keep the recipe
   available in Cook Mode.

Change the flow to Parchment and the shared illustration/copy geometry. Reuse the Meals
illustration with a distinct crop or light motion treatment rather than icon tiles on Pine. Keep
the interactions minimal: **Next**, then **Browse recipes**. **Change path** returns to the reel.
The terminal action continues to the real Recipe library with
`{ onboarding: 'pick-meal' }`, where existing contextual discovery points to a real recipe.

Test that no temporary meal list or meal selection control exists in the FTUX component.

### Step 2: Wire Developer Tools to real destinations

Import `useCapabilityMenuActions` and obtain `openMenu`. Use these handoffs:

```ts
switch (path.handoff.kind) {
  case 'money-app-control':
    navigation.navigate('Money', {
      screen: 'MoneySummary',
      params: { entryIntent: 'app-control-onboarding' },
    });
    return;
  case 'food-meal-loop':
    navigation.navigate('Food', {
      screen: 'RecipeLibrary',
      params: { onboarding: 'pick-meal' },
    });
    return;
  case 'identity-workflow':
    handleTriggerFirstTimeUx('capability-path');
    return;
  case 'unified-chat':
    navigation.navigate('UnifiedChat', {
      entry: 'fresh',
      source: 'capability-onboarding',
      threadId: null,
    });
    return;
}
```

If `handleTriggerFirstTimeUx` cannot currently accept an entry mode, add the smallest typed
store/route handoff needed so `FirstTimeUxFlow` receives `capability-path`. Preserve
`legacy-first-run` everywhere else.

For **Explore Kwilt**:

```ts
setCapabilityOnboardingVisible(false);
InteractionManager.runAfterInteractions(openMenu);
```

This reveals the existing `CapabilitySideSheet` only after the full-screen modal leaves. Do not
render a guide, scrim, or indicator above it.

### Step 3: Test the four dispatches and Explore boundary

Extend the Dev Tools test or extract a pure
`buildCapabilityOnboardingNavigationTarget(handoff)` helper and test exact typed destinations.
Also test that Chat receives `entry: 'fresh'` and no message/draft parameter.

### Step 4: Run focused tests

```bash
npm test -- --runInBand +  src/features/household-food/onboarding/foodOnboardingModel.test.ts +  src/features/household-food/onboarding/FoodOnboardingFlow.test.tsx +  src/features/onboarding/firstTimeUxEntryMode.test.ts +  src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx
```

Expected: PASS.

---

## Task 8: Add page, door, exit, and first-value analytics

**Files:**

- Modify: `src/services/analytics/events.ts`
- Create: `src/features/capability-onboarding/capabilityOnboardingAnalytics.ts`
- Create: `src/features/capability-onboarding/capabilityOnboardingAnalytics.test.ts`
- Modify: `src/features/capability-onboarding/CapabilityOnboardingHost.tsx`

### Step 1: Test bounded analytics builders

Add events:

```ts
CapabilityOnboardingPageViewed
CapabilityOnboardingDoorStarted
CapabilityOnboardingExplored
```

Build properties from finite values only:

```ts
{
  surface: 'development' | 'production';
  page_id: 'welcome' | CapabilityOnboardingPathId;
  page_index: number;
  page_count: number;
  entry: 'fresh' | 'resume';
}
```

Door-start properties add `path_id`, `rank`, and `input: 'button' | 'accessibility'`. Explore
adds `input: 'button' | 'swipe-past-last'` and the page it exited from. Do not send free-form body
copy, recipe names, budget names, selected app identities, Chat drafts, or household data.

### Step 2: Implement deduplicated page impressions

Capture a page view only after a page settles and only once per page per visible host session.
Reset the session set when the host becomes invisible. Keep existing start, path completion, and
release-stage events where their meanings still hold; retire chooser-specific
`CapabilityOnboardingSomethingElse`.

### Step 3: Run analytics tests

```bash
npm test -- --runInBand +  src/features/capability-onboarding/capabilityOnboardingAnalytics.test.ts +  src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx
```

Expected: PASS.

---

## Task 9: Synchronize product ownership and remove stale chooser language

**Files:**

- Verify/modify: `docs/feature-briefs/capability-routed-onboarding.md`
- Verify/modify: `src/features/capability-onboarding/FEATURE.md`
- Verify/modify: `src/features/onboarding/FEATURE.md`
- Modify: `src/capabilities/money/FEATURE.md`
- Modify: `src/features/household-food/FEATURE.md`
- Modify: `src/features/unifiedChat/FEATURE.md`
- Modify: `docs/agent-code-map.md`

### Step 1: Add bidirectional brief links

Add `capability-routed-onboarding` to the Money, Household Food, and Unified Chat manifests because
their folders now implement direct handoffs from the accepted brief. Keep each capability's existing
hero JTBD; the shared brief appears under `briefs` and does not replace capability ownership.

Describe the proof boundary in each manifest:

- Money: onboarding can route to real category App Controls; signed-device enforcement remains a
  separate gate.
- Household Food: the Parchment two-moment orientation ends in the real Recipe library.
- Chat: the onboarding door opens a fresh thread without synthetic content and inherits all
  existing mutation/confirmation boundaries.

Update `docs/agent-code-map.md` so the universal coordinator, door registry, pager, and capability
handoffs are discoverable. Remove stale references to the card chooser and Guided Overture as the
current first-install direction. Do not rewrite historical exploration documents.

### Step 2: Run product and architecture lint

```bash
npm run product:lint
npm run architecture:lint
```

Expected: PASS. If unrelated dirty-worktree changes fail either command, record the exact unrelated
failure and still repair every failure caused by this plan.

---

## Task 10: Completion verification and visual acceptance

**Files:**

- Modify only files required by failures from this plan.
- Save review screenshots outside source control unless Andrew explicitly asks to keep them.

### Step 1: Run the complete focused onboarding suite

```bash
npm test -- --runInBand +  src/features/capability-onboarding +  src/features/household-food/onboarding +  src/features/onboarding/firstTimeUxEntryMode.test.ts +  src/capabilities/money/domain/moneyAppControlOnboarding.test.ts +  src/capabilities/money/screens/MoneySummaryScreen.test.tsx +  src/capabilities/money/screens/MoneyAppControlScreen.test.tsx
```

Expected: PASS.

### Step 2: Run the one task-completion gate

```bash
npm run verify:changed -- --run
```

Run this once after the slice is complete. Re-run only if it fails, the diff changes afterward, or
the integration base changes; state the reason.

### Step 3: Verify the development rehearsal in iPhone 17 Pro Simulator

Launch from Developer Tools and capture:

1. Welcome
2. Money door
3. Meals door
4. Goals door
5. Chat door
6. real capability side sheet after Explore
7. Money summary coachmark
8. real Money App Controls after choosing a category
9. Meals moment one
10. Meals moment two
11. real Recipe library contextual entry
12. original question-led Goals entry
13. fresh empty Chat

For every universal page verify:

- Parchment remains visually continuous;
- the Kwilt mark is smaller than the headline and balanced against indicators;
- Welcome title stays with the bottom copy;
- no status/progress bar, eyebrow, top back button, or swipe instruction appears;
- horizontal swipe works from illustration, copy, and empty canvas;
- both left and right swipes work;
- a vertical Dynamic Type scroll does not accidentally page;
- indicators navigate and announce position;
- the last forward swipe and **Explore Kwilt** both reveal the same unobscured side sheet;
- ordinary shell gestures work after the modal leaves; and
- no page feels heavier than the original Welcome reference.

### Step 4: Run accessibility variants

Repeat the reel with:

- largest accessibility text size;
- VoiceOver;
- Reduce Motion;
- light and dark system appearance, while preserving the intentional Parchment canvas; and
- interrupted/relaunched state on Welcome, every door, both Meals moments, and after Explore.

VoiceOver must expose the page header, body, primary action, Explore action, page position, and
previous/next page actions in a coherent order. No gesture-only path is allowed.

### Step 5: Record proof boundaries

Report separately:

- source and focused test proof;
- Simulator visual/interaction proof;
- signed physical-device Screen Time authorization and shield enforcement;
- internal TestFlight installation and resume behavior; and
- production proof.

The first three can advance the internal learning release. Production remains blocked until every
promoted door passes its capability readiness contract and Andrew accepts the rendered sequence.

### Step 6: Final diff review

```bash
git status --short
git diff --stat
git diff -- +  docs/feature-briefs/capability-routed-onboarding.md +  src/features/capability-onboarding +  src/features/onboarding/FEATURE.md +  src/features/onboarding/FirstTimeUxFlow.tsx +  src/features/onboarding/firstTimeUxEntryMode.ts +  src/features/dev/DevToolsScreen.tsx +  src/capabilities/money +  src/features/household-food +  src/features/unifiedChat/FEATURE.md +  src/services/analytics/events.ts
```

Confirm that no Chores, Games, production-entry, server, migration, or unrelated capability changes
entered the implementation. If committing, stage exact reviewed paths only and use
`feat: add contextual capability entry reel`.
