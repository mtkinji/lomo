# Category Truth Execution Handoff

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release the first architecture stabilization slice: budget category names, icons, monthly amounts, and rollover settings become durable signed-in account data instead of mutable local fixture state.

**Architecture:** Add Supabase-owned category and plan tables, read them through typed repository functions, and feed them into the existing connected snapshot builder before replacing the screen writes. Keep current text budget ids as compatibility fields until transaction assignment and forecast settings are normalized in a later release.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase Postgres/RLS, `@supabase/supabase-js`, Vitest for pure TypeScript tests, and the current forecast/job-delivery npm scripts.

---

## PM Defaults For Release 1

These choices are locked for the first implementation unless Andrew changes product direction before code starts.

| Decision | Release 1 default | User-facing consequence |
| --- | --- | --- |
| Category identity | UUID database id plus stable `slug` and `legacy_budget_id` | Existing ids like `shopping` continue to work while categories become real saved objects. |
| Plan history | Store only the current active plan | The app reliably remembers current settings first; historical budget audit can come later. |
| Starter categories | Generate categories from Plaid transaction history when available; use generic defaults only when no transaction evidence exists yet | Existing signed-in users get categories that reflect their actual spending instead of a canned template. |
| Emoji names | Store friendly emoji-prefixed display names; keep slugs and legacy ids plain | Categories feel more fun without making persistence or matching brittle. |
| Household behavior | Household members can read shared categories; only the owning user can write in Release 1 | Family members can see the same budget truth without accidental shared editing. |
| Forecast/settings compatibility | Keep `budget_forecast_settings.budget_id` and `budget_transactions.budget_id` text ids during Release 1 | Lowers migration risk while still fixing the category truth problem. |
| Failure behavior | Failed server writes do not update local-only state | The app shows the old truth plus an error instead of pretending a save worked. |

## Release 1 User Promise

As Maya, I see starter categories with friendly emoji names such as `🛒 Shopping`, then rename or tune one and change its monthly amount. After I leave settings, refresh connected spend, restart the app, or open another signed-in session, Summary, Category Detail, Settings, Transactions category picker, and widgets all agree on the same category name and amount.

This is the first proof that Kwilt Money has moved from local-session category state to account-backed product truth.

## Starter Category Derivation Rule

Plaid categories are evidence, not the final product taxonomy.

For signed-in users with stored transactions and no category rows:

1. Group outflow transactions by `personal_finance_category_primary` and `personal_finance_category_detailed`.
2. Prefer `HIGH` and `VERY_HIGH` confidence rows when deriving starter categories.
3. Use merchant recurrence and spend totals to decide whether a Plaid category deserves its own Kwilt category.
4. Map Plaid categories into user-facing Kwilt category names with leading emoji and matching icon keys, such as `🛒 Shopping`, `🍽 Restaurants`, `🛍 Groceries`, `⛽ Gas`, `🏠 Rent`, `💡 Utilities`, `🔁 Subscriptions`, or `💵 Income Review`.
5. Preserve `legacy_budget_id` values for known Kwilt categories so existing review and forecast rows keep working.
6. Create a generic fallback set only when transaction history is unavailable, too sparse, or too low-confidence.

Do not expose raw Plaid taxonomy labels as the main category names unless they
already read naturally to a user.

Emoji are part of the display name. They must not be used to build `slug`,
`legacy_budget_id`, matching keys, or RLS logic.

## Code Evidence This Fixes

- `src/platform/budget-repository.ts:158` defines default categories as local fixture objects.
- `src/platform/budget-repository.ts:296` keeps mutable module-global `budgets`.
- `src/platform/budget-repository.ts:1147` and `src/platform/budget-repository.ts:1174` create and update categories by mutating that local array.
- `src/platform/plaid.ts:734` builds the connected snapshot, and `src/platform/plaid.ts:760` currently uses `getBudgetRows()` as the live category base.
- `app/app-control/[budgetId].tsx:406`, `app/app-control/[budgetId].tsx:424`, and `app/app-control/[budgetId].tsx:446` call `updateBudget()` for rollover, rename, and amount edits.
- `app/budgets/new.tsx:17`, `app/(tabs)/transactions.tsx:244`, and `app/transactions/[transactionId].tsx:260` create categories with `createBudget()`.

## First Release PR Boundaries

### PR 0: Add Pure TypeScript Test Runner

Purpose: make the category migration testable before the persistence refactor starts.

Files:

- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/smoke.test.ts`

Steps:

- [ ] Add `vitest` to `devDependencies`.
- [ ] Add `"test": "vitest run"` to `package.json`.
- [ ] Create `vitest.config.ts` with a Node test environment and the same `@/` alias used by TypeScript.
- [ ] Add `src/test/smoke.test.ts` with one assertion that proves the runner is wired.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:forecast`.

Expected proof:

- `npm run test` runs without Expo runtime setup.
- Existing TypeScript and forecast gates still pass.

Stop conditions:

- Stop if the test runner requires React Native component rendering setup for pure domain tests.
- Stop if adding the runner changes app runtime dependencies.

Required `vitest.config.ts` shape:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

Required `src/test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('test runner', () => {
  it('runs pure TypeScript tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### PR 1: Add Durable Category Tables And Read Repository

Purpose: deploy additive schema and prove the app can read account-backed categories without changing visible behavior.

Files:

- Create: `supabase/migrations/20260709180000_budget_categories_and_plans.sql`
- Create: `src/platform/budget-categories.ts`
- Create: `src/platform/budget-categories.fixtures.ts`
- Create: `src/platform/budget-categories.test.ts`

Steps:

- [ ] Add `budget_categories`, `budget_category_groups`, `budget_category_group_members`, and `budget_plans` tables.
- [ ] Use `public.set_updated_at()` triggers, matching existing migration style.
- [ ] Enable RLS on every new table.
- [ ] Add owner read/write policies using `auth.uid() = user_id`.
- [ ] Add household read policies using the existing `public.can_access_budget_user(user_id)` helper.
- [ ] Do not grant household writes in Release 1.
- [ ] Grant only the needed authenticated privileges: `select`, `insert`, and `update`.
- [ ] Add repository functions:
  - `listBudgetCategories(client)`
  - `ensureStarterBudgetCategories(client)`
  - `deriveStarterBudgetCategories(transactions)`
  - `listBudgetPlans(client)`
  - `mapCategoryRowsToBudgetDefinitions(categories, plans)`
- [ ] Read `personal_finance_category_primary`, `personal_finance_category_detailed`, `personal_finance_category_confidence`, `merchant_name`, `amount_cents`, and `date` from stored transactions for starter generation.
- [ ] Generate emoji-prefixed display names for starter and fallback categories.
- [ ] Keep `slug` and `legacy_budget_id` ASCII/plain-text and independent from the emoji display name.
- [ ] Keep generic fallback category seed data in one explicit fixture file, copied from the existing `initialBudgets` product fields.
- [ ] Add tests for transaction-derived category generation, fallback generation, emoji display names, plain slugs/legacy ids, idempotent seeding, and row-to-budget mapping.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Apply the migration locally with Supabase CLI before treating this PR as complete.

Expected proof:

- A signed-in user with no category rows and usable transaction history receives one transaction-derived starter set.
- A signed-in user with no category rows and no usable transaction history receives one generic fallback set.
- Generated category display names include emoji, while slugs and legacy ids remain plain.
- A second read does not duplicate categories.
- Existing preview/local fixture behavior is unchanged.
- RLS allows the owner to read/write and blocks unrelated users.

Stop conditions:

- Stop if starter generation can create duplicate categories.
- Stop if generic defaults are used when transaction history is available and confident enough to derive categories.
- Stop if emoji leak into slugs, legacy ids, matching rules, or database uniqueness keys.
- Stop if RLS cannot distinguish owner writes from household reads.
- Stop if the repository has to import React, Expo Router, widgets, or native Screen Time modules.

Required migration contract:

```sql
create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.budget_households(id) on delete set null,
  slug text not null check (length(trim(slug)) > 0),
  legacy_budget_id text,
  name text not null check (length(trim(name)) > 0),
  icon_key text,
  description text,
  accent_color text,
  status text not null default 'active' check (status in ('active', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists budget_categories_active_slug_unique
on public.budget_categories (
  user_id,
  coalesce(household_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(slug)
)
where status = 'active';

create unique index if not exists budget_categories_active_legacy_id_unique
on public.budget_categories (
  user_id,
  coalesce(household_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(legacy_budget_id)
)
where status = 'active' and legacy_budget_id is not null;

create table if not exists public.budget_category_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.budget_households(id) on delete set null,
  slug text not null check (length(trim(slug)) > 0),
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_category_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.budget_category_groups(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, category_id)
);

create table if not exists public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cadence text not null default 'monthly' check (cadence in ('monthly')),
  base_budget_cents integer not null check (base_budget_cents >= 0),
  rollover_enabled boolean not null default false,
  rollover_reset_starts_on date,
  starts_on date,
  ends_on date,
  forecast_mode text not null default 'paced' check (forecast_mode in ('paced', 'scheduled', 'manual')),
  manual_projected_spend_cents integer,
  scheduled_label text,
  scheduled_amount_cents integer,
  scheduled_due_day integer,
  scheduled_merchant_contains text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists budget_plans_one_active_plan_per_category
on public.budget_plans (category_id)
where status = 'active';
```

Required RLS policy shape:

```sql
alter table public.budget_categories enable row level security;
alter table public.budget_category_groups enable row level security;
alter table public.budget_category_group_members enable row level security;
alter table public.budget_plans enable row level security;

create policy "Users can read accessible budget categories"
on public.budget_categories
for select
to authenticated
using (public.can_access_budget_user(user_id));

create policy "Users can insert their own budget categories"
on public.budget_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own budget categories"
on public.budget_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

Apply the same owner-write and accessible-read policy pattern to groups, group
members, and plans. Do not add household-member update policies in Release 1.

### PR 2: Feed Connected Snapshot From Durable Categories

Purpose: make live budget truth start from persisted categories while preserving compatibility with existing transaction and forecast ids.

Files:

- Modify: `src/platform/plaid.ts`
- Modify: `src/platform/budget-categories.ts`
- Create: `src/platform/plaid-connected-snapshot.test.ts`
- Modify: `src/platform/budget-categories.test.ts`

Steps:

- [ ] Change `getConnectedSpendBudgetSnapshot(client)` so it reads categories and active plans alongside transactions, connections, forecast settings, and match rules.
- [ ] Replace the live `getBudgetRows()` base in `buildConnectedSpendBudgetSnapshot()` with mapped persisted categories when category rows exist.
- [ ] Keep an explicit fallback to fixture rows only for preview/missing-schema compatibility, not as silent production truth.
- [ ] Preserve `legacy_budget_id` mapping so `budget_transactions.budget_id`, `budget_forecast_settings.budget_id`, and match rules still resolve.
- [ ] Make a missing category table error visible as a compatibility fallback during rollout, not a fake successful server save.
- [ ] Add a snapshot test proving a persisted `shopping` row named `🛒 Shopping` wins over fixture name `Shopping`.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:forecast`.

Expected proof:

- If the persisted `shopping` category name is `🛒 Shopping`, connected snapshot details use the persisted emoji name.
- Transaction assignment and forecast settings still resolve through `legacy_budget_id`.
- The old local/live identity merge in Category Detail becomes unnecessary once screens read the connected snapshot after persistence lands.

Stop conditions:

- Stop if forecast settings stop applying to existing categories.
- Stop if persisted categories create new ids that break reviewed transactions.
- Stop if Summary and Category Detail can still show different names from the same live snapshot.

### PR 3: Replace Category Settings Writes

Purpose: make the original emoji/name/amount/rollover bug class impossible by writing settings to Supabase first.

Files:

- Modify: `app/app-control/[budgetId].tsx`
- Modify: `app/budgets/[budgetId].tsx` only as needed to remove temporary local/live merge behavior after persistence is proven
- Modify: `src/platform/budget-categories.ts`
- Modify: `src/platform/budget-categories.test.ts`

Steps:

- [ ] Add `updateBudgetCategory(client, input)` for name, icon, description, accent color, and status.
- [ ] Add `updateBudgetPlan(client, input)` for monthly amount, rollover enabled, rollover reset, forecast mode fields that belong to the plan.
- [ ] Change rename, amount, and rollover handlers in `app/app-control/[budgetId].tsx` to await Supabase writes before updating local visible state.
- [ ] On write success, refresh the connected snapshot or invalidate the shared budget data hook if it already exists.
- [ ] On write failure, keep the old visible value and show a concise error.
- [ ] Do not call `updateBudget()` for signed-in production category settings after this PR.
- [ ] Keep `updateBudget()` available for preview fixture mode only.
- [ ] Add repository tests for rename, amount update, rollover toggle, and failed-write behavior.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run a simulator smoke test using the demo script below.

Expected proof:

- Confirm generated Shopping appears as `🛒 Shopping`, then rename it to another emoji-bearing name.
- Change monthly amount.
- Leave settings.
- Return to Category Detail and Summary.
- Restart the app.
- Refresh connected spend.
- The same name and amount remain visible.

Stop conditions:

- Stop if the app updates the visible name before the server save succeeds and cannot roll it back.
- Stop if preview mode loses the ability to edit fixture categories for demos.
- Stop if the write path depends on a screen-local object that can be stale after navigation.

### PR 4: Replace Category Creation Writes

Purpose: make category creation from New Category and Transactions create real product data.

Files:

- Modify: `app/budgets/new.tsx`
- Modify: `app/(tabs)/transactions.tsx`
- Modify: `app/transactions/[transactionId].tsx`
- Modify: `src/platform/budget-categories.ts`

Steps:

- [ ] Add `createBudgetCategory(client, input)` and create a matching active `budget_plans` row in the same user action.
- [ ] Use the generated category UUID as the product id and a stable slug/legacy id for compatibility.
- [ ] Replace signed-in `createBudget()` calls with `createBudgetCategory()`.
- [ ] Keep preview/demo creation routed through fixture-only `createBudget()` until preview has its own explicit fixture service.
- [ ] Refresh connected snapshot after creation.
- [ ] Verify the new category appears in Summary, Category Detail, Transactions category picker, and transaction review flows.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:forecast`.

Expected proof:

- A category created from a transaction no longer exists only because forecast settings or local fixture state made it appear.
- The category remains after restart.

Stop conditions:

- Stop if category creation writes only a forecast setting and not a category row.
- Stop if duplicate slugs can overwrite an existing category.
- Stop if the Transactions category picker can show categories that Summary cannot.

### PR 5: Rename Fixture Repository And Remove Compatibility Hacks

Purpose: make it hard for future code to mistake preview fixtures for production data.

Files:

- Modify or split: `src/platform/budget-repository.ts`
- Modify imports in converted screens/services
- Modify: `app/budgets/[budgetId].tsx`
- Modify: `src/services/connectedSpendWidgets.ts`

Steps:

- [ ] Rename exported fixture concepts so production call sites cannot casually import `getBudgetRows()` as live truth.
- [ ] Move or clearly mark preview-only creation/update helpers.
- [ ] Remove the temporary Category Detail local/live identity merge once persisted category reads are the live source.
- [ ] Confirm widget sync consumes the same connected snapshot category rows as Summary.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:forecast`.
- [ ] Run the release demo script below.

Expected proof:

- Code search shows signed-in production surfaces no longer call `createBudget()` or `updateBudget()` for real user data.
- The fixture repository remains available for preview/demo only.

Stop conditions:

- Stop if the rename creates a large unrelated refactor.
- Stop if widgets still reconstruct category names from fixture rows after Summary has moved to persisted rows.

## Release Demo Script

Use this script before calling Release 1 complete.

1. Sign into a connected-spend account.
2. Open Shopping settings.
3. Confirm Shopping starts as `🛒 Shopping`.
4. Rename Shopping to another emoji-bearing name, such as `🛍 Family shopping`.
5. Change monthly amount from `$100` to `$125`.
6. Toggle rollover off, save, then toggle it on again.
7. Return to Category Detail.
8. Open Summary.
9. Open Transactions and inspect the category picker.
10. Restart the app.
11. Refresh connected spend.
12. Confirm Category Detail, Settings, Summary, Transactions picker, and widgets all show the same category name and amount.

Pass condition: every surface agrees after restart and refresh.

Fail condition: any surface drops the emoji, shows plain `Shopping`, shows the old amount, creates a duplicate category, or shows local-only edited state.

## Verification Commands

Run these before Release 1 is considered shippable:

```bash
npm run test
npm run lint
npm run test:forecast
npm run job-delivery:check
```

Expected current outputs:

- `npm run test`: Vitest completes with category repository and connected snapshot tests passing.
- `npm run lint`: TypeScript completes with no errors.
- `npm run test:forecast`: forecast smoke completes with no thrown assertion.
- `npm run job-delivery:check`: job-delivery checker reports `ok`.

If the migration/RLS script has landed, also run:

```bash
npm run supabase:migrations:test
```

Expected outputs:

- `npm run supabase:migrations:test`: owner, household, and unrelated-user RLS probes pass.

## What This Does Not Solve Yet

- It does not normalize every transaction assignment from text `budget_id` to UUID `category_id`.
- It does not add full historical budget-plan audit.
- It does not redesign category settings.
- It does not sync Apple Screen Time token selections across devices.
- It does not complete the canonical `BudgetSnapshot` projector work, but it gives that work durable product inputs.

## PM Check Before Implementation

Andrew should confirm or change these three release choices:

1. Prioritize reliable current settings first, with full plan history later.
2. Generate starter categories from existing signed-in users' transaction history; use generic defaults only when transaction evidence is unavailable.
3. Let household members read shared categories in Release 1, but keep editing owner-only until shared editing is designed.

Recommended answer for all three is yes.
