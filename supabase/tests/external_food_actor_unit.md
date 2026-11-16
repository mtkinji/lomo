# External food SQL unit harness

This isolated PostgreSQL/PGlite harness executes the new migration and real canonical routines for meal creation/update, shared nominations, personal grocery compilation, manual grocery edits, and their receipts. Its minimal schema and actor-checking catalog/snapshot stubs are explicit in `fixtures/external_food_unit_schema.sql`. Its hash stub is deterministic, not cryptographic verification.

It does **not** validate the complete migration chain, production RLS policies, native UI, hosted OAuth, real concurrent transactions, household hard-pass workflows, or finalization/rebase integration. Those remain separate backend release gates. Never run this fixture against an existing database.

Reproduce without modifying app dependencies, from the repository root (Node 22):

```sh
mkdir -p /tmp/kwilt-food-sql-unit
npm install --prefix /tmp/kwilt-food-sql-unit --no-save --no-package-lock @electric-sql/pglite@0.5.11
KWILT_PGLITE_MODULE=/tmp/kwilt-food-sql-unit/node_modules/@electric-sql/pglite/dist/index.js \
  node supabase/tests/external_food_actor_unit.mjs
```

The standalone `external_food_actor_execution.sql` file tests grants and rejected actor calls after a complete local Supabase migration chain. Its transaction rolls back; it is not a substitute for the unit harness or the complete integration gate.

Coverage: missing/anonymous/banned/deleted actors, service-only entry points, restored claims on success and failure, personal/shared ensure, old open versus newer bounded drafts, stale versions, request replay and changed-argument conflict, forbidden households, append/retire/history without deleting recipes, current-cart/list discovery, canonical manual add/edit/state, source-quantity-change warnings, ambiguous correction merges, state-only correction quantity preservation, and manual-line preservation during recompilation.
