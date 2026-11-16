# Food MCP weekly execution and rollout evidence

PR #198 reconstructed the lost Food MCP patch. The October 31 completion below
repairs its production prerequisites and adds ordinary private recipe execution.
Deployment and family-data writes were explicitly authorized for this workflow.
Historical test counts from the lost patch are not evidence for this release.

## Behavior

- Opaque MCP OAuth tokens continue to be verified by the existing connector.
  Narrow service-only SQL bridges establish that verified permanent actor for
  canonical food readers and writers. They do not mint user JWTs or make actor
  impersonation available to authenticated/anonymous database clients.
- Recipe search/read/planning uses the paginated hosted canonical catalog, with
  no offline or partially fetched fallback. Reviewed private recipe creation and
  updates execute directly; publication and deletion retain separate pipelines.
- `kwilt_meal_cart_ensure`, `kwilt_meal_cart_add`, `kwilt_meal_cart_mark_made`,
  `kwilt_meal_cart_remove`, and `kwilt_meal_history_read` expose an ongoing
  open-horizon cart. Retiring a meal preserves its history and recipe definition;
  removing a sent meal recompiles its grocery contributions through canonical
  authority, retaining the prior list as history and preserving manual items.
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
- Production migration, authenticated MCP writes and the native shared-cart
  projection were verified on October 31. This is backend/readback evidence,
  not physical-device screen verification or a new native binary release.
- Existing canonical grocery permissions are preserved: household members can
  check off shared items, while quantity corrections remain limited to the list
  owner. The actor bridge does not silently elevate another caregiver's rights.
- SQL fixtures distinguish isolated PostgreSQL behavior from complete-schema
  migration, RLS, and multi-connection concurrency proof. Those release gates
  remain required before deployment.
- No catalog publication or grocery purchase is performed by this work. The
  original meal-plan document remains the source for cooking/lunch instructions.

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

## October 31 weekly workflow completion

The production database had not received the Food conversational foundation or
PR #198 actor migration. Schema-only reproduction exposed failures hidden by the
isolated SQL fixture: service-role access to auth.users, a retired public cart
helper, missing service function grants, and an absent grocery-source created_at
column. The forward repair is `20261031185405_weekly_food_external_completion.sql`.
It uses a private boolean account predicate rather than granting auth.users reads.

Reviewed private `recipes.create` and `recipes.update` now execute through the
canonical equipment-aware recipe writer and return durable recipe receipts.
Text-authored versions retain the canonical `review_required` scaling default;
calling a batch six portions does not manufacture verified scaling. Candidate
add/remove aliases support the ongoing open cart, allow reuse after historical
occurrences, refuse known undersized batches, and recompile groceries when a sent
meal is removed. Source recipes, retired occurrences and manual groceries remain.
The private recipe query names the recipe-parent foreign key explicitly because
PostgREST also sees the reverse current-version relationship.

Production deployment applies the missing foundation
`20260827221500_food_conversational_control.sql`, the actor migration
`20261026021448_external_food_actor_execution.sql`, and the forward repair together
in one transaction. The transactional release was initially recorded as `weekly_food_external_completion`;
the release record tracks reconciliation to the three source migration versions. Catalog
import/image changes are outside this release. The MCP bundle preserves the two
previously deployed Money sources (`serverMoneyTools.ts` and `categoryFunding.ts`)
so this Food deployment does not release unrelated Money changes from main.

Verification: schema-only PostgreSQL reproduction uses actual production public
functions, tables, constraints, policies, triggers and grants, with synthetic auth
fixtures; it is not a complete historical migration replay. Run the rollback-only
`supabase/tests/weekly_food_external_completion.sql` after the prerequisite and
repair migrations. It exercises real planner recipe fields, retry receipts,
household candidate addition, grocery provenance, manual-item preservation and
removal. Focused Jest regressions cover the executor and compiler, and the Deno
weekly-reuse regression covers the alias batch guard. Both repository verification
gates also run. The larger serverFoodTools Deno file has a pre-existing unrelated
native-handoff assertion failure, reproduced unchanged on the base revision;
its other cases and the new regression pass. The public-data-api grant regression
script belongs to a separate pending branch and is absent from this main baseline;
the repair creates no public tables and explicitly limits prerequisite receipt ACLs.

Live completion requires authenticated MCP recipe creation, plan replacement,
grocery compilation and readback, not just successful deployment. Reconcile
carryover ingredients and package rounding in the grocery list after compilation;
the compiler does not infer that one recipe supplies cooked leftovers to another.
Keep newly purchased quantities separate from pantry assumptions. A scheduled
refresh must verify receipts and the final list before reporting success.


Live evidence on October 31: MCP version 82, bundle hash
`14dab0eec662cc14274c40fb78f16ff5b4f1912eaa4cf7a52d1be6443ddf36bf`.
Authenticated MCP saved eight ordinary private recipes, retired nine old active
occurrences, added eight six-portion entries, compiled groceries and read back the
reconciled list. The authenticated native shared-cart RPC returns those eight
entries and the same grocery-list ID. Household serving preference is six.
Planner receipt data and shopping contents are stored privately outside the repo.
The weekly thread automation is configured for Friday at 16:00 America/Denver;
configuration is verified, but its first future scheduled run has not occurred.
