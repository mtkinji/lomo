# Unified Shell Phase 0 Baseline

**Status:** Partial evidence; Phase 0 acceptance is blocked

**Recorded:** 2026-07-21

This document records the pre-capability-shell baseline for the accepted unified Kwilt
program. It deliberately separates current-source evidence, historical release evidence,
and blocked acceptance fields. A simulator, debug build, raw IPA size, or historical
TestFlight artifact does not substitute for an App Thinning report or physical-device
launch evidence.

## Source snapshot and release configuration

| Field | Recorded value |
|---|---|
| Evidence source commit | `bf6040d414ec87ebc80f51efb52671acc61011db` |
| Runtime parent | `8c2fb015c44c30a10206ad23f180e1836138fcdc` |
| Branch | `codex/unified-kwilt-shell-phase-0` |
| Build profile | `production-widgets` |
| Environment | `production` |
| Expo app name | Kwilt |
| Bundle identifier | `com.andrewwatanabe.kwilt` |
| App version / build | 1.0.89 / 89 |
| Device families | iPhone and iPad (`supportsTablet: true`) |
| Host entitlements | Family Controls; `group.com.andrewwatanabe.kwilt` app group |
| Xcode available | 26.6 (17F113) |

The evidence-source commit adds only governing documentation; its runtime is the same as
the recorded runtime parent. The production profile enables App Groups, Screen Time, and
widgets and uses remote credentials for a store-distribution build.

### Resolved iOS extensions

| Target | Bundle identifier | Resolved version / build | Deployment target |
|---|---|---:|---:|
| Kwilt | `com.andrewwatanabe.kwilt` | 1.0.89 / 89 in resolved Expo/EAS metadata | iOS 15.1 |
| KwiltWidgets | `com.andrewwatanabe.kwilt.widgets` | 1.0.89 / 89 | iOS 17.0 |
| KwiltShieldConfiguration | `com.andrewwatanabe.kwilt.shield-configuration` | 1.0.89 / 89 | iOS 16.0 |
| KwiltShieldAction | `com.andrewwatanabe.kwilt.shield-action` | 1.0.89 / 89 | iOS 16.0 |

A clean disposable Expo prebuild produced all four targets. Its generated host target
contained Family Controls, App Group, Associated Domains, HealthKit, background-mode, and
development push entitlements. The widget extension contained the shared App Group. The
two shield extensions had empty generated entitlement files, consistent with their current
signing shape.

Bare `expo prebuild` generated `MARKETING_VERSION = 1.0` and
`CURRENT_PROJECT_VERSION = 1` for the main target even though the resolved Expo metadata
was 1.0.89 (89); the extension targets received 1.0.89 (89). Therefore the bare generated
project is not accepted as production-equivalent version evidence. EAS build preparation
did resolve the main app as 1.0.89 (89), but the local archive did not reach Xcode because
the available environment has no `fastlane` executable (`spawn fastlane ENOENT`).

## Current-source production export

The iOS export was produced from the evidence-source commit with the exact
`production-widgets` environment switches for production, App Groups, Screen Time, and
widgets.

| Field | Recorded value |
|---|---:|
| Metro modules | 3,448 |
| Export files | 197 |
| Exported assets | 195 files; 106,479,193 bytes |
| Hermes bytecode | 11,676,662 bytes |
| Total exported file bytes | 118,168,722 bytes |
| Filesystem allocation reported by `du` | 115,812 KiB |
| Hermes SHA-256 | `4b8c699c39f4c0c0110fa0560b917e0aef2b7b288ff75d0d06d32ecdd80ba4d5` |
| Export metadata SHA-256 | `6e147a1155ed5a4bd9366d980eb3fe1a2609aa50b9195c483a1d82556f0efa4f` |

The generated Hermes file was
`index-837c03e1f8e7cfdee7bae1780e78bdfd.hbc`. The largest exported asset was
7,768,853 bytes; the next three were approximately 5.78 MB each. Export output identified
these as bundled soundscapes. Large auth wallpapers and Arc banners were also present, as
were the complete bundled Inter and Urbanist font families. These are bundle-cost leads,
not Phase 0 optimization work.

## Historical production-widgets reference

This is a read-only reference for the most recent completed EAS build. It predates the
evidence-source commit and must not be used to satisfy current-source acceptance fields.

| Field | Historical value |
|---|---|
| EAS build ID | `ab5c5383-6633-4f71-a4c9-4ebdb2a65e0b` |
| Status / distribution | Finished / store |
| Source commit | `2dac8fe587ba90fe54b9fc84cf47268100b95a0e` |
| Version / build | 1.0.89 / 89 |
| Created / completed | 2026-07-13 15:21:49Z / 15:29:58Z |
| EAS fingerprint | `e3ec68017b006403709644e186b3bc43a5f15aed` |
| IPA bytes | 124,472,444 |
| IPA SHA-256 | `3c989ad6def4d1d3ea887591e53149d6a9e47b383616ee9ed96ea59b0afbd1cd` |
| Uncompressed `.app` allocation | 148,120 KiB |
| Embedded frameworks | React 11,116 KiB; Hermes 4,656 KiB; ReactNativeDependencies 1,292 KiB |
| Embedded extensions | Widgets 340 KiB; Shield Configuration 136 KiB; Shield Action 112 KiB |

The IPA's `Info.plist` resolves to `com.andrewwatanabe.kwilt`, version 1.0.89,
build 89. Raw IPA and extracted-app sizes are packaging observations, not App Store
compressed-download or per-device installed-size estimates.

## Physical-device and App Thinning acceptance evidence

The only physical iPhone visible to Xcode was `Andy’s iPhone 16`, iOS 26.5.2, and it was
offline. No accepted physical comparison device was therefore available.

| Acceptance field | Result |
|---|---|
| Current-source signed archive identifier | **BLOCKED** — local EAS archive stopped before Xcode because `fastlane` is unavailable |
| App Thinning compressed size | **BLOCKED** — no current-source signed archive or App Thinning Size Report |
| App Thinning installed size | **BLOCKED** — no current-source signed archive or App Thinning Size Report |
| Device and iOS version | **BLOCKED** — candidate iPhone 16 / iOS 26.5.2 is offline |
| Signed-in account and restored route | **BLOCKED** — requires the accepted physical device |
| First-of-day cold launch, 10 runs, p50 / p90 | **BLOCKED** — requires the accepted physical device |
| Repeat cold launch, 10 runs, p50 / p90 | **BLOCKED** — requires the accepted physical device |
| Warm launch, 10 runs, p50 / p90 | **BLOCKED** — requires the accepted physical device |
| Time to usable To-dos, 10 runs, p50 / p90 | **BLOCKED** — requires the accepted physical device |
| Idle and peak memory on To-dos | **BLOCKED** — requires Instruments on the accepted physical device |
| Observed startup requests | **BLOCKED** — requires the production-equivalent build on the accepted physical device |
| Observed realtime subscriptions | **BLOCKED** — requires the production-equivalent build on the accepted physical device |

When the device is available, measure a signed-in account that can restore directly to
To-dos. Record at least ten cold and ten warm runs. Keep the full first-of-day launch-screen
cohort separate from repeat launches, and define `usable To-dos` as the list accepting user
input with restored data rendered or an explicit empty state. Do not place simulator or
debug measurements in this table.

## Static startup-owner inventory

This inventory comes from static inspection of `App.tsx`, `RootNavigator.tsx`, and the
services they start. It does not claim that a network request or realtime subscription was
observed. The later zero-work-before-entry comparison must pair this inventory with the
blocked physical-device observations above.

| Startup owner | Current classification | Current behavior / boundary question |
|---|---|---|
| Supabase auth session | Global | Auth-state listener and session restore are required before app routing. |
| Root navigation, persistence, and incoming links | Global | Required to restore the user's route and dispatch global entry points. |
| PostHog client, identity, and remote flags | Global | Analytics and shell rollout are global; startup cost still requires measurement. |
| RevenueCat identity and entitlement sync | Global | One customer and entitlement owner for the unified app. |
| Push-token registration and notification routing | Global | One app-level owner; capability notification policy must remain declarative. |
| Notification initialization, background reconciliation, and launch reconciliation | Unresolved | Globally hosted but schedules capability-specific nudges; split policy from infrastructure before enforcing zero-work gates. |
| Haptics initialization and preference binding | Global | Small shared native service; no capability ownership expected. |
| Location offers | Current-capability work | Starts from `App.tsx`; must move behind the owning capability or an explicit global contract. |
| Health daily background sync | Current-capability work | Registered globally even though the work is domain-specific. |
| Widget, Shortcut, and Live Activity glanceable-state sync | Current-capability work | Starts globally and publishes domain state. |
| Spotlight activity indexing | Current-capability work | Activities/To-dos indexing starts before capability entry. |
| Arc, Goal, and Activity domain sync | Current-capability work | Crosses three current domains and starts whenever authenticated. |
| Streak sync | Current-capability work | Starts globally but belongs to current coaching/progress behavior. |
| Partner-progress service | Current-capability work | Foreground checks for shared-goal progress start globally. |
| Screen Time foreground sync | Unresolved | Hosted globally today; the target taxonomy makes Screen Time a distinct capability. |
| `FocusSessionRuntimeHost` | Current-capability work | Mounted above the navigator on every authenticated surface. |
| Monthly referral bonus-credit sync | Unresolved | Started by root navigation; ownership and necessity before capability entry need proof. |

## Phase 0 gate

The documentation contract, release-profile resolution, current-source production export,
clean native generation, historical artifact inspection, and static startup-owner inventory
are recorded. Phase 0 is **not accepted** because two non-substitutable evidence lanes remain
blocked:

1. A current-source signed `production-widgets` archive and its App Thinning Size Report.
2. The specified physical-device cold/warm launch, usable To-dos, memory, request, and
   subscription measurements.

Task 2 of the Phase 1 implementation plan must not begin until Andrew reviews this partial
baseline and explicitly authorizes continuing despite or after resolving those blocks.

## Phase 1 implementation evidence

**Recorded:** 2026-07-21

Andrew authorized Phase 1 with the recorded rollback tag and retained TestFlight build as
the recovery boundary. The following evidence is development evidence only and does not
replace the blocked production-widgets archive or physical-iPhone acceptance fields above.

| Evidence | Result |
|---|---|
| Fresh iOS development build | PASS — Xcode 26.6 built and installed Kwilt on the iPhone 17 Pro / iOS 26.4 simulator with zero build errors (four existing native warnings). |
| Real signed-in To-dos surface | PASS — restored Supabase session and domain data rendered under the Option G shell; the former bottom navigation was absent. |
| Option G interaction | PASS — menu open, group collapse/expand, selected capability, Plan navigation, and foreground cover behavior were exercised on the real app surface. |
| Reduce Motion development proof | PASS — simulator preference returned `1`, Reanimated reported reduced motion enabled, and the patched drawer used `ReduceMotion.System`. |
| First-class Chat return | PASS — Plan → Chat → Return restored Plan; pure tests cover To-do, Goal, and Chapter detail envelopes plus deleted-object fallback. |
| Automated verification | PASS — final diff-aware verification ran 151 suites / 1,119 tests; application and test typechecks, code-health ratchet, generated agent map, and architecture lint passed. Product lint also passed with no errors. |
| Physical iPhone visual review | **BLOCKED** — the required device evidence remains unavailable and has not been replaced by simulator proof. |

### Zero-work-before-entry checkpoint

Phase 1 registers only the five current Kwilt capabilities: Goals, To-dos, Plan, Arcs, and
Chapters. There are no Money or Games capability definitions, imports, native dependencies,
startup services, network clients, subscriptions, or lifecycle hooks in this branch.
Therefore the truthful Phase 1 result is **zero Money work and zero Games work because
neither capability is present yet**. This is the comparison point for the later vertical
slice imports; each imported capability must remain inert until activation.

The current-source startup-owner inventory above remains accurate. Phase 1 adds only host
navigation restoration, safe capability lifecycle events, and once-only monotonic timing
from app start to root readiness and first usable To-dos. It does not reclassify the
existing global services or claim that their physical-device request, subscription, memory,
or timing behavior has been measured.

## Phase 1 acceptance decision

**Decision recorded:** 2026-07-21

Phase 1 implementation is complete on `codex/unified-kwilt-shell-phase-1`, but Phase 1 is
**not accepted for TestFlight promotion**. A final device inventory still reports
`Andy’s iPhone 16` / iOS 26.5.2 as offline and unavailable. The current environment also
still lacks the current-source signed `production-widgets` archive and matching App
Thinning Size Report required for a like-for-like comparison with the retained baseline.

The following acceptance fields therefore remain blocked and have not been inferred from
the development build:

- current-source compressed and installed App Thinning size;
- physical-device cold and warm launch p50/p90 and usable-To-dos timing;
- physical-device idle and peak memory;
- production-equivalent startup requests and realtime subscriptions;
- the complete physical-device navigation, deep-link, Agent-return, Reduce Motion, and
  visual review matrices.

No Phase 1 TestFlight build was promoted. The retained 1.0.89 (89) build and annotated
`kwilt-pre-unified-capabilities-2026-07-21` source tag remain the rollback boundaries.
When the iPhone is online, resume at the evidence ladder's release-archive and
physical-device steps; promote only if every recorded regression gate passes. Games and
Money import work remains out of scope until this Phase 1 acceptance gate is satisfied.
