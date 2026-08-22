# Canonical Money Categories v2 Implementation Plan

> **Execution note:** Follow the repository's pragmatic TDD posture: prove the pure category policy and additive migration contract before implementing them.

**Goal:** Give new Money households one intelligible canonical category system, automatically assign supported transactions into it, and activate `Work & business` only when high-confidence evidence makes it relevant.

**Architecture:** Version the existing governed category policy rather than adding a parallel taxonomy. New zero-category households receive a stable core set; conditional categories are additive. Existing household categories, rules, corrections, plans, names, and structure remain authoritative. The server-owned reconciliation function creates categories and assignments, while the shared pure policy keeps app and test expectations explicit.

**Tech stack:** TypeScript/Jest, Supabase Postgres migrations, Deno shared classifier tests, Expo React Native.

---

## Task 1: Lock the product contract

- Update the governed Money feature brief with the accepted core vocabulary, conditional activation rule, and existing-household preservation rule.
- Resolve the open vocabulary question while retaining Sandbox/dogfood calibration as a proof gate.

## Task 2: Specify the v2 pure policy

- Extend `governedCategoryPolicy.test.ts` with the canonical core set, conditional `Work & business`, and grocery/dining/business assignment examples.
- Extend the shared Deno classifier test with mapping-tag examples for groceries, dining, and work/business.
- Run the focused tests and confirm they fail for the intended missing v2 behavior.

## Task 3: Implement the v2 pure policy

- Version the policy as `governed-category-v2`.
- Model category activation as `core` or `conditional`, with `Work & business` initially conditional.
- Keep user authority and assignment precedence unchanged while refining provider mappings.
- Run the focused Jest and Deno tests.

## Task 4: Add the additive server migration

- Create the migration with `supabase migration new canonical_money_categories_v2`.
- Replace the service-only reconciliation function so zero-category users receive the v2 core set.
- Create `Work & business` only when high-confidence business evidence exists; also recognize an existing startup/business category through mapping tags without renaming it.
- Preserve all existing categories and governed transaction decisions.
- Add static migration assertions for the vocabulary, conditional activation, preservation boundary, and service-only execution grants.

## Task 5: Verify the completed slice

- Run the focused policy, migration, and shared Deno tests.
- Run `npm run verify:changed -- --run` once after the implementation diff is final.
- Report code/test proof separately from authenticated Sandbox, Simulator, signed-device, and repeated-use proof.
