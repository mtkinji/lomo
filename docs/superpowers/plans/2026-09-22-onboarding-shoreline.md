# Shoreline onboarding implementation plan

## Approved household-first revision — September 22

The later connected mock supersedes the spending-led starter below. Execute sequentially in the existing checkout; no worktree or parallel implementation.

- Job: recognize how Kwilt can help household life and choose one useful start without committing to setup.
- Three-second read: household promise, then “Where would you like to start?” with Money, Screen time, Meals and chores, Goals and to-dos; each has one plainspoken benefit.
- Scan order: upper question → icon-led choice rows → quiet top-right Skip. No bottom Skip or eyebrow. Choice reveals a labeled example before a real owner handoff; it does not create data.
- Authority: current approved mock/copy → native accessibility → owned Kwilt tokens and controls. Reuse Logo, Text, Button, HapticPressable for descriptive navigation rows, Card for an example, and FullWidthActionDock. Local editorial composition remains Candidate. No component-system migration.
- Shoreline: dark scrim and light centered household promise, continuing the approved mock; plain parchment choices/examples. Existing real media, silent playback, still fallback, no new generation.
- Origin/Zeely references from this thread: preserve clear promise and example before commitment; translate with Kwilt identity; reject fabricated outcomes, urgency, pricing, and financial-advisor positioning.
- Required states: back, Skip, unavailable path filtering, double-tap protection in host, interrupted Meals continuation, motion reduction and background pause. Real auth, commercial access, household prerequisites and permissions remain with current owners.
- First implementation: replace the signed-in editorial rehearsal and add missing Screen Time navigation. Do not silently promote the production entry or implement the mock's illustrative commercial offer. Pre-auth routing and signed-device acceptance remain separate pending work.
- Verification: regression-first handoffs; all four categories and Chores alternate; scoped local gate; native review through Dev Tools if available. Automated evidence alone does not establish native visual acceptance.

> **For agentic workers:** Use executing-plans inline. No parallel implementation or worktree is authorized.

**Goal:** Make the approved shoreline direction usable in native Kwilt, with a direct starter and a real-data Money handoff, behind the existing development gate.

**Architecture:** Keep capability state, authentication, entitlement, Plaid and budget mutations in their existing owners. Add a local editorial presentation and a bundled decorative video with poster fallback; keep the existing illustrated presentation available. Do not promote first-launch routing until account continuity and every starter outcome have separate proof.

**Tech Stack:** Expo/React Native, expo-video (already installed), Kwilt UI and tokens, Jest.

## UI contract and ordered gates

1. Ground in product truth: `kwilt-first-run-onboarding.md`, Money README, UI constitution, inventory and atlas. This is the first implementation slice, not completion of the brief.
2. Contract: the job is choosing a useful starting point, then reviewing real Money evidence. Authority: current user decision > platform accessibility > Kwilt system > RNR anatomy > Origin reference. Three-second read: Control your spending; one dominant Build my budget action; quiet alternatives. Reveal bank setup, plan details and controls later. No mandatory tour, score, fabricated insights, new pricing, or permission wall.
3. Implement: `Button`, `Logo`, `Text`, `FullWidthActionDock` and owned navigation. New editorial composition stays local/Candidate. Closest precedent: canonical capability step and bottom dock; intentionally omit its fixed illustration slot for licensed full-screen footage. Origin September 15 captures: preserve calm hierarchy and coherent return; translate through Kwilt typography/controls/shoreline; reject copied clouds, badges, financial products and setup marathon.
4. Reduction: one hero, no card stack, four actual starter routes, real shell exit. Findings explain scope and do not imply safe-to-spend or overspending.
5. Render/operate: development rehearsal on current iOS Simulator; tap Money and alternatives; verify background/media failure/reduced motion with focused tests. Native visual evidence required; signed bank/purchase/enforcement is a separate boundary.
6. Critique/rerender: hierarchy, contrast, small viewport/large text, touch/scroll clearance, exit and return. Record failures honestly.

## Task 1 — truthful navigation (regression first)

- [ ] Change `capabilityOnboardingNavigationTarget.test.ts` to require no demoScenario for no-budget users; add Chores handoff assertion.
- [ ] Run focused Jest and observe failures.
- [ ] Remove implicit fixture injection in `capabilityOnboardingNavigationTarget.ts`; add typed Chores target and wire Dev Tools dispatch. Explicit sample-data rehearsal stays separate.
- [ ] Rerun focused tests.

## Task 2 — shoreline presentation and starter

- [ ] Bundle the approved real portrait MP4/poster with provenance in `assets/onboarding/` (unchanged media copy, no further loop editing).
- [ ] Test muted playback, app background pause, inactive screen pause, reduced-motion poster and error fallback before implementing lifecycle logic.
- [ ] Add `OnboardingShorelineBackdrop.tsx`, `EditorialOnboardingScreen.tsx`, `FirstRunStarterScreen.tsx` under capability-onboarding. Use a light neutral scrim to guarantee dark-text contrast, canonical action dock, and scrollable content at large text sizes.
- [ ] Add explicit `presentation="editorial"` to the existing host; Dev Tools opts in. Preserve existing reel tests and meal resumption. Add starter route tests.

## Task 3 — real Money return to the shoreline

- [ ] Add a scoped, deterministic first-look presentation using existing Money assessment evidence, without model-generated facts. Insufficient evidence has no amount or recommendation claim.
- [ ] For development capability-onboarding only, show it at the existing intent checkpoint; continue into existing plan choice, or go straight to spending. Never write a plan on viewing a finding.
- [ ] Test evidence/empty states and both actions; keep the existing Money setup and native owner contracts.

## Task 4 — verification and continuity

- [ ] Focused Jest for new components and navigation; source review of lifecycle and handoff.
- [ ] Native Simulator inspection via Dev Tools, screenshots and recorded provenance. Preserve unrelated dirty work; do not reset accounts or permissions.
- [ ] Run scoped `npm run verify:local -- --run --files ...` once at handoff; record omitted files and any unrelated failures.
- [ ] Update brief visual direction from sky to selected shoreline and record implementation/proof boundary.

## Remaining release work (not hidden behind this slice)

Pre-auth install intent and isolated guest preview; returning/deep-link/account-switch routing; streamlined Goals/to-do adapter; commercial offer confirmation; new first-look evidence pipeline with persistent reentry; optional context/AI; complete signed-device bank, purchase and app-control proof. Production entry remains gated. No commit, push or release in this task.

## Handoff evidence — September 22

### Household-first revision verification (latest)

- Native source now follows the approved household promise → four benefit-led choices → labeled example → existing setup owner. Money, Screen Time, Meals, Chores and Goals handoffs are covered by focused tests; viewing an example does not select a path or create work. Back and Skip are covered.
- Entry: Dev Tools → **Try shoreline onboarding**, or, in an already loaded development app, `kwilt://__dev/tools?householdOnboarding=1`. The link resets only the presentation rehearsal record, not device/auth/backend data. Production first-launch routing remains unchanged.
- Fresh scoped `verify:local` passed: 8 selected source/test files, 179 other changed files excluded, 5 related suites / 39 tests; application/test typechecks, whitespace, architecture and code-health checks passed in 36.11 seconds. This does not approve omitted work or integration/release.
- Native provenance: installed Simulator development client build **127**, current dirty JavaScript from `/Users/andrewwatanabe/Kwilt` on Metro port **8081**, branch/base HEAD above. No native rebuild, commit, push or release.
- The shoreline promise rendered with real moving footage and its CTA. Captures are under `artifacts/onboarding-shoreline/maestro-stable/`. Native tap-through **did not pass**: Maestro could see introductory text but could not locate Get started; a coordinate probe did not advance. A subsequent native-control check explicitly reported the Mac locked. The locked environment is a verification blocker, not proof of the root cause of the missing accessibility nodes. Removing the backdrop temporarily and relaunching did not resolve the test; exploratory code changes were reverted.
- Next acceptance: unlock Mac, rerun `e2e/maestro/household-onboarding.yaml` in the loaded development app, investigate any remaining accessibility/touch failure, inspect all examples at normal/large text, and operate real owner handoffs before promoting first-launch routing. Purchase/bank/Screen Time enforcement proof remains separate.

### Earlier spending-led slice (historical)

Tasks 1–3 are implemented at source level. Task 4 is partial: focused tests, scoped local gate, source review and brief update are complete; native visual acceptance is not. The checklist above describes intended acceptance, not a claim that every route was operated natively.

- Checkout: `/Users/andrewwatanabe/Kwilt`, branch `codex/onboarding-shoreline`, base HEAD `50bac307e2f31ab76a3748a3bc3582783bd2c099`. Existing unrelated dirty changes preserved. No commit or push.
- Six focused Jest suites passed, 41 tests. Scoped `verify:local` selected 15 source/test files and omitted 109 other changed files. Whitespace, application and test TypeScript, code-health ratchet, architecture and related tests passed. This does not approve omitted changes or replace the integration gate.
- Read-only review found no high-confidence regression. Follow-ups: initialize video only after the asynchronous reduced-motion preference is known; add direct MoneySetup first-look insertion/continue/inspection-return integration tests.
- Simulator: iPhone 17 Pro, iOS 26.5, UDID `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`. Reused installed development client; native build provenance was not re-established. Metro served this dirty checkout on port 8081 and bundled iOS successfully.
- UI automation could not acquire the Simulator window. Screenshot `artifacts/onboarding-shoreline/runtime.png` shows the existing To-dos/Plan your day surface, **not** the new onboarding. No new-screen visual or native route acceptance is claimed.
- Manual entry: Dev Tools → **Try shoreline onboarding**. This is signed-in development rehearsal; the ordinary production first-launch flow remains unchanged.
