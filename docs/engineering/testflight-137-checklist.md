# Kwilt 2.0.2 (137) — internal beta checklist

Prepared November 16, 2026. Intended distribution: existing internal TestFlight
testers, through the protected testflight-widgets profile. No public release.

## Included work

- Budget category identity saves, amount input and rollover alignment (PR205).
- Persistent grocery checks/undo, meal-plan recipe inspection, aisle classification,
  and explicit grocery compiler recipe-parent joins (PR206).
- Dinner catalog source and migration replay/grant repair (PR197), merged after CI.
  All 200 added dinners are already hosted; this release does not republish them.
- Bounded Markdown/navigation/Storybook/Vite security refresh (PR207), preserving
  native library versions and the Reduce Motion patch.

## Required release evidence

- [x] Budget release backend read-only preflight passed, Actions 43893946732.
- [x] Budget and grocery PRs merged after review and CI.
- [x] Dinner/grants follow-up: 270 migration replay, 25 SQL cases and dedicated
  Money/concurrency harness passed; local uncached integration passed.
- [x] Security cohort: Node 22.23.2 clean install, all 3 native patches,
  red/green parser and Games regressions, 102 navigation assertions, Storybook
  build and local 1322-suite/8341-test completion checks passed.
- [x] Dinner/security candidate merged; PR CI 43897271770 and main CI
  43899076270 passed, including coverage. Whole build-136 range passed locally:
  1324 suites / 8430 tests.
- [x] Renew Apple distribution certificate and all 5 app/extension profiles.
  Certificate 8CDLTB3ST2 and profiles HK579QNWUU, N7Q6CVGXCN, G86PMT8PYB,
  BHCC2KUQ6A, 6TBK6R25M7 are ACTIVE through November 16, 2027. Apple API
  readback confirmed all five use the new certificate; expiry monitor updated.
- [x] Microsoft Calendar secret verified in the owning Azure tenant under
  andy@kwilt.app: expires January 19, 2028. Client ID digest matched production.
  No rotation needed; monitor now records the date conservatively at 00:00 UTC
  because the provider UI exposes a date, not an exact timestamp.
- [ ] Run protected release command on clean current origin/main, with
  KWILT_VERIFY_BASE=984d13ffea2f09f477cefd8d7eb25578953076b4 to cover all work
  since build 136. It runs uncached changed checks, full coverage and backend
  preflight before EAS build/auto-submit.
- [ ] Record final commit, EAS build/submission IDs and Apple processing state.
- [ ] Verify build 137 is available to intended internal testers.

## Phone acceptance / known limits

No source checkout has launched a runtime during this release task. Existing booted simulators are
not proof of this candidate. Phone testing remains necessary:

- Rapid grocery checks, undo during save, refresh, reopen and cross-screen sync.
- Open recipe from meal plan, return with list position preserved.
- Save category, rollover and budget amount; confirm retained values.
- Open external links and verify calendar/OAuth/Plaid returns.
- Chat Markdown rendering and reduced-motion navigation.
- Screen Time button contrast and unlock-guide presentation on a real device.

The old catalog backend crash did not recur in current PG17.6 ARM replay, but
JIT-enabled behavior was not exercised. The dependency audit still has 39 findings
(1 critical through development tooling); see the bounded refresh record.

Recovery: use existing build 136 for testing until 137 is available; revert the
relevant bounded change and issue a higher-numbered forward-fix build if needed.
Do not revoke the old Apple certificate until replacement profiles and a signed
build are verified. Application database migrations are not part of this checklist; credential-expiry
monitor metadata was updated after provider verification.

## Release workflow recovery

Run 43907905237 passed changed checks, 1324-suite coverage and the 61-check
hosted backend contract, then correctly stopped because verification regenerated
stale code-map line counts. The generated map is refreshed in this follow-up;
the clean-checkout gate remains intact. No build was uploaded by that attempt.

Run 43910172256 reached credential validation after all release gates passed.
CI Expo authentication is now configured with Kwilt build permissions and personal
account read access required by the EAS identity query. Its third attempt exposed
missing entitlements in the EAS extension declarations: EAS interpreted them as
empty and tried to disable App Groups. The declarations now match generated native
entitlements (App Groups on all four extensions, Family Controls on the three
Screen Time extensions). A regression test reproduces the omission and passes for
all widget/Screen Time enablement combinations. Apple API/profile decoding verified
all five renewed profiles are ACTIVE and retain the required capabilities. Capability
sync remains enabled; signed archive and TestFlight processing are still pending.

Run 43916381513 passed all gates and synced widgets and both shield extensions
without updates. The activity monitor identifier `YUMWM8RW57` has approved
`FAMILY_CONTROLS_DISTRIBUTION` and App Groups; its decoded App Store profile includes
the required Family Controls entitlement. EAS 22 nevertheless maps that entitlement
to `FAMILY_CONTROLS` (Development) and Apple's API rejects that redundant addition.
The release workflow now uses Expo's documented `EXPO_NO_CAPABILITY_SYNC=1` option
to preserve manually provisioned capabilities. This does not skip signing/profile
validation or the protected release wrapper. Any future entitlement change requires
updating the Apple identifiers and regenerating/verifying matching profiles before
release. Do not remove Distribution approval or replace it with Development.
