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
- [ ] Final CI and merge of dinner/security candidate.
- [ ] Renew Apple distribution certificate and all 5 app/extension profiles.
  Apple rejected creation with 403: missing or expired developer agreement.
  Account holder must review/accept it; existing credentials expire November 22.
- [ ] Verify Microsoft Calendar provider expiry after Entra passkey sign-in;
  rotate with overlap only if required, then update expiry metadata.
- [ ] Run protected release command on clean current origin/main, with
  KWILT_VERIFY_BASE=984d13ffea2f09f477cefd8d7eb25578953076b4 to cover all work
  since build 136. It runs uncached changed checks, full coverage and backend
  preflight before EAS build/auto-submit.
- [ ] Record final commit, EAS build/submission IDs and Apple processing state.
- [ ] Verify build 137 is available to intended internal testers.

## Phone acceptance / known limits

Interactive Simulator testing is blocked by the locked Mac. No source checkout
has launched a runtime during this release task. Existing booted simulators are
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
build are verified. Production database mutations are not part of this checklist.
