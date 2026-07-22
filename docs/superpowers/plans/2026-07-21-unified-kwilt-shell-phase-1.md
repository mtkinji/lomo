# Unified Kwilt Shell Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert current Kwilt into a capability-host architecture with the Option G global menu, preserved local workflows, explicit lifecycle boundaries, and measurable startup behavior before importing Money or Games.

**Architecture:** React Navigation remains the single host router. A typed capability registry maps global destinations to the existing Goals, To-dos, Plan, Arcs, and Chapters stacks; the Option G underlay reads that registry, while capability lifecycle instrumentation proves unopened capabilities do no work. Existing feature directories and screens remain intact during this phase.

**Tech Stack:** Expo SDK 54, React Native 0.81, React Navigation, TypeScript, Zustand, Jest/jest-expo, PostHog, Xcode Organizer and App Thinning Size Reports.

---

## Program boundary

This plan implements Phase 0 and Phase 1 of `docs/architecture/unified-kwilt-capability-platform.md`. It does not import source code from Kwilt Money or Kwilt Games. Those imports receive separate implementation plans after the host shell passes device and performance proof.

Phase 0 is a hard checkpoint. Record and review its evidence before beginning Task 2.
The production-equivalent lane is `production-widgets`. Phase 0 documentation work may
land independently; no capability registry, route adapter, shell flag, or UI implementation
belongs in the Phase 0 branch.

Andrew authorized Phase 1 on 2026-07-21 with clean rollback as a hard condition. Preserve
the pre-unification runtime at `8c2fb015c44c30a10206ad23f180e1836138fcdc`, preserve the
Phase 0 branch unchanged, and implement Phase 1 on
`codex/unified-kwilt-shell-phase-1`. Do not merge Phase 1 into the current release branch or
enable its production default before the physical-device gate passes.

### Rollback gates

- Option G becomes the single shell in the Phase 1 TestFlight candidate. Do not add a
  production runtime shell flag or retain two live root-navigation implementations.
- Keep the last accepted TestFlight build assigned to the internal test group and record its
  90-day expiration date. Do not expire or remove it during the integration window.
- Tag the pre-unification runtime and every accepted phase boundary. If an accepted
  TestFlight build expires, create a higher build number from its tag so the exact prior code
  state can be distributed again.
- Games and Money land as separate tagged vertical slices and separate TestFlight builds;
  rolling back one import must not require reconstructing an earlier source tree by hand.
- Supabase changes are additive and backward-readable. No destructive column/table rename,
  deletion, or one-way data rewrite is allowed in a capability-import phase.
- Keep standalone Money and Games TestFlight lanes available until their unified parity
  checklists pass on the same account data.
- Create each TestFlight candidate from an immutable commit. Record that commit, source tag,
  build ID, migrations, prior build expiration, and exact last-accepted rollback commit in
  the acceptance evidence.
- A failed performance, navigation, data, or physical-device gate returns testers to the
  prior eligible TestFlight build or ships a replacement from the last accepted tag. It does
  not trigger a partial manual code unwind.

## File map

**Create**

- `src/capabilities/types.ts` — capability, group, route, settings, agent, permission, and lifecycle contracts.
- `src/capabilities/registry.ts` — sole ordered registry for current Kwilt capabilities and groups.
- `src/capabilities/registry.test.ts` — uniqueness, ordering, route, group, and settings-contract tests.
- `src/capabilities/lifecycle.ts` — idempotent activate/deactivate coordinator and instrumentation.
- `src/capabilities/lifecycle.test.ts` — lifecycle transition and no-duplicate-work tests.
- `src/navigation/capabilityNavigation.ts` — typed registry-target to React Navigation action resolver.
- `src/navigation/capabilityNavigation.test.ts` — Goals, To-dos, Plan, Arcs, and Chapters route-resolution tests.
- `src/navigation/CapabilityMenu.tsx` — Option G underlay menu, avatar/settings entry, search, Chats, and capability groups.
- `src/navigation/CapabilityMenu.test.tsx` — accessibility, expansion, active state, navigation, and settings-entry tests.
- `src/navigation/CapabilityShellContext.tsx` — menu state, active-capability derivation, and open/cover behavior.
- `src/services/performance/startupTelemetry.ts` — startup and first-usable-surface signposts/analytics.
- `src/services/performance/startupTelemetry.test.ts` — once-only and duration payload tests.
- `docs/testing/unified-shell-baseline.md` — versioned Phase 0 measurement template and recorded results.

**Modify**

- `src/navigation/RootNavigator.tsx` — mount the capability shell, resolve active capability, and retain existing stacks.
- `src/navigation/placeTabs.ts` — derive compatibility place tabs from registry during transition.
- `src/navigation/KwiltBottomBar.tsx` — remain the default shell until the Option G flag is enabled; no duplicated source of truth.
- `src/navigation/linkingConfig.ts` — preserve existing links while adding capability-root aliases.
- `src/navigation/linkingConfig.test.ts` — prove old and new routes resolve to the same screens.
- `src/navigation/navigationPersistence.ts` — version and safely migrate shell navigation state.
- `src/navigation/navigationPersistence.test.ts` — migration and fallback tests.
- `src/features/account/SettingsHomeScreen.tsx` — remain the global settings destination opened by the menu avatar.
- `src/features/ai/useAgentLauncher.ts` — accept a typed capability context envelope and exact return target.
- `src/features/ai/workflowRegistry.ts` — define the capability-context input shape used by Agent.
- `src/services/analytics/events.ts` — add capability menu, activation, return, and startup events.
- `src/services/analytics/analytics.ts` — type the new event properties.
- `App.tsx` — start/end startup telemetry without initializing capability services.

## Task 1: Record the pre-change production baseline

**Files:**
- Create: `docs/testing/unified-shell-baseline.md`
- Reference: `app.config.ts`
- Reference: `eas.json`
- Reference: `package.json`

- [ ] **Step 1: Create the evidence template**

Include these fields with the current git SHA and build profile:

```markdown
# Unified Shell Baseline

- Git SHA:
- Build profile:
- Resolved Expo app version / build number:
- Resolved iOS extensions and entitlements:
- EAS build or archive identifier:
- Device and iOS version:
- Launch condition (first-of-day or repeat):
- Signed-in account state and restored route:
- App Thinning compressed size:
- App Thinning installed size:
- Hermes bytecode:
- Exported assets:
- Cold launch p50 / p90:
- Warm launch p50 / p90:
- Time to usable To-dos p50 / p90:
- Idle memory on To-dos:
- Startup requests/subscriptions:
- Embedded frameworks/extensions:
```

- [ ] **Step 2: Export the production-widgets iOS bundle**

Run:

```bash
rm -rf /tmp/kwilt-unified-baseline
EAS_BUILD_PROFILE=production-widgets KWILT_APP_ENV=production KWILT_ENABLE_APP_GROUPS=1 KWILT_ENABLE_SCREEN_TIME=1 KWILT_ENABLE_WIDGETS=1 npx expo export --platform ios --output-dir /tmp/kwilt-unified-baseline --clear
du -sh /tmp/kwilt-unified-baseline
find /tmp/kwilt-unified-baseline -type f -print0 | xargs -0 du -k | sort -nr | head -40
```

Expected: export succeeds and the largest bundled assets are visible in descending order.

- [ ] **Step 3: Produce an App Thinning Size Report**

From a disposable worktree pinned to the baseline SHA, resolve Expo config with the
`production-widgets` environment, run a clean iOS prebuild there, archive the `Kwilt`
release scheme, export for all compatible device variants, and attach the resulting
`App Thinning Size Report.txt` values to the evidence document. Do not archive the
checked-in native workspace unless its version, extensions, entitlements, and generated
configuration have first been proven identical to the resolved profile.

Expected: compressed download and uncompressed installed estimates exist for the supported iPhone variants.

- [ ] **Step 4: Record launch and memory evidence**

Use the accepted physical comparison iPhone and Xcode Instruments to record at least ten
cold launches, ten warm launches, time to usable To-dos, idle and peak memory, startup
requests, and active realtime subscriptions. Keep first-of-day/full-launch-screen runs
separate from repeat-launch runs. If the accepted physical device is unavailable, record
the device fields as blocked and stop; simulator or debug evidence may be diagnostic but
must not be placed in the acceptance fields.

Expected: the document contains measurements rather than qualitative labels such as `fast` or `small`.

- [ ] **Step 5: Record the current startup-owner inventory**

Classify every service started by `App.tsx` or root navigation as global, current-capability,
or unresolved. Record observed startup requests/subscriptions separately from static code
inspection. This is the comparison surface for the later zero-work-before-entry gate.

- [ ] **Step 6: Commit the baseline**

```bash
git add docs/testing/unified-shell-baseline.md
git commit -m "docs: record unified shell performance baseline"
```

Stop for Phase 0 review after this commit. Do not begin Task 2 without explicit approval.

## Task 2: Define the capability contract

**Files:**
- Create: `src/capabilities/types.ts`
- Create: `src/capabilities/registry.ts`
- Create: `src/capabilities/registry.test.ts`
- Reference: `src/navigation/RootNavigator.tsx`
- Reference: `src/navigation/placeTabs.ts`
- Reference: `src/ui/Icon.tsx`

- [ ] **Step 1: Write failing registry invariants**

Test that IDs are unique, every grouped capability references a registered group, every active capability has a root route, group order is stable, and the accepted Phase 1 order is Goals, To-dos, Plan, Arcs, Chapters.

```ts
expect(CAPABILITY_REGISTRY.map(({ id }) => id)).toEqual([
  'goals',
  'todos',
  'plan',
  'arcs',
  'chapters',
]);
expect(new Set(CAPABILITY_REGISTRY.map(({ id }) => id)).size).toBe(
  CAPABILITY_REGISTRY.length,
);
```

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npx jest src/capabilities/registry.test.ts --runInBand
```

Expected: FAIL because the capability modules do not exist.

- [ ] **Step 3: Implement the contracts**

Define `CapabilityId`, `CapabilityGroupId`, `CapabilityRouteTarget`, `CapabilitySettingsDestination`, `CapabilityAgentContract`, `CapabilityLifecycleContract`, and `CapabilityDefinition`. Do not import screen components into the registry.

- [ ] **Step 4: Register current capabilities**

Use one `goals-plans` group and route targets matching the existing React Navigation stacks:

```ts
export const CAPABILITY_REGISTRY = [
  capability('goals', 'Goals', 'GoalsTab', 'GoalsList'),
  capability('todos', 'To-dos', 'ActivitiesTab', 'ActivitiesList'),
  capability('plan', 'Plan', 'PlanTab'),
  capability('arcs', 'Arcs', 'MoreTab', 'MoreArcs'),
  capability('chapters', 'Chapters', 'MoreTab', 'MoreChapters'),
] as const satisfies readonly CapabilityDefinition[];
```

Use the actual existing leaf route names from `RootNavigator.tsx`; correct this example if the current typed route differs.

- [ ] **Step 5: Run tests and typecheck**

```bash
npx jest src/capabilities/registry.test.ts --runInBand
npm run lint
npm run lint:tests
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/capabilities
git commit -m "feat: define Kwilt capability registry"
```

## Task 3: Resolve registry targets through the existing navigator

**Files:**
- Create: `src/navigation/capabilityNavigation.ts`
- Create: `src/navigation/capabilityNavigation.test.ts`
- Modify: `src/navigation/placeTabs.ts`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`

- [ ] **Step 1: Write failing route-resolution tests**

Assert the exact nested navigation actions for all five current capabilities and a safe error for an unknown ID.

```ts
expect(resolveCapabilityNavigation('chapters')).toEqual({
  name: 'MainTabs',
  params: { screen: 'MoreTab', params: { screen: 'MoreChapters' } },
});
```

- [ ] **Step 2: Verify the tests fail**

```bash
npx jest src/navigation/capabilityNavigation.test.ts --runInBand
```

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement a pure resolver**

The resolver accepts `CapabilityId`, reads only registry route metadata, and returns a typed `RootDrawerParamList` navigation target. It must not contain a second switch statement that duplicates the registry.

- [ ] **Step 4: Make `PLACE_TABS` a compatibility projection**

During Phase 1, preserve the bottom bar by deriving its Goals, To-dos, and Plan entries from registry metadata. Keep `More` as a temporary compatibility destination until Option G replaces the bottom tabs.

- [ ] **Step 5: Preserve and extend deep links**

Keep all existing deep links passing. `kwilt://chapters` and `kwilt://plan` already exist;
preserve them. Add `kwilt://todos` as an alias for the canonical To-dos root. Keep the
root `ArcsStack` route as a compatibility/deep-link path while capability-menu selection
uses `MainTabs > MoreTab > MoreArcs`.

- [ ] **Step 6: Run navigation tests**

```bash
npx jest src/navigation/capabilityNavigation.test.ts src/navigation/linkingConfig.test.ts --runInBand
npm run lint
```

Expected: PASS with legacy and capability aliases resolving identically.

- [ ] **Step 7: Commit**

```bash
git add src/navigation/capabilityNavigation.ts src/navigation/capabilityNavigation.test.ts src/navigation/placeTabs.ts src/navigation/linkingConfig.ts src/navigation/linkingConfig.test.ts
git commit -m "feat: route capability destinations through host navigation"
```

## Task 4: Add capability lifecycle ownership and telemetry

**Files:**
- Create: `src/capabilities/lifecycle.ts`
- Create: `src/capabilities/lifecycle.test.ts`
- Modify: `src/services/analytics/events.ts`
- Modify: `src/services/analytics/analytics.ts`

- [ ] **Step 1: Write failing lifecycle tests**

Cover initial activation, repeated activation without duplicate work, A-to-B transition ordering, failed activation reporting, and deactivation cleanup.

```ts
expect(events).toEqual([
  'activate:todos',
  'deactivate:todos',
  'activate:plan',
]);
```

- [ ] **Step 2: Verify failure**

```bash
npx jest src/capabilities/lifecycle.test.ts --runInBand
```

Expected: FAIL because the coordinator does not exist.

- [ ] **Step 3: Implement the coordinator**

Implement an idempotent coordinator that owns the active capability ID, awaits deactivation before activation, records duration and errors, and never activates metadata-only or unavailable capabilities.

- [ ] **Step 4: Add typed analytics events**

Add:

- `capability_menu_opened`
- `capability_selected`
- `capability_activated`
- `capability_deactivated`
- `capability_activation_failed`
- `agent_opened_from_capability`
- `agent_returned_to_capability`

Properties include capability ID, group ID, source surface, object type when present, and duration where relevant. Do not log private object titles or chat content.

- [ ] **Step 5: Run focused and analytics tests**

```bash
npx jest src/capabilities/lifecycle.test.ts src/services/analytics --runInBand
npm run lint
npm run lint:tests
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/capabilities src/services/analytics
git commit -m "feat: instrument capability lifecycle"
```

## Task 5: Implement the Option G underlay menu as the single shell

**Files:**
- Create: `src/navigation/CapabilityMenu.tsx`
- Create: `src/navigation/CapabilityMenu.test.tsx`
- Create: `src/navigation/CapabilityShellContext.tsx`
- Modify: `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Write interaction tests**

Test:

- Hamburger accessibility label and 44-point hit target
- Group expansion and collapse
- Current capability indication
- Capability selection and underlay cover behavior
- Avatar opens `SettingsHome`
- Search invokes the existing global search surface
- Chats appears after capabilities
- Chat action opens the durable `UnifiedChat` destination; the hidden `Agent` route remains
  available to existing onboarding, Arc/Goal, and To-do workflow callers
- No close `X` is rendered

- [ ] **Step 2: Verify failure**

```bash
npx jest src/navigation/CapabilityMenu.test.tsx --runInBand
```

Expected: FAIL because the menu and shell context do not exist.

- [ ] **Step 3: Implement the shell context**

Expose:

```ts
type CapabilityShellContextValue = {
  menuOpen: boolean;
  activeCapabilityId: CapabilityId | null;
  openMenu(): void;
  coverMenu(): void;
  navigateToCapability(id: CapabilityId): void;
};
```

Derive active capability from the deepest focused React Navigation route. Do not store a second mutable active-capability value.

- [ ] **Step 4: Implement the menu from the registry**

Match the accepted Option G contract: Inter, white background, pine only in the Kwilt mark, all-caps light group labels, 14px capability labels at reduced weight, icons on capabilities but not folders, grouped expandables before direct capabilities, compact rows, Chats last, avatar at the lower left, and a content-fit Chat button at the lower right.

- [ ] **Step 5: Implement the underlay motion**

Open by translating the foreground surface 80% to the right. Keep React Navigation as the
single router and route registry, but own Option G's presentation in one
`CapabilitySideSheet` with one ephemeral open/close state shared by nested headers. Do not
mount a second router or persist active capability separately. Keep the foreground card white,
fade its contents modestly, keep the hamburger legible, and use the accepted short double
shadow rather than a distant directional shadow. Respect Reduce Motion by replacing the
translation animation with an immediate state change.

- [ ] **Step 6: Make Option G the sole host shell**

Replace the old global shell without keeping a runtime-selectable parallel implementation.
Preserve the existing capability stacks, route names, deep links, and local workflows under
the new shell. The rollback boundary is the prior tagged source/TestFlight build.

- [ ] **Step 7: Run tests and capture visual proof**

```bash
npx jest src/navigation/CapabilityMenu.test.tsx src/navigation/KwiltBottomBar.test.tsx --runInBand
npm run lint
npm run lint:tests
```

Then capture closed, opening, open, group-expanded, and Reduce Motion states on the current iPhone target.

Expected: tests pass and screenshots show the real To-dos surface rather than a replacement mock.

- [ ] **Step 8: Commit**

```bash
git add src/navigation
git commit -m "feat: make Option G the Kwilt capability shell"
```

## Task 6: Preserve navigation state and local workflows

**Files:**
- Modify: `src/navigation/navigationPersistence.ts`
- Modify: `src/navigation/navigationPersistence.test.ts`
- Modify: `src/navigation/RootNavigator.tsx`
- Test: existing Goals, Activities, Plan, Arcs, Chapters, and detail navigation suites

- [ ] **Step 1: Write failing state-migration tests**

Cover restoration of an existing v4 tab state, an Option G capability state, a nested Goal detail, a To-do detail, a Chapter detail, and corrupted/unknown persisted state.

- [ ] **Step 2: Verify failure**

```bash
npx jest src/navigation/navigationPersistence.test.ts --runInBand
```

Expected: at least the new shell-state case fails.

- [ ] **Step 3: Add a versioned migration**

Bump the navigation persistence key only when the new shell changes the serialized root shape. Translate known v4 routes; discard unknown or invalid children and return to the relevant capability root rather than producing an unreachable screen.

- [ ] **Step 4: Verify representative local workflows**

On device, run this matrix with Option G enabled:

| Start | Navigate | Expected return |
|---|---|---|
| Goals inventory | Goal detail | Back to same Goals position |
| To-dos inventory | To-do detail | Back to same filters and position |
| Plan | Recommendation/detail modal | Dismiss to same Plan context |
| Arcs inventory | Arc detail | Back to Arcs |
| Chapters inventory | Chapter detail | Back to Chapters |
| Any inventory | Global menu to another capability | New capability root |
| Any object detail | Global menu and return | Exact object or explicit root, per contract |

- [ ] **Step 5: Run navigation verification**

```bash
npx jest src/navigation --runInBand
npm run verify:changed -- --run
```

Expected: PASS, with manual matrix evidence added to the phase review.

- [ ] **Step 6: Commit**

```bash
git add src/navigation
git commit -m "feat: migrate navigation state for capability shell"
```

## Task 7: Connect Agent context and exact return

**Files:**
- Modify: `src/features/ai/useAgentLauncher.ts`
- Modify: `src/features/ai/workflowRegistry.ts`
- Modify: `src/navigation/RootNavigator.tsx`
- Test: nearest existing Agent launcher and navigation tests

- [ ] **Step 1: Write failing context-envelope tests**

Define and test a serializable envelope:

```ts
type CapabilityAgentContext = {
  capabilityId: CapabilityId;
  surface: 'inventory' | 'detail' | 'session';
  object?: { type: string; id: string };
  returnTarget: CapabilityRouteTarget;
};
```

Test To-dos inventory, individual To-do, Goal detail, and Chapter detail. Ensure titles and private content are not required in navigation persistence.

Treat the two current Agent entry models separately. An in-place contextual Agent sheet
returns by dismissal to its unchanged host screen. Navigation to the first-class root
Agent destination requires the serialized return target and fallback behavior below.

- [ ] **Step 2: Verify failure**

Run the nearest focused Agent tests identified with:

```bash
rg -l "useAgentLauncher|launchContext|workspaceSnapshot" src --glob '*test.ts*'
```

Then run those files with `npx jest ... --runInBand`.

Expected: the new envelope assertions fail.

- [ ] **Step 3: Extend the launcher without breaking current callers**

Accept an optional typed `CapabilityAgentContext`. Preserve current `launchContext`, `workspaceSnapshot`, `resumeDraft`, and prompt-suggestion behavior while the agent architecture is migrated incrementally.

- [ ] **Step 4: Implement exact return**

Returning from Agent restores the serialized route target and object ID. If the object no longer exists or access was revoked, navigate to the capability root and show the existing toast pattern.

- [ ] **Step 5: Verify on inventory and detail screens**

Demonstrate:

1. To-dos inventory → Agent → same To-dos inventory state.
2. Individual To-do → Agent → same To-do.
3. Chapter detail → Agent → same Chapter.
4. Deleted object → Agent return → capability root with explanation.

- [ ] **Step 6: Run tests and commit**

```bash
npm run verify:changed -- --run
git add src/features/ai src/navigation
git commit -m "feat: preserve capability context through Agent"
```

## Task 8: Add startup telemetry and enforce zero work before entry

**Files:**
- Create: `src/services/performance/startupTelemetry.ts`
- Create: `src/services/performance/startupTelemetry.test.ts`
- Modify: `App.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `docs/testing/unified-shell-baseline.md`

- [ ] **Step 1: Write failing telemetry tests**

Test once-only app-start marking, first-usable-surface duration, restored-route property, shell variant, and ignored duplicate completion calls.

- [ ] **Step 2: Verify failure**

```bash
npx jest src/services/performance/startupTelemetry.test.ts --runInBand
```

Expected: FAIL because telemetry does not exist.

- [ ] **Step 3: Implement startup telemetry**

Use monotonic timing, emit no private content, and expose:

```ts
markAppStarted();
markRootNavigationReady();
markFirstSurfaceUsable({ capabilityId, restored, shellVariant });
```

The module must not import capability services.

- [ ] **Step 4: Instrument current startup**

Start timing at the earliest safe `App.tsx` point, mark navigation readiness from `NavigationContainer.onReady`, and mark the first usable surface from the relevant inventory after its essential local state is ready.

- [ ] **Step 5: Add the zero-work audit**

With the app cold-launched into To-dos and Option G enabled, verify logs/network instrumentation show no Money or Games work after those capabilities are later registered in future phases. For Phase 1, record the current baseline of capability-owned startup services so subsequent import plans have an explicit comparison.

- [ ] **Step 6: Run verification**

```bash
npx jest src/services/performance/startupTelemetry.test.ts --runInBand
npm run verify:changed -- --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add App.tsx src/navigation/RootNavigator.tsx src/services/performance docs/testing/unified-shell-baseline.md
git commit -m "feat: measure unified shell startup"
```

## Task 9: Phase 1 acceptance and production decision

**Files:**
- Modify: `docs/testing/unified-shell-baseline.md`
- Modify: `docs/architecture/unified-kwilt-capability-platform.md` only if observed evidence changes the contract

- [ ] **Step 1: Run automated verification**

```bash
npm run verify:changed -- --run
npm run architecture:lint
npm run product:lint
```

Expected: PASS.

- [ ] **Step 2: Produce a release archive with Option G enabled**

Generate a new App Thinning Size Report using the same configuration and devices as Task 1.

- [ ] **Step 3: Compare performance with the baseline**

Record compressed/installed size, cold and warm launch p50/p90, time to usable surface, idle memory, startup requests, and embedded frameworks.

Acceptance:

- Launch regression is at or below 10% at p50 and p90.
- No unexpected startup requests or subscriptions appear.
- Idle-memory change is explained and accepted.
- Navigation and agent-return matrices pass.
- Existing deep links pass.
- Option G passes physical-device visual review.

- [ ] **Step 4: Decide TestFlight promotion or rollback**

If all acceptance criteria pass, promote the Option G build to the next internal/TestFlight
cohort. If any criterion fails, return testers to the retained prior build or cut a
replacement from the last accepted source tag, then create a focused repair plan.

- [ ] **Step 5: Commit the acceptance record**

```bash
git add docs/testing/unified-shell-baseline.md docs/architecture/unified-kwilt-capability-platform.md
git commit -m "docs: record unified shell phase one acceptance"
```

## Phase 1 completion gate

Do not begin the Games import until:

- The registry is the sole source of capability navigation metadata.
- Existing Goals, To-dos, Plan, Arcs, and Chapters workflows remain intact.
- Option G works on a physical iPhone and the prior build can be reinstalled or rebuilt from
  its recorded source tag.
- Global settings and local ellipsis ownership follow the accepted contract.
- Agent entry and exact return work from inventory and object detail.
- The shell Chat action opens durable Unified Chat, and Unified Chat can reopen the shell menu
  without replacing its separate thread picker.
- App size, launch, memory, and startup-work evidence meet the recorded gates.
- `npm run verify:changed -- --run` passes on the final Phase 1 diff.

After this gate, create a separate `Games vertical slice import` plan. That plan must add native dependencies and capability code one bounded integration at a time and archive after each native addition.
