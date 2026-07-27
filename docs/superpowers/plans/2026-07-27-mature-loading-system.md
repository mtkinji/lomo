# Mature Loading System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not dispatch subagents unless Andrew explicitly asks for parallel agent work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stacked launch waits, blank Money loading screens, and inconsistent Chat progress with one content-first readiness strategy that preserves context and measures actual time to usefulness.

**Architecture:** Add small shared timing/presentation primitives rather than one universal loading component. App startup keeps the native splash only until fonts and local auth identity are ready, then renders the first usable shell while remote probes continue. Money renders destination-shaped placeholders only when no snapshot exists and preserves last-success content during refresh. Chat keeps the timeline/composer mounted and uses delayed, typed progress inside the timeline.

**Tech Stack:** React Native, Expo SDK 54, `expo-splash-screen`, TypeScript, Jest, React Navigation, Supabase, existing startup telemetry and haptics.

---

## Contract

- Under 150 ms: no progress UI.
- Missing content after 150 ms: structure-matched placeholder in the destination.
- Existing content: keep it visible during refresh; never replace it with a spinner.
- Over 2 s: show concise task-specific status only when it adds truthful context.
- Chat: progress is a timeline item, not a detached overlay.
- Haptics acknowledge input and confirmed outcome, not elapsed time.
- Financial placeholders must never resemble actual amounts.

### Task 1: Add Shared Delay And Presentation Policies

**Files:**
- Create: `src/ui/loading/loadingPolicy.ts`
- Create: `src/ui/loading/loadingPolicy.test.ts`
- Create: `src/ui/loading/useDelayedVisibility.ts`
- Create: `src/ui/loading/useDelayedVisibility.test.tsx`
- Create: `src/ui/loading/LoadingBlock.tsx`

- [ ] **Step 1: Write failing policy tests**

```ts
expect(resolveLoadingPresentation({ elapsedMs: 80, hasContent: false, failed: false })).toBe('silent');
expect(resolveLoadingPresentation({ elapsedMs: 150, hasContent: false, failed: false })).toBe('placeholder');
expect(resolveLoadingPresentation({ elapsedMs: 5000, hasContent: true, failed: false })).toBe('refreshing');
expect(resolveLoadingPresentation({ elapsedMs: 500, hasContent: true, failed: true })).toBe('stale-error');
expect(resolveLoadingPresentation({ elapsedMs: 500, hasContent: false, failed: true })).toBe('blocking-error');
```

Define:

```ts
export type LoadingPresentation = 'silent' | 'placeholder' | 'refreshing' | 'stale-error' | 'blocking-error';
export function resolveLoadingPresentation(input: {
  elapsedMs: number;
  hasContent: boolean;
  failed: boolean;
}): LoadingPresentation;
```

- [ ] **Step 2: Run the focused tests and verify failure**

```bash
npx jest src/ui/loading/loadingPolicy.test.ts src/ui/loading/useDelayedVisibility.test.tsx --runInBand
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the pure policy and delayed hook**

`useDelayedVisibility(active, delayMs = 150)` must reset immediately when inactive, clear timers on unmount, and respect reduced motion by changing only animation—not the timing contract.

- [ ] **Step 4: Add a quiet reusable block**

`LoadingBlock` accepts `width`, `height`, and `borderRadius`; it uses `colors.gray100` with a low-opacity pulse only when reduced motion is off. It renders no text and has `importantForAccessibility="no-hide-descendants"`.

- [ ] **Step 5: Verify and commit**

```bash
npx jest src/ui/loading/loadingPolicy.test.ts src/ui/loading/useDelayedVisibility.test.tsx --runInBand
git add src/ui/loading
git commit -m "feat(ui): add content-first loading primitives"
```

### Task 2: Remove The Timed Branded Startup Hold

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `App.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/services/performance/startupTelemetry.ts`
- Modify: `src/services/performance/startupTelemetry.test.ts`
- Delete: `src/features/onboarding/launchCadence.ts`
- Delete: `src/features/onboarding/launchCadence.test.ts`
- Delete: `src/features/onboarding/LaunchScreen.tsx`

- [ ] **Step 1: Install the Expo-matched native splash package**

```bash
npx expo install expo-splash-screen
```

Expected: Expo chooses the SDK 54-compatible version and updates both package files.

- [ ] **Step 2: Add failing startup-gate tests**

Extend startup telemetry tests so `markStartupGateReady('fonts')`, `markStartupGateReady('auth')`, and `markStartupGateReady('navigation')` record separate durations and the first-surface measurement remains one-shot. No test should encode a minimum branded-screen duration.

- [ ] **Step 3: Hold the native splash only for local critical readiness**

At module initialization:

```ts
import * as SplashScreen from 'expo-splash-screen';
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
```

In `App`, remove `isBootstrapped`, `launchScreenDurationMs`, and `LaunchScreen`. Render the first real root once fonts and local auth hydration are resolved. Call `hideAsync()` from the laid-out root view. Do not wait for RevenueCat identification, returning-user remote probes, sync, notifications, or Money.

- [ ] **Step 4: Remove the second navigation restoration screen**

Keep the native splash until restored navigation state has been read. If navigation restoration fails, open the normal default route and record the failure; do not render `Opening your workspace...` as another full-screen phase.

- [ ] **Step 5: Preserve truthful signed-out and configuration states**

`ConfigErrorScreen` and `SignInInterstitial` remain real destinations. Auth hydration errors must resolve to a recoverable signed-out/error state rather than leave the native splash held indefinitely. Add a 5-second watchdog that logs the unresolved gate and releases to the recoverable state; it must not fabricate signed-in content.

- [ ] **Step 6: Verify startup behavior**

```bash
npx jest src/services/performance/startupTelemetry.test.ts --runInBand
npm run lint
```

Simulator acceptance:

- warm signed-in launch restores the prior route without a timed Kwilt interstitial;
- signed-out launch lands on sign-in;
- offline signed-in launch reaches the locally restorable shell while remote services recover;
- telemetry records app-to-auth-ready, app-to-root-ready, and app-to-first-surface-usable.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json App.tsx src/navigation/RootNavigator.tsx src/services/performance/startupTelemetry.ts src/services/performance/startupTelemetry.test.ts src/features/onboarding/LaunchScreen.tsx src/features/onboarding/launchCadence.ts src/features/onboarding/launchCadence.test.ts
git commit -m "perf(startup): reveal the first usable surface sooner"
```

### Task 3: Make Money First Load Destination-Shaped

**Files:**
- Create: `src/capabilities/money/components/MoneyInitialPlaceholder.tsx`
- Create: `src/capabilities/money/components/MoneyInitialPlaceholder.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyScreenFrame.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionsScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyAccountsScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyScreenFrame.test.tsx`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`

- [ ] **Step 1: Write failing rendering tests**

Required cases:

```ts
render(<MoneyInitialPlaceholder variant="transactions" />); // six row shapes, no amounts or loading sentence
render(<MoneyInitialPlaceholder variant="summary" />);      // six meter shapes
render(<MoneyInitialPlaceholder variant="accounts" />);     // four account row shapes
```

The frame must keep `PageHeader` visible immediately. Before 150 ms the canvas stays quiet; after 150 ms the appropriate placeholder appears. `Reading your Money data…` must not render.

- [ ] **Step 2: Add a `loadingVariant` contract to `MoneyScreenFrame`**

```ts
type MoneyLoadingVariant = 'summary' | 'transactions' | 'accounts' | 'detail';
```

Each top-level Money screen passes its variant. Keep the current stale-snapshot behavior: refresh leaves content mounted and uses the existing pull-to-refresh/freshness state.

- [ ] **Step 3: Measure the actual first load**

Record privacy-safe buckets for `money_first_snapshot_ms` and `money_refresh_ms`, reusing the existing telemetry allowlist. Do not log category names, balances, account IDs, or transaction counts.

- [ ] **Step 4: Add a bounded slow-load recovery**

After 8 seconds with no snapshot, show one line: `Money is taking longer than usual.` and a `Try again` action. Keep the destination placeholder/chrome visible. A real repository error still uses the existing readable blocking error.

- [ ] **Step 5: Verify and commit**

```bash
npx jest src/capabilities/money/components/MoneyInitialPlaceholder.test.tsx src/capabilities/money/screens/MoneyScreenFrame.test.tsx src/capabilities/money/data/moneyDataState.test.ts --runInBand
git add src/capabilities/money
git commit -m "refactor(money): keep destination context while loading"
```

### Task 4: Make Chat Progress Part Of The Timeline

**Files:**
- Create: `src/features/ai/chatProgress.ts`
- Create: `src/features/ai/chatProgress.test.ts`
- Create: `src/features/ai/ChatTurnProgress.tsx`
- Modify: `src/features/ai/AiChatScreen.tsx`
- Modify: `src/features/ai/AgentWorkspace.tsx`
- Modify: `src/domain/workflows.ts`

- [ ] **Step 1: Write failing progress-state tests**

```ts
expect(getChatProgressCopy({ phase: 'waiting', kind: 'ordinary' })).toBe('Working on that');
expect(getChatProgressCopy({ phase: 'using_tools', kind: 'plan' })).toBe('Checking your plan');
expect(getChatProgressCopy({ phase: 'drafting', kind: 'goal' })).toBe('Drafting a goal you can edit');
```

The helper accepts only stable product phases. It must not invent provider/model internals.

- [ ] **Step 2: Delay progress to prevent flashes**

Use `useDelayedVisibility(thinking, 240)`. Keep prior messages and the composer mounted. Replace `ThinkingBubble` with `ChatTurnProgress` in the normal timeline position. The row uses animated dots, `accessibilityLiveRegion="polite"`, and no spinner.

- [ ] **Step 3: Replace static workflow loading messages with typed phases**

Change workflow behavior from arbitrary `loadingMessage` to:

```ts
progress?: { kind: 'ordinary' | 'goal' | 'arc' | 'activity' | 'plan'; phase: 'waiting' | 'using_tools' | 'drafting' };
```

`AgentWorkspace` updates one stable progress timeline item and removes it when the result/error arrives. Preserve existing streamed assistant content and proposal skeletons.

- [ ] **Step 4: Keep operation-local spinners local**

Retry buttons, Add-all, and other button-owned writes may keep compact spinners because they describe one explicit control. They must not disable unrelated timeline reading or composer interaction unless concurrent submission is unsafe.

- [ ] **Step 5: Verify and commit**

```bash
npx jest src/features/ai/chatProgress.test.ts --runInBand
npm run lint
git add src/features/ai src/domain/workflows.ts
git commit -m "refactor(chat): integrate progress into the timeline"
```

### Task 5: Verify The Loading Program

- [ ] **Step 1: Run the diff-aware completion gate**

```bash
npm run verify:changed -- --run
```

Expected: all derived TypeScript, Jest, product, architecture, and code-map gates pass.

- [ ] **Step 2: Run native proof from this checkout only**

Record branch, commit, dirty state, simulator, native build/install provenance, and Metro port. Capture cold and warm startup, Money first load/refresh, Chat bootstrap/turn, slow/offline recovery, and reduced-motion behavior.

- [ ] **Step 3: Keep proof boundaries explicit**

Simulator proves layout/state transitions and recorded timings. Physical-device haptics, actual poor-network behavior, installed TestFlight startup, and production AI/Plaid latency remain separate until exercised there.
