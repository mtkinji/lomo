# Food MCP rebuild — review and rollout boundary

This is a fresh reconstruction against `8336ada62484618204115fe244e6645a553ea36b`.
The earlier temporary patch was lost. Its historical test counts are **not** evidence
for this branch. Nothing in this branch authorizes deployment, live permission
changes, recipe publication, or changes to PR #197.

## Behavior

- Opaque MCP OAuth tokens continue to be verified by the existing connector.
  Narrow service-only SQL bridges establish that verified permanent actor for
  canonical food readers and writers. They do not mint user JWTs or make actor
  impersonation available to authenticated/anonymous database clients.
- Recipe search/read/planning uses the paginated hosted canonical catalog, with
  no offline or partially fetched fallback. Generic recipe CRUD/publication is
  not added to the external direct executor.
- `kwilt_meal_cart_ensure`, `kwilt_meal_cart_add`, `kwilt_meal_cart_mark_made`,
  `kwilt_meal_cart_remove`, and `kwilt_meal_history_read` expose an ongoing
  open-horizon cart. Retiring a meal preserves its history and recipe definition;
  sent groceries are retained rather than silently deleted.
- History includes active candidates, occurrence timing, current grocery-list
  identity/revision, current plan version, and
  historical candidates so another conversation can continue without replacing
  family choices. Grocery writes require the current revision.
- Compilation uses the existing grocery compiler and database authority.
  Manual items and unambiguous corrections survive recompilation; ambiguous or
  changed quantities require visible conflict review. Request receipts support
  replay after target changes and reject reused keys with different arguments.
- Scaling is an explicit reviewed 1×/2×/3× choice, not inferred from household
  size. Fixed ingredients remain fixed. Legacy scaled snapshots missing reviewed
  per-ingredient scale rules fail closed until reviewed/rebuilt; 1× is unchanged.
- The governed catalog importer retains reviewed parsing fields and creates new
  immutable versions for repairs. It does not publish any recipes by itself.

## Important limits

- The new cart tools are external/server tools, not a claim of native Chat/phone
  feature parity. Timing is retained and readable in the canonical cart data;
  native timing display has not been implemented or device-verified here.
- Existing hosted `get_kwilt_agent_food_control_snapshot` availability and backend
  deployment remain separate prerequisites. Local code is not a successful live
  household migration or a verified mobile shopping experience.
- Existing canonical grocery permissions are preserved: household members can
  check off shared items, while quantity corrections remain limited to the list
  owner. The actor bridge does not silently elevate another caregiver's rights.
- SQL fixtures distinguish isolated PostgreSQL behavior from complete-schema
  migration, RLS, and multi-connection concurrency proof. Those release gates
  remain required before deployment.
- No forty-meal catalog publication, grocery purchase, merge, or deployment is
  performed by this work. The existing meal-plan document remains the fallback.

## Verification procedure

Use Node 22 and Deno. The repository's task/integration gates remain authoritative:

```sh
NODE_OPTIONS=--max-old-space-size=6144 npm run verify:local -- --run
NODE_OPTIONS=--max-old-space-size=6144 npm run verify:changed -- --run
```

Focused tests cover actor routing, durable execution receipt projection, cart
authority and lifecycle, canonical catalog pagination, grocery preservation and
scaling, and importer field retention. A full gate is not replaced by focused
passes. The review package records exact commands, final results and blocked
checks; do not reuse a result after its source inputs change.

The isolated SQL runtime harness can run without modifying app dependencies:

```sh
npm install --prefix /tmp/kwilt-sql-tools @electric-sql/pglite@0.3.14
KWILT_PGLITE_MODULE=/tmp/kwilt-sql-tools/node_modules/@electric-sql/pglite/dist/index.js \
  node supabase/tests/external_food_actor_unit.mjs
```

This fixture loads selected canonical functions and minimal supporting schema;
some authorization/projection dependencies are explicit stubs. It is useful for
PL/pgSQL execution and regression checks, **not** a complete migration/RLS or
multi-client concurrency certification. The rollback-only SQL files must also be
run against a complete disposable Supabase schema before backend deployment.
