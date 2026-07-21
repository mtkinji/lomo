# Unified Kwilt Capability Platform

**Status:** Accepted program direction

**Date:** 2026-07-21

**Implementation host:** `/Users/andrewwatanabe/Kwilt`

**Source applications:** Kwilt, Kwilt Money, and Kwilt Games

This decision supersedes any earlier repository guidance that presents `Kwilt Goals`,
Kwilt Money, or Kwilt Games as separate public products. Capability surfaces may keep
distinctive visual languages, but users encounter one public application named **Kwilt**.

## Decision

Kwilt will become one public mobile application whose primary product identity is **Kwilt**. Goals, To-dos, Plan, Arcs, Chapters, Money, Games, Stories, Recipes, Screen Time, and future domains are capabilities inside Kwilt rather than separate products users must understand.

The current Kwilt repository is the implementation host because it is the most mature application and contains the broadest production surface. That is an engineering choice, not a public information hierarchy: the resulting product must not present `Kwilt Goals` as a parent between Kwilt and its capabilities.

The implementation will be a **modular monolith**: one native binary and release train, with explicit capability boundaries inside the codebase. It will not be a bulk source-tree merge, a WebView mini-app system, or a collection of standalone app shells connected by deep links.

## Why now

The consolidation happens before Kwilt Money or Kwilt Games has launched publicly. They are TestFlight products only, and testers already use the shared Supabase identity. Users also do not know the current public app as `Kwilt Goals`; they know it as Kwilt.

This removes most external migration risk:

- No public Money or Games installed base must be redirected.
- No public product-merger or rebrand story is required.
- No new account-linking experience is required.
- No separate App Store listings or release promises must be maintained.
- Existing TestFlight records can remain attached to the same user identity.

The work is therefore an architectural consolidation and data-ownership project, not primarily an account or customer migration project.

## Product contract

### Public hierarchy

```text
Kwilt
├── Agent
├── Goals
├── To-dos
├── Plan
├── Arcs
├── Chapters
├── Money
│   ├── Summary
│   ├── Transactions
│   └── Accounts
├── Games
├── Stories & Memories
├── Home & Meals
└── Screen Time
```

Group labels organize comprehension and expansion in the global menu; they are not extra product destinations unless they have a durable user job of their own.

### Navigation baseline

Option G is the accepted global-navigation baseline:

- A familiar two-line hamburger opens an 80% underlay menu.
- The current capability surface moves aside rather than being replaced by a modal catalog.
- Group labels recede; capability labels carry the primary scan weight.
- Related capabilities remain visibly grouped.
- Chats appear last, near the persistent avatar and compact Chat action.
- Global settings open from the avatar.
- Current-surface actions and contextual settings open from a title-adjacent ellipsis.
- Capability-specific settings exist only when a capability owns genuinely distinct configuration.

The shell must preserve a capability's local interaction contract and distinctive visual language. Kwilt Games can remain playful and immersive; Money can remain information-dense and trustworthy; Goals can retain its existing inventory and detail workflows.

The Phase 1 shell keeps React Navigation as the single root router and route registry, while
an owned `CapabilitySideSheet` presents Option G's underlay and foreground motion. One
ephemeral shell-state owner coordinates the menu across nested headers; active capability
still derives from navigation state and is never persisted separately. The shell reuses the
global-search store action, shared `PageHeader`, and settings route. It must not introduce a
second router, duplicate global-search/settings implementations, or a permanent second shell
path. TestFlight and source-control build boundaries provide reversibility rather than runtime
feature flags.

### Agent contract

The agent is a first-class Kwilt destination, not a utility bolted onto every page. Capabilities expose structured context and actions to the agent through contracts. Contextual agent entry can return users to the exact capability, object, and scroll state from which chat was invoked.

## Technical architecture

### Target source structure

```text
src/
├── shell/
│   ├── account/
│   ├── household/
│   ├── agent/
│   ├── navigation/
│   └── settings/
├── capabilities/
│   ├── goals/
│   ├── todos/
│   ├── plan/
│   ├── arcs/
│   ├── chapters/
│   ├── money/
│   └── games/
├── platform/
│   ├── analytics/
│   ├── auth/
│   ├── entitlements/
│   ├── notifications/
│   ├── permissions/
│   └── persistence/
└── ui/
```

Existing feature directories do not need to move immediately. The capability registry and adapters establish the boundary first; physical moves happen only when they reduce coupling and can be verified independently.

### Capability contract

Each capability registers one durable definition:

```ts
export type CapabilityDefinition = {
  id: CapabilityId;
  label: string;
  group: CapabilityGroupId | null;
  icon: IconName;
  availability: 'active' | 'preview' | 'hidden';
  rootRoute: CapabilityRouteTarget;
  deepLinks: readonly string[];
  settings?: readonly CapabilitySettingsDestination[];
  permissions?: readonly CapabilityPermission[];
  agent: CapabilityAgentContract;
  lifecycle: CapabilityLifecycleContract;
};
```

The contract owns navigation metadata, agent context, lifecycle boundaries, permission declarations, settings contribution, and analytics identity. Screen components continue to own their internal navigation and visual treatment.

### Single-owner infrastructure

The unified app must have exactly one owner for each global concern:

- Supabase session and auth storage
- User and household identity
- Analytics and crash reporting
- RevenueCat customer and entitlement state
- Push-token registration and notification routing
- Deep-link namespace
- Account deletion and data export
- Global settings registry
- Root navigation persistence

Imported applications surrender their standalone app providers, auth roots, global settings homes, root routers, and duplicate analytics or entitlement clients.

### Supabase

The apps already share Supabase identity. No account migration or identity-linking UI is planned.

The remaining data-plane work is to verify and consolidate:

- Consistent user UUID and household membership on all records
- Schema and naming ownership by capability
- RLS behavior under the single client session
- Realtime subscription startup and teardown
- Edge Function authentication and routing
- Storage-bucket permissions
- Duplicate profile, household, entitlement, or preference rows
- Account deletion and export coverage across every capability

Existing TestFlight Money and Games data must appear in unified Kwilt under the same account without duplication or reset.

### Navigation

Kwilt retains React Navigation as the host architecture during consolidation. Money and Games currently use Expo Router, but their route trees will be translated into capability stacks rather than importing two additional application roots.

The canonical navigation layers are:

1. Global Kwilt destinations and capability switching
2. Capability-local inventory and workflow navigation
3. Object-detail navigation
4. Modal/drawer presentation over the current local stack
5. Contextual transition to Agent and exact return

An imported capability must preserve its established user workflow before the shared shell is judged successful. Global navigation must not silently replace useful local navigation.

### Lifecycle and startup

Registration is eager; capability work is not.

Agent Home may initialize only the services required for:

- Authentication and household context
- Root navigation restoration
- Global navigation metadata
- Agent timeline
- Essential analytics and crash reporting

An unopened capability must not start queries, subscriptions, sensors, orientation listeners, audio, chart engines, Plaid, or capability-specific synchronization. Native dependencies still require release-build measurement because linked third-party frameworks can affect iOS launch before JavaScript runs.

Capabilities implement explicit lifecycle hooks:

```ts
export type CapabilityLifecycleContract = {
  preload?: () => Promise<void>;
  activate?: () => Promise<void>;
  deactivate?: () => Promise<void>;
};
```

`preload` is optional and bounded. `activate` is idempotent. `deactivate` releases large images, audio, subscriptions, sensors, and temporary caches when appropriate.

## Current size evidence

Production Expo exports on 2026-07-21 provided comparative—not App Store—measurements:

| Application | Hermes bytecode | Exported assets |
|---|---:|---:|
| Current Kwilt | 11.7 MB | 106.5 MB |
| Kwilt Money | 10.3 MB | 52.8 MB |
| Kwilt Games | 6.9 MB | 8.0 MB |

The naive asset sum was approximately 167.3 MB. The content-hash-deduplicated union was approximately 114.2 MB, only about 7.7 MB above current Kwilt. Money duplicates many Kwilt wallpapers, fonts, and icon resources; standalone framework and JavaScript sizes are also not additive.

These numbers do not predict App Store download or installed size. Every phase must produce an Xcode App Thinning Size Report and compare it with the accepted production baseline.

### Immediate size work

Before importing a complete capability:

- Bundle only used Inter and Urbanist weights.
- Complete the Lucide migration so full icon-font families can be removed where safe.
- Resize and compress auth wallpapers and Arc banners.
- Make large soundscapes optional or downloadable if the experience permits it.
- Import only referenced Money and Games assets.
- Deduplicate shared assets by ownership, not by copying identical files into capability folders.

### Native integration risks

Money introduces the highest native and release risk:

- Plaid Link SDK
- Skia and chart rendering
- Local authentication
- Screen Time native modules, extensions, and entitlements
- Background work and secure storage

Games introduces smaller but still explicit lifecycle concerns:

- Audio
- Screen orientation
- Sensors
- QR-code and shared-session flows

The current Kwilt app already owns substantial native surface area, including RevenueCat, notifications, location, calendar, HealthKit, maps, and Apple ecosystem integrations. Native dependency additions therefore require archive-level size, launch, privacy-manifest, and entitlement verification.

## Program phases

### Phase 0 — Establish truthful baselines

Produce a release archive of current Kwilt from the same immutable commit and
`production-widgets` environment used for every measurement. The checked-in native
workspace may be stale relative to dynamic Expo configuration, so archive from a clean,
disposable prebuild rather than silently measuring an out-of-date Xcode project. Capture:

- App Store compressed download estimate
- Per-device installed size
- Hermes bytecode and asset payload
- Cold and warm launch distributions
- Time to usable first surface
- Idle and peak memory
- Startup network requests and subscriptions
- Embedded native frameworks and extensions

Use a signed-in account restored to To-dos as the Phase 0 and Phase 1 first-usable
surface. Record first-of-day/full-launch-screen and repeat-launch behavior separately;
do not mix launch-screen cadences in one distribution. Use at least ten cold and ten warm
runs on the same physical device. If the required physical device is unavailable, mark
those fields `BLOCKED — physical device unavailable`; simulator, debug, `.ipa`, or
`.xcarchive` observations do not satisfy the physical-device or App Thinning gates.

Store the measurements as versioned evidence. Debug `.app`, `.xcarchive`, and upload `.ipa` sizes are not acceptance evidence.

### Phase 1 — Turn current Kwilt into the capability host

Without importing Money or Games:

- Introduce the capability registry and route adapters.
- Register Goals, To-dos, Plan, Arcs, and Chapters.
- Implement Option G as the single host shell; do not retain a runtime-selectable legacy shell.
- Preserve current stacks and deep links.
- Establish global/avatar settings and contextual ellipsis ownership.
- Add capability lifecycle telemetry.
- Prove Agent entry and exact return from at least an inventory and object-detail page.

The accepted result is behaviorally equivalent current Kwilt running through the new shell contract.

### Phase 2 — Import one complete Games vertical slice

Games is first because it is smaller, has fewer backend dependencies, and provides the strongest test that an imported capability can keep a distinctive immersive experience.

Import one complete flow:

- Games inventory
- Lobby/setup
- One full game, including nested navigation
- Audio/orientation lifecycle
- Contextual agent entry and return
- Global menu switching at inventory depth and immersive-mode escape at game depth

Do not import the complete game catalog until this slice passes startup, size, memory, navigation, and device-play proof.

### Phase 3 — Import Money read-only

Import Summary, Transactions, Accounts, and category detail using the shared Supabase session. Keep writes and connection mutation out of this phase.

Plaid, charts, Money queries, privacy gates, and subscriptions activate only after Money entry. Validate cross-capability links such as creating or opening a Goal from Money without copying Goal behavior into Money.

### Phase 4 — Reconcile settings and data ownership

Apply the accepted settings architecture:

- Global settings for shared domains
- Contextual settings links from current surfaces
- Object settings for categories, games, goals, and other concrete objects
- Session controls for active game or temporary workflows

Unify deletion/export, RLS, notification preferences, entitlement state, and household behavior across imported capabilities.

### Phase 5 — Enable Money writes and specialized native behavior

Add and verify:

- Plaid linking and relinking
- Budget/category mutations
- Forecasting and transaction review
- Privacy lock
- Screen Time controls and extension targets
- Subscription and entitlement behavior

Every mutation path must preserve source list, destination list, totals, detail, activity, and back-navigation truth from one rebuilt snapshot.

### Phase 6 — Retire standalone TestFlight applications

- Invite current testers to unified Kwilt.
- Verify their existing Money and Games data appears under the same account.
- Run parity checklists against standalone builds.
- Stop distributing standalone Money and Games builds after unified parity.
- Release only Kwilt publicly.

## Reversibility and TestFlight promotion contract

Reversibility is a release requirement for every phase, not an emergency procedure added
after integration. The pre-unification runtime is anchored at
`8c2fb015c44c30a10206ad23f180e1836138fcdc` and the Phase 0 evidence remains isolated on
`codex/unified-kwilt-shell-phase-0`. Unified implementation proceeds on a separate branch.

Every phase must preserve three rollback layers:

1. **TestFlight rollback.** Keep the last accepted build assigned to the internal tester
   group and do not expire or remove it while it remains inside TestFlight's 90-day testing
   window. Record its version, build number, build ID, source commit, and expiration date.
   If that build has expired, cut a new higher build number from its immutable source tag.
2. **Source rollback.** The pre-unification runtime and every accepted phase boundary remain
   addressable by annotated tag and immutable commit. A rollback branch and replacement
   build can be created from the last accepted boundary without reverting a chain of feature
   commits. Standalone Money and Games source and TestFlight lanes remain available until
   unified parity is accepted.
3. **Data rollback.** Consolidation migrations are additive and backward-readable. No phase
   may drop, rename in place, or destructively rewrite standalone Money or Games data. New
   writes use dual-readable schemas or compatibility views until both the unified and prior
   clients can read the affected records. Destructive cleanup requires a later, separately
   approved retirement plan and verified backup/restore path.

Promotion follows a one-way evidence ladder: local tests, current-source release archive,
physical-device proof, internal TestFlight cohort, then broader TestFlight. A failed gate
returns testers to the prior eligible build or ships a replacement from the last accepted
source tag; it does not weaken the gate. Money and Games are imported as independently
revertible vertical slices, never as one inseparable merge.

## Performance and release gates

Initial gates are regression-based and are finalized from the Phase 0 baseline:

- Time to usable To-dos must not regress more than 10% at p50 or p90 during Phase 1.
- If Agent later becomes a startup destination, establish a separate Agent Home baseline before applying a regression gate to it.
- An unvisited capability must produce no network query, realtime subscription, sensor, audio, orientation, Plaid, or chart initialization.
- Investigate any pre-entry idle-memory increase above 10–15 MB.
- Every imported capability produces a new App Thinning Size Report.
- Capability exit tears down owned foreground listeners and large transient resources.
- Permissions are requested at the moment a capability needs them, not in global onboarding.
- No capability adds a second global auth, settings, analytics, entitlement, or notification owner.
- Existing deep links and restored navigation states either migrate deterministically or fail safely to a known root.
- Each phase passes `npm run verify:changed -- --run`, targeted Jest suites, release archive validation, and physical-device visual/interaction proof.

## Explicit non-goals

- Runtime-downloaded JavaScript mini-apps
- WebView versions of native Money or Games experiences
- A public `Kwilt Goals` product layer
- Importing standalone app shells wholesale
- Requesting every capability permission during onboarding
- Launching Money and Games publicly before consolidation
- Rewriting all existing Kwilt feature folders before the registry proves its value

## Primary risks and mitigations

| Risk | Mitigation |
|---|---|
| App feels slower although size is acceptable | Lifecycle contracts, zero-work-before-entry gate, launch telemetry |
| Native frameworks increase launch or archive size | One native dependency at a time; archive after each addition |
| Global shell displaces useful local navigation | Preserve capability stacks and test real inventory/detail workflows |
| Settings duplicate across capabilities | One domain registry with contextual deep links |
| Shared identity hides data-ownership inconsistencies | RLS/schema/data inventory before enabling writes |
| One release train increases blast radius | Immutable phase tags, retained TestFlight builds, bounded vertical slices |
| Asset payload remains needlessly large | Asset ownership, font/icon pruning, compression, on-demand media |
| Agent and capability navigation become separate worlds | Context envelope plus exact return route in every capability contract |

## Success definition

The program succeeds when a user experiences one coherent Kwilt app, can move directly among capabilities and the agent, retains the native feeling of Goals, Money, and Games, and does not pay a meaningful startup or storage penalty for capabilities they have not opened.
