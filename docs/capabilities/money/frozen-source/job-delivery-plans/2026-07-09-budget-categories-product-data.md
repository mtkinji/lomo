# Job Delivery Implementation Plan: budget-categories-product-data

Date: 2026-07-09
Planner: Codex
Question: What should change first to make Kwilt Money production-ready after the architecture audit?

## Recommendation

Make budget categories, category groups, budget plans, forecast settings, and app-control rule intent durable account-backed product data instead of module-local state.

## Job Context

- Job: Maya trusts the money app enough to plan and adjust family spending.
- Promised outcome: category edits, budget plans, and rules survive navigation, refresh, restart, and device changes.
- Persona: Maya, family organizer managing budget reality before spending.
- Job step: maintain budget categories and rules after connected spend arrives.
- User question: why are settings and detail reading different sources?
- Current delivery score: not scored in the job map; architecture audit found source-of-truth drift.
- Recommended action type: stabilization foundation.

## Why This Is Highest Leverage

- Strategic weight: every money surface depends on category identity and plan data being durable.
- Current friction: `src/platform/budget-repository.ts` owns mutable in-memory categories while Supabase owns transactions, forecast settings, and match rules.
- Evidence: `updateBudget()` and `createBudget()` mutate the local `budgets` array; `getConnectedSpendBudgetSnapshot()` then mixes those local rows with Supabase transaction rows.
- What gets easier for Maya: renaming Shopping to include an emoji, changing monthly amount, or creating a category becomes a real product operation rather than a local-session illusion.

## Current Workflow Evidence

- Current path:
  - `app/app-control/[budgetId].tsx` calls `updateBudget()`.
  - `app/budgets/[budgetId].tsx` prefers connected snapshot data when signed in.
  - `src/platform/plaid.ts` builds live snapshots from Supabase transactions plus local `getBudgetRows()`.
- What works:
  - Supabase already persists transactions, forecast settings, match rules, family sharing, and Plaid sync state.
  - RLS patterns exist and can be copied.
- What breaks or drags:
  - category identity is not a durable server object.
  - category creation from live transaction flows uses forecast settings as an implicit category placeholder.
  - app-control rules are not yet cleanly split into server intent and device-local token selections.
- Source/runtime refs:
  - `src/platform/budget-repository.ts`
  - `src/platform/plaid.ts`
  - `app/app-control/[budgetId].tsx`
  - `app/budgets/new.tsx`
  - `app/transactions/[transactionId].tsx`
  - `supabase/migrations/*`

## Chosen Change

Introduce canonical Supabase product tables for user/household-owned budget categories and budget plans, then route category creation, rename, amount, rollover, and forecast-plan writes through typed repositories.

## PM Decision Summary

The implementation should proceed with these defaults unless Andrew chooses a
different product direction.

| Decision | Recommended choice | Why it matters |
| --- | --- | --- |
| Category identity | Use UUIDs as real database IDs, plus stable slugs/legacy ids for default categories like `shopping`. | Users get durable saved objects, while existing transaction/review data can still map from today's text ids. |
| Budget plan history | Store the current active plan now; defer full history/versioning. | The immediate user need is "my current settings persist." Historical plan audit is valuable but not needed to fix trust drift. |
| Starter category generation | Generate starter categories from the user's Plaid transaction history when available; use generic defaults only if there is no usable transaction history yet. | Categories should reflect the user's actual spending rather than a canned budget template. |
| Emoji category names | Store friendly emoji-prefixed names such as `🛒 Shopping`; keep slugs and legacy ids plain. | The app feels more fun while persistence and matching stay stable. |
| Household editing | Reuse existing household access rules for reads; restrict writes to owner/current user until a shared-editing product decision is made. | Avoids accidental household-wide edits while preserving shared visibility. |
| Forecast settings migration | Keep text `budget_id` compatibility during Release 1; add `category_id` in a later or follow-up migration after category rows are stable. | Reduces blast radius while moving the core category source of truth. |

## Proposed Data Model

Tables:

- `budget_categories`
  - `id uuid primary key`
  - `user_id uuid not null`
  - `household_id uuid null`
  - `slug text not null`
  - `legacy_budget_id text null`
  - `name text not null`
  - `icon_key text null`
  - `description text null`
  - `accent_color text null`
  - `status text default 'active'`
  - `sort_order integer not null default 0`
  - `created_at`, `updated_at`
  - unique active slug per owner/household
  - unique non-null `legacy_budget_id` per owner/household during migration
- `budget_category_groups`
  - optional group rows for Household, Movement, Food, etc.
- `budget_category_group_members`
  - category ordering and grouping.
- `budget_plans`
  - `id uuid primary key`
  - `category_id uuid not null`
  - `cadence text not null`
  - `base_budget_cents integer not null`
  - `rollover_enabled boolean not null default false`
  - `rollover_reset_starts_on date null`
  - `starts_on date null`
  - `ends_on date null`
  - `forecast_mode text null`
  - `manual_projected_spend_cents integer null`
  - `scheduled_label text null`
  - `scheduled_amount_cents integer null`
  - `scheduled_due_day integer null`
  - `scheduled_merchant_contains text null`
  - `status text not null default 'active'`
  - later: versioning/effective dates if plan history becomes necessary.
  - partial unique index so a category has one active plan at a time

Compatibility:

- Keep `budget_forecast_settings` temporarily keyed by `budget_id`, but add migration path to `category_id`.
- Keep `budget_transactions.budget_id` as text during the first pass, but normalize toward `category_id uuid`.
- Generate starter categories for a user only when they have no category rows.
- Prefer transaction-derived categories based on stored Plaid Personal Finance Categories and recurring merchant patterns.
- Treat Plaid categories as evidence for Kwilt categories, not as user-facing category rows copied one-for-one.
- Generate friendly emoji-prefixed category names by default, while keeping `slug`, `legacy_budget_id`, and matching keys emoji-free.
- Use generic fallback defaults only when the user has no usable transaction history yet.
- Preserve a `legacy_budget_id` such as `shopping`, `groceries`, or `gas` so current transaction reviews and forecast settings can be mapped without destructive data changes.

## Cutover Strategy

Use an additive, reversible cutover. Do not delete old local fixture behavior or
old text budget ids in the first release.

1. Add tables and read APIs.
   - No UI behavior changes yet.
   - Migration is additive and safe to deploy.
2. Add idempotent starter generation.
   - When a signed-in user has no `budget_categories`, inspect stored `budget_transactions`.
   - Use `personal_finance_category_primary`, `personal_finance_category_detailed`, confidence, merchant names, and spend totals to propose the first category set.
   - Keep a small generic fallback set only when transaction history is unavailable or too sparse.
   - Generated categories include stable `legacy_budget_id` values so existing text-id assignments can still map safely.
3. Read persisted categories into the connected snapshot builder.
   - Live mode uses Supabase categories as the base category list.
   - Preview mode still uses explicit fixtures.
   - If category reads fail, keep the last useful live snapshot rather than showing fake defaults.
4. Move writes.
   - Category rename, monthly amount, rollover, and new category creation write to Supabase.
   - Keep local updates only as optimistic UI/cache behavior after a successful server write or clearly mark them as unsaved.
5. Verify and remove hacks.
   - Remove detail-page local/live identity merge patches once live category identity is durable.
   - Rename `budget-repository.ts` concepts or exports so production code cannot confuse fixture state with product state.

## Rollback Strategy

Rollback should be operationally boring:

- Migrations are additive: no existing transaction, forecast, or match-rule columns are dropped.
- App code should keep a feature-flag-like fallback to the old fixture/category path during the first release.
- If category table reads fail in production, live connected spend can still render from the last known snapshot or old local defaults with explicit stale/error copy.
- If category writes fail, do not silently mutate local state; show an error and leave the old value visible.
- Do not remove `budget_transactions.budget_id` or `budget_forecast_settings.budget_id` until a later migration proves UUID category mapping in production.

## First Slice: Exact User Story

As Maya, I rename `Shopping` to `🛒 Shopping` and change its monthly amount. When
I leave settings, refresh connected spend, restart the app, or open another
device/session, the category still reads `🛒 Shopping` with the new amount across
Summary, Category Detail, Settings, Transactions category picker, and widgets.

This is the smallest slice that proves the architecture has moved from local
session state to account-backed product truth.

## Scope

In scope:

- Supabase migrations and RLS for category/group/plan tables.
- Typed repository functions:
  - `listBudgetCategories()`
  - `getBudgetCategoryDetail()`
  - `createBudgetCategory()`
  - `updateBudgetCategory()`
  - `updateBudgetPlan()`
- Replace local category writes in:
  - category settings name/amount/rollover
  - new category screen
  - transaction-driven category creation
- Keep fixture defaults as explicit preview seed data.

Out of scope:

- Full transaction assignment normalization.
- Long-term budget-plan version history.
- Visual redesign of settings or detail screens.
- Offline write conflict resolution beyond honest error/stale states.

## Implementation Tasks

Execution handoff: use `2026-07-09-category-truth-execution-handoff.md` for
Release 1 PR boundaries, exact file targets, stop conditions, and the demo
script. The task list below remains the architectural scope for the full
category/product-data workstream.

1. Add additive Supabase migrations for `budget_categories`, category grouping, and `budget_plans`.
   - Planned migration name for the first implementation pass: `20260709180000_budget_categories_and_plans.sql`.
2. Add RLS policies:
   - owner can read/write own categories and plans,
   - household members can read shared categories,
   - shared editing remains disabled unless a later product decision enables it.
3. Add typed repository functions:
   - `listBudgetCategories(client)`
   - `ensureStarterBudgetCategories(client)`
   - `deriveStarterBudgetCategories(transactions)`
   - `updateBudgetCategory(client, input)`
   - `updateBudgetPlan(client, input)`
   - `createBudgetCategory(client, input)`
4. Add mapping helpers from product tables to the existing `BudgetDefinition` shape.
5. Add transaction-history-derived starter generation for empty signed-in accounts, with generic fallback only when no usable transaction evidence exists.
6. Update connected snapshot assembly to use persisted categories as the base set.
7. Route category settings name/amount/rollover writes through Supabase.
8. Route new category creation and transaction-driven category creation through Supabase.
9. Keep `src/platform/budget-repository.ts` as preview fixture source only, with naming that makes that explicit.
10. Add tests for rename, create, amount update, rollover toggle, transaction-derived starter generation, fallback generation, emoji display names, plain slugs/legacy ids, and legacy id mapping.

## Acceptance Criteria

- [ ] A category rename persists after app restart and connected snapshot refresh.
- [ ] The original emoji bug class is fixed without a display-only local/live merge hack.
- [ ] Generated starter categories include friendly emoji display names.
- [ ] Emoji do not affect slug uniqueness, legacy id mapping, transaction matching, or RLS.
- [ ] A category create from Transactions appears in Summary, Transactions, and Category Detail without relying on forecast settings as a placeholder.
- [ ] Budget amount and rollover edits persist in Supabase and render consistently across settings/detail.
- [ ] Preview mode still works from explicit fixture data.
- [ ] Production users with no category rows get transaction-derived starter categories exactly once when transaction history is available.
- [ ] Production users with no usable transaction history get a small generic fallback category set exactly once.
- [ ] RLS blocks unrelated users, permits household reads, and prevents accidental shared writes unless explicitly enabled.
- [ ] Failed writes do not silently update local-only state.

## Verification

- [ ] `npm run lint`
- [ ] new category repository tests
- [ ] local Supabase migration apply/reset
- [ ] RLS checks with owner, household member, unrelated user
- [ ] simulator smoke: rename Shopping with emoji, restart app, refresh connected snapshot, verify detail/settings/Summary agree
- [ ] simulator smoke: create a category from a transaction and verify it appears in Summary, Detail, and Transactions picker
- [ ] regression check: live connected spend still displays if category rows are present but forecast settings are missing
- [ ] Release 1 demo script from `2026-07-09-category-truth-execution-handoff.md` passes before removing the temporary local/live identity merge.

## Map Update Trigger

Update `docs/job-delivery-map.yaml` when category editing becomes durable enough to change a job-delivery score.

Fields likely to change:

- Category maintenance workflow.
- Budget detail/settings reliability evidence.

Do not update the score until:

- the live signed-in app proves persistence through restart and refresh.

## Risks And Open Questions

- If category rows are generated during the first signed-in budget read, that read becomes a write operation. The app should make this idempotent, non-blocking, and grounded in transaction evidence when available.
- Existing forecast settings may point to text ids. Keep compatibility until UUID mapping is proven.
- Household edit semantics are a PM decision. This plan recommends read-sharing first, edit-sharing later.
- Full budget plan history is deferred. If App Review, support, or user trust requires historical audit sooner, this plan should be amended before implementation.
