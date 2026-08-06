# Household Food backend preflight

Recorded: 2026-08-05

## Target and source state

- Checkout: `/Users/andrewwatanabe/Kwilt/.worktrees/household-food-ai-exploration`
- Branch: `codex/household-food-ai-exploration`
- HEAD before implementation: `f7e852897144aac58e666dc1bb1c81681d92b419`
- Worktree: dirty with the existing Household Food implementation and documentation changes; no unrelated changes were staged or discarded.
- Supabase CLI: `2.90.0` (the CLI reported `2.111.0` available).
- Local config: `supabase/config.toml`, project id `Kwilt`, Postgres major version 17.
- Remote project ref: **not configured in this worktree**. `supabase/.temp/project-ref` is absent and `supabase migration list` stops with “Cannot find project ref. Have you run supabase link?”.
- Remote action performed: none.

## Migration identity

| Migration | SHA-256 |
| --- | --- |
| `20260806010000_private_recipes.sql` | `787e4f2fab5d9e13acd1ff650d4d8bbba2b9f90833019f3ac4c0944c8254a701` |
| `20260806020000_meal_planning.sql` | `555d9b6bc27c99069b5bab368c3beef29970eac1453e7c690f38d0ea061a976c` |
| `20260806030000_groceries.sql` | `ee56437955f789a9c13c767a6a692f65593698108822053e1901ca07cf685adc` |
| `20260806040000_recipe_cook_sessions.sql` | `262b8c9589ba35954ba1d91d093d6a07dea6c26751e559afd2d65b26bb3dd21e` |
| `20260806050000_food_thrift_foundation.sql` | `d124da6cfad0d3aa6bf222877962a97657d00bb9fcb3c3aae6cbb9a9932183ba` |
| `20260806060000_grocery_savings.sql` | `5923df93a6e19602a0366aa5c597cde6456a87cca2a45e23e6b33863cbf8dea5` |

These hashes were refreshed after the source-level idempotency reconciliation;
re-run `shasum -a 256` before any later apply because the migrations remain under
active implementation.

## Static schema and repository reconciliation

The six migrations define 35 Food tables across Recipe/import, Meal Planning/choice, Grocery/handoff, Cook sessions, thrift/stock/scenarios, and savings evidence. Every application table enables RLS. Client repositories read the same table names and call the same RPC names and parameter shapes declared by the migrations:

- Recipes: `save_kwilt_recipe` and `delete_kwilt_recipe`.
- Meal Planning: create/update/open/projection/submit/withdraw/close/finalize/revise RPCs.
- Groceries: list/item mutation RPCs, with `grocery-compile` and `grocery-handoff` Edge Function entry points.

The repository contract suite passes. The static review also found two deliberate proof gaps:

- The Meal Planning migration now adds plan, round, participant, and response tables to `supabase_realtime` through a guarded publication block. Live cross-device behavior remains unproven until migration application and signed-account proof exist.
- Recipe import artifacts now have a private bucket and owner-scoped object policies in source. Because the migration has not been applied, remote private-media readiness remains unproven; the import path also still requires explicit review before it creates a Recipe.

## Local database proof

`supabase status` and `supabase db reset` cannot run because the Docker daemon is unavailable at `/var/run/docker.sock`. Consequently, migration application, pgTAP happy paths, and cross-account denial paths are **not proven in this environment**. Source tests are not a substitute for this gate.

When Docker is available, run from this exact worktree:

```bash
supabase db reset
supabase test db
npm test -- --runInBand src/capabilities/recipes/data/recipeRepository.test.ts src/capabilities/meal-planning/data/mealPlanningRepository.test.ts src/capabilities/groceries/data/groceryRepository.test.ts
```

## Remote proof and apply boundary

G0 is `blocked_external`: there is no selected remote project to inspect, and no authorization to deploy Food schema. Local fixture, domain, repository, and UI implementation may continue, but it must be described as source-level/local proof rather than integrated backend proof.

After Andrew selects and authorizes the intended project, first link and inspect it read-only. Only then produce a reviewed apply command using that explicit project reference. No copy-pasteable remote apply command is included now because guessing a target would be unsafe.
