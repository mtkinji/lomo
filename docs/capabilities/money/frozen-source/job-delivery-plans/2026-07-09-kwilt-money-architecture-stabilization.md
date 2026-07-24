# Job Delivery Implementation Plan: kwilt-money-architecture-stabilization

Date: 2026-07-09
Planner: Codex
Question: What durable architecture work should bring Kwilt Money toward scalability and production readiness?

## Recommendation

Stabilize Kwilt Money by fixing data ownership first, then moving read-model projection, screen orchestration, Screen Time rule state, and verification onto production-ready rails.

## Goal In Plain Language

Kwilt Money should stop behaving like a prototype where some screens know one
truth and other screens know another. A user should be able to create or edit a
budget category, review transactions, adjust a plan, and set app-control rules,
then trust that the same answer appears after refresh, restart, device change,
and TestFlight release.

For this program, production-ready means five promises:

1. Category and plan edits are durable account data, not local-session state.
2. Summary, Category Detail, Transactions, widgets, and app gates read the same computed budget truth.
3. Device-only Apple Screen Time selections are clearly separated from account-backed rule intent.
4. Preview/demo paths are explicit fixtures, not hidden fallbacks inside production logic.
5. Every migration or refactor has verification strong enough to catch money-truth regressions before TestFlight.

## Architecture Diagnosis

The architecture is not unsalvageable. It has useful layers:

- pure budget/forecast domain logic,
- Supabase-backed Plaid transactions and sync state,
- native Screen Time and widget integrations,
- Expo Router screens that already prove the main workflows.

The unstable part is that MVP bridge layers are now carrying production responsibility. The biggest issue is source-of-truth drift:

- budget category identity and plans are still partly module-local,
- transactions, match reviews, forecast settings, family sharing, and Plaid sync are Supabase-backed,
- screens choose between local, preview, and live snapshots themselves,
- Screen Time rule intent and local Apple token selections are not cleanly separated.

## Sequenced Workstreams

1. `2026-07-09-budget-categories-product-data.md`
   - Make categories, groups, plans, and rule intent account-backed product data.
   - This is the first dependency because it removes the root cause of local/live drift.
   - Execute Release 1 from `2026-07-09-category-truth-execution-handoff.md`.

2. `2026-07-09-living-target-recommendation-system.md`
   - Make onboarding's living-percent target a formal recommendation input.
   - Recommendations should explain budget amounts from income target, fixed costs,
     variable history, and 12-month averages when available.

3. `2026-07-09-canonical-budget-snapshot.md`
   - Build one pure `BudgetSnapshot` projector used by live and preview modes.
   - This turns persisted data into consistent answers for Summary, Detail, Transactions, widgets, and gates.

4. `2026-07-09-repositories-feature-hooks.md`
   - Move refresh, realtime, stale/error state, and mutations out of screens.
   - This reduces large-screen drift while preserving current workflows.

5. `2026-07-09-screen-time-rule-boundary.md`
   - Persist app-control rule intent server-side while keeping Apple token selections local.
   - This keeps privacy and device semantics honest as household/device support grows.

6. `2026-07-09-production-verification-spine.md`
   - Add tests, Supabase checks, migration/RLS checks, and CI.
   - This should start alongside the first migration work, not after all refactors are done.

## PM Decision Points

These are the decisions that affect user behavior and sequencing. The technical
plans use recommended defaults so implementation can proceed unless Andrew wants
to change direction.

| Decision | User-facing meaning | Options | Recommended default |
| --- | --- | --- | --- |
| Category identity | Whether `Shopping` is a real saved object or a built-in label. | Keep semantic ids like `shopping`; move to UUIDs; use UUIDs plus stable slugs. | Use UUID primary keys plus stable slugs/legacy ids for default categories. Users get durable objects, and migration remains practical. |
| Plan history | Whether old monthly budget settings remain auditable. | Full history now; only current plan now; defer all plan modeling. | Store current active plan now, leave version/history fields out until a real audit/history workflow exists. |
| Starter categories | How a new or existing account gets initial categories. | Generic defaults; transaction-history-derived setup; manual only. | Generate starter categories from the user's Plaid transaction history when available, using Personal Finance Categories and merchant patterns. Use generic defaults only when no transaction evidence exists yet. |
| Emoji display names | Whether category names should include personality by default. | Plain names; separate icon only; emoji-prefixed names plus stable ids. | Use emoji-prefixed category names for the user-facing experience, while keeping slugs and legacy ids plain. |
| Living target recommendations | Whether onboarding's 70% target drives real budget amounts. | Store as copy only; reconcile existing plans; generate explained recommendations. | Persist the living target and use it to generate explained category recommendations from income, fixed costs, variable history, and 12-month averages when possible. |
| Screen Time sync | Whether app selections travel across devices. | Sync all rule state; keep all local; server rule intent plus local token selections. | Server rule intent plus local Apple token selections. It is honest, privacy-aware, and matches Apple constraints. |
| Refactor pace | Whether to do one large architecture rewrite. | Big rewrite; incremental cutover by surface; patch symptoms. | Incremental cutover by surface, with the first slice proving category persistence and cross-screen consistency. |

## Program Quality Bar

A plan is not good enough if it only names better architecture. It is good
enough when it includes:

- the user promise being protected,
- the first implementation slice,
- the source-of-truth change,
- the cutover and rollback strategy,
- the proof required before release,
- the remaining PM decisions in non-technical terms.

This packet is intended to meet that bar. If an implementation pass cannot name
which user-visible contradiction it removes, it should stop and refine the slice
before writing code.

Plan-quality audit: `2026-07-09-architecture-plan-quality-audit.md` records the
coverage matrix, PM decision defaults, current score, and remaining execution
work. Use it as the packet-level self-review before implementation begins.

## Non-Goals

- Do not rewrite the app.
- Do not redesign the visible product while moving data ownership.
- Do not treat local fixture paths as production compatibility layers.
- Do not promise real-time bank truth; preserve the DB freshness versus Plaid/bank sync distinction.

## First Implementation Slice

Start with persisted category data:

1. Add `budget_categories` and `budget_plans`.
2. Generate starter categories for empty accounts from connected transaction history, with generic defaults only when no transaction evidence exists.
3. Replace category rename and amount update writes.
4. Update connected snapshot assembly to use persisted category rows.
5. Verify the intended emoji category experience: generated names include emoji, edited emoji names persist, and emoji render consistently in settings, detail, Summary, and after restart/refresh.

This slice is intentionally narrow but proves the core architecture direction.

Implementation handoff: `2026-07-09-category-truth-execution-handoff.md` defines
the Release 1 PR boundaries, file-level work, stop conditions, and demo proof.

## Suggested Release Sequence

### Release 1: Category Truth

User promise: category names include friendly emoji by default, and emoji,
monthly amount, and rollover settings are real saved settings.

Build:

1. Add category and plan tables.
2. Generate starter categories from transaction history for accounts without category rows.
3. Replace settings/detail/category-create writes.
4. Read persisted categories into the existing connected snapshot builder.
5. Keep old local fixture paths as preview-only fallback.

Proof:

- rename `Shopping` to include an emoji,
- restart app,
- refresh connected spend,
- verify Summary, Detail, Settings, Transactions picker, and widgets agree.

### Release 2: Snapshot Truth

User promise: every budget surface answers from the same budget calculation.

Build:

1. Create the pure `BudgetSnapshot` projector.
2. Feed it from live Supabase data and preview fixtures.
3. Convert Summary first, then Category Detail, then Transactions.

Proof:

- correct a transaction category once,
- verify Summary, Detail, Transactions, and widget output update consistently.

### Release 3: Living Target Recommendations

User promise: recommended category amounts visibly come from the user's living
target, income basis, fixed commitments, and transaction history.

Build:

1. Persist onboarding living target as account-backed data.
2. Add a pure recommendation projector.
3. Classify fixed versus variable costs.
4. Use 12 completed months for variable averages when available.
5. Show recommendation receipts before applying amounts.

Proof:

- choose a 70% living target,
- connect account history,
- verify Summary explains target, fixed costs, variable recommendations, and buffer,
- verify Category Settings explains a recommended amount and edit impact.

### Release 4: Rule And Device Truth

User promise: app-control rules are durable, while device setup is clearly per device.

Build:

1. Persist app-control rule intent.
2. Keep Apple selections local.
3. Show rule exists / this device configured state.

Proof:

- edit a threshold,
- restart,
- verify rule persists,
- verify app selections remain local and restrictions reconcile correctly.

### Release 5: Verification Spine

User promise: money and access behavior do not regress quietly.

Build:

1. Add unit/projector tests.
2. Add Supabase function and migration/RLS checks.
3. Add CI.
4. Document TestFlight gates.

Proof:

- CI green,
- local migration/RLS checks pass,
- existing forecast/backtest gates remain intact.

## Acceptance Criteria For The Stabilization Program

- [ ] Category identity and budget plans have one durable source.
- [ ] Live and preview modes feed the same read-model projector.
- [ ] Screens render from feature hooks instead of assembling persistence and snapshot logic directly.
- [ ] Screen Time rule intent is separated from device-local Apple token selections.
- [ ] CI and local verification cover domain/projector, Supabase functions, migrations/RLS, and existing forecast/backtest gates.

## Pause Point

Pause after these plans are reviewed before implementing migrations or refactors. The main decision to confirm is whether to start with server-backed category/plan tables exactly as proposed, or adjust the table split before code changes begin.

## Evaluation Checklist

Before implementation starts, Andrew should be able to answer:

- Does Release 1 solve the symptom that triggered this review without overreaching?
- Does the Release 1 execution handoff contain enough detail for an engineer to implement without re-deciding the architecture?
- Are UUID-backed categories with stable slugs the right identity model?
- Is it acceptable to defer full budget-plan history until users ask for past-plan auditability?
- Is the Screen Time server/device split understandable enough to explain in-app?
- Are we comfortable adding verification spine incrementally, starting with the category migration?
