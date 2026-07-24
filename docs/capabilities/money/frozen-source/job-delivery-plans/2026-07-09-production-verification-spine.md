# Job Delivery Implementation Plan: production-verification-spine

Date: 2026-07-09
Planner: Codex
Question: What verification spine is needed before architecture changes are production-ready?

## Recommendation

Add conventional tests, Supabase migration/RLS checks, edge-function checks, and CI around the architecture stabilization work while preserving the existing forecast/backtest harness.

## Job Context

- Job: Maya can trust Kwilt Money with real family financial decisions.
- Promised outcome: production changes do not silently corrupt budget truth, auth scope, or release readiness.
- Persona: Maya and Andrew as product owner/operator.
- Job step: release and maintain connected-spend budget behavior.
- User question: determine what changes make the app scalable and production-ready.
- Current delivery score: not scored; verification audit found typecheck plus a large smoke script but no conventional CI in this checkout.
- Recommended action type: production readiness infrastructure.

## Why This Is Highest Leverage

- Strategic weight: data-model migration without tests is high risk.
- Current friction: `npm run lint` is TypeScript only; `test:forecast` is a large custom script; Supabase functions are excluded from app typecheck.
- Evidence: no `.github` workflow was present in this checkout; `tsconfig.json` excludes `supabase/functions`.
- What gets easier for Maya: fewer regressions in the calculations and persistence flows she relies on.

## Current Workflow Evidence

- Current path:
  - `npm run lint`
  - `npm run test:forecast`
  - `npm run forecast:backtest`
  - `npm run plaid:sandbox:e2e -- --check-config`
  - `npm run ios:testflight`
- What works:
  - forecast smoke/backtest coverage is valuable and domain-specific.
  - Plaid Sandbox E2E covers deployed backend reality when credentials/session are available.
  - EAS/TestFlight lane exists.
- What breaks or drags:
  - no ordinary unit test runner.
  - no CI workflow in the checkout.
  - edge functions rely on Deno/Supabase runtime but are not part of `npm run lint`.
  - migration/RLS behavior is not gated locally.
- Source/runtime refs:
  - `package.json`
  - `scripts/budget-forecast-smoke.mjs`
  - `scripts/forecast-backtest.mjs`
  - `scripts/plaid-sandbox-e2e.mjs`
  - `supabase/functions/*`
  - `supabase/migrations/*`

## Chosen Change

Build a layered verification spine:

1. Typecheck app TypeScript.
2. Unit-test domain/projector logic with a real test runner.
3. Deno-check Supabase edge functions.
4. Apply/reset migrations against local Supabase and run RLS probes.
5. Keep forecast smoke/backtest as model-specific gates.
6. Add CI that runs the non-secret gates on every push/PR.

## PM Decision Summary

| Decision | Recommended choice | Why it matters |
| --- | --- | --- |
| When to add tests | Add the first new tests with the category migration, not after the refactor. | The highest-risk work is changing where money truth lives. |
| Test runner | Use Vitest for pure TypeScript domain/projector/repository-shape tests unless React Native component testing becomes necessary. | Fast tests make architecture work safer without fighting Expo UI tooling first. |
| CI scope | Run non-secret checks in CI; keep Plaid Sandbox E2E as local/deployed verification. | Protects the repo without putting real secrets into every PR run. |
| Backtest cadence | Run forecast/backtest locally for model changes; consider scheduled CI later. | Keeps CI practical while preserving the model-improvement harness. |
| Release gate | Require local architecture gates plus real simulator/device proof before TestFlight. | Type checks alone are not enough for native/financial behavior. |

## Verification Layers

| Layer | Purpose | First command |
| --- | --- | --- |
| Typecheck | Catch TypeScript and import drift. | `npm run lint` |
| Unit/projector tests | Prove pure money truth and snapshot projection. | `npm run test` |
| Forecast smoke | Preserve existing domain contract. | `npm run test:forecast` |
| Forecast backtest | Evaluate forecast/income model quality. | `npm run forecast:backtest` |
| Supabase function check | Catch edge-function syntax/runtime drift. | `npm run supabase:functions:check` |
| Migration/RLS test | Prove schema and permissions. | `npm run supabase:migrations:test` |
| Plaid Sandbox E2E | Prove deployed Plaid/Supabase path with real session/secrets. | `npm run plaid:sandbox:e2e -- --check-config`, then full E2E when auth is available |
| Native runtime proof | Prove simulator/device behavior. | manual/simulator script per release |

## First Tests To Add

Add these with the category persistence slice:

1. Category repository maps persisted category rows to existing budget definition shape.
2. Starter generation creates transaction-derived categories exactly once when transaction history is available, and generic fallback categories exactly once when it is not.
3. Rename and amount updates produce durable rows.
4. RLS probe: owner can read/write; household member can read; unrelated user cannot read; household member cannot write unless enabled.
5. Snapshot builder uses persisted category names instead of fixture names.
6. Emoji display names persist while slugs, legacy ids, and matching keys stay emoji-free.
7. Living-target recommendation projector proves 70% target math, fixed-cost priority, 12-month average variable recommendations, missing-resource refusal, and user override preservation.
8. Failed write does not silently mutate local-only state.

The concrete first-release test and demo scope is defined in
`2026-07-09-category-truth-execution-handoff.md`. Treat that handoff as the
minimum Release 1 verification receipt.

These tests directly cover the architecture bug class that triggered the review.

## CI Shape

Add `.github/workflows/ci.yml` with jobs:

- `app-checks`
  - install dependencies,
  - `npm run lint`,
  - `npm run test`,
  - `npm run test:forecast`.
- `supabase-checks`
  - install/setup Deno or Supabase CLI as needed,
  - `npm run supabase:functions:check`,
  - run migration/RLS checks if local Supabase is available in CI.

Do not run secret-dependent Plaid E2E in ordinary PR CI. Keep it as a release
or manual verification gate.

## Release Gate Matrix

| Release | Required proof |
| --- | --- |
| Category Truth | lint, category tests, migration/RLS, simulator rename/restart/refresh proof |
| Snapshot Truth | lint, projector tests, forecast smoke/backtest, Summary/Detail/Transactions parity proof |
| Living Target Recommendations | lint, recommendation projector tests, forecast/backtest review, onboarding 70% target to Summary/Settings receipt proof |
| Screen Time Rule Boundary | lint, local storage migration tests, real Screen Time-enabled build proof |
| TestFlight | all relevant local gates, deployed Supabase function state, simulator/device proof, EAS/TestFlight processing check |

## Scope

In scope:

- Add test runner and first focused tests around the new snapshot projector.
- Add recommendation projector tests for living target, fixed costs, variable history, and user overrides.
- Add Deno/Supabase function check commands.
- Add migration/RLS verification script.
- Add CI workflow.
- Document release gates before TestFlight.

Out of scope:

- Full E2E automation of native Screen Time.
- Running Plaid Sandbox E2E in public CI with secrets.
- Rewriting the entire forecast smoke script immediately.

## Implementation Tasks

1. Choose test runner, likely Vitest unless Expo/Jest integration is needed for RN components.
2. Add `npm run test` for pure TS domain/projector tests.
3. Extract high-value assertions from `budget-forecast-smoke.mjs` into focused tests while keeping the smoke command.
4. Add `npm run supabase:functions:check` using Deno checks for edge functions.
5. Add `npm run supabase:migrations:test` for local migration/RLS verification.
6. Add `.github/workflows/ci.yml` with typecheck, unit tests, function checks, and smoke/backtest where practical.
7. Update README release section with required gates before TestFlight.
8. Add a short verification receipt template for future architecture PRs.

## Acceptance Criteria

- [ ] CI exists and runs on push/PR.
- [ ] Pure domain/projector tests run without manual transpile scripts.
- [ ] Supabase functions are syntax/type checked.
- [ ] Migration/RLS checks prove owner, household member, and unrelated-user access.
- [ ] Existing forecast smoke and backtest remain available.
- [ ] Release docs distinguish local gates, deployed Supabase checks, simulator checks, and TestFlight proof.
- [ ] The first category persistence implementation cannot merge without tests for seeding, rename persistence, RLS, and snapshot category-name source.
- [ ] Secret-dependent Plaid E2E remains documented as manual/release verification rather than silently omitted.

## Verification

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run test:forecast`
- [ ] `npm run forecast:backtest`
- [ ] `npm run supabase:functions:check`
- [ ] `npm run supabase:migrations:test`
- [ ] GitHub Actions green on a branch

## Map Update Trigger

Do not update user-facing job scores just for CI. Update engineering/release docs instead.

Fields likely to change:

- none in job delivery map.

Do not update the score until:

- verification reduces a user-visible release or reliability risk.

## Risks And Open Questions

- `forecast:backtest` may be too slow/noisy for every push. Start as a local/release gate unless runtime proves it is cheap enough for CI.
- Supabase local testing may require Docker in CI. If that is too slow, keep RLS probes local at first but do not call the migration complete until they pass.
- Keep the existing smoke script as an integration contract while extracting focused tests; do not delete it until equivalent coverage is proven.
