# Explicit Supabase Data API grants

Supabase's October 20, 2026 email, “Final notice: new tables in "public" need
grants from October 30,” announces a change to defaults, not a report of leaked
data. Existing tables retain their permissions. New tables, including tables
recreated by resets, preview branches, and new-project migration replay, need
explicit grants for Data API access.

Source: [Supabase announcement](https://github.com/orgs/supabase/discussions/45329).
Grants and RLS are separate:
[securing the Data API](https://supabase.com/docs/guides/api/securing-your-api).

## Review on October 20

Read-only checks found RLS enabled on all ordinary public tables in Kwilt (285),
Orchard (44), and Have a Go (20). This is a narrow check, not a complete security
audit or a claim that every policy is correct.

Kwilt still has automatic default table grants. Older migrations rely on those
defaults. Its `kwilt_friend_invite_preview_budgets` table intentionally denies
direct access even to `service_role`; callers use the protected RPC. Have a Go's
`review_host_responses` has explicit client SELECT grants and uses a privileged
RPC for writes; lack of service-role SELECT alone is not an outage.

## Kwilt replay repair

`20261020145812_explicit_public_data_api_grants.sql` adds a fixed set of explicit
grants for existing Kwilt-owned tables, its server alert view, and four identity
sequences. It does not alter defaults, policies, rows, or revoke existing access.
Every grant is a subset of privileges observed on the hosted project.

Client grants are restricted to operations with applicable existing RLS policies
and existing role privileges. Service grants retain existing DML privileges.
Sequence grants are limited to service-role USAGE and SELECT. The friend-invite
budget remains RPC-only. The migration does not modify Journal/Stories objects,
whose migrations are owned by the separate Journal repository.

Eight conversational/food receipt tables present in local migrations were absent
from the live project. Their creation migrations already declare client grants.
The six food receipt tables use SECURITY DEFINER RPCs for writes. The two
conversational receipt/handoff tables also have direct server Data API callers:
their creation migration now explicitly grants service-role SELECT/INSERT/UPDATE.
This task does not deploy those unrelated tables or reconcile that schema drift.

New migrations must declare their own per-role access alongside table creation.
Use explicit REVOKE for roles that should have no direct access. Never copy the
email's example grants indiscriminately onto private tables.

## Verification and limits

- The focused regression failed before the baseline and passed after it.
- Temporary PostgreSQL objects in a transaction reproduced the new default:
  **0 of 1,333 required privilege checks passed** before explicit grants, and
  **1,333 of 1,333 passed** after executing the baseline against those objects.
  Both transactions rolled back. No real application table or data was changed.
- The initial transaction fixture checks grant syntax and role permissions.
  The subsequent full replay below adds historical migration coverage; neither
  proves authenticated app journeys or the correctness of all RLS.
- Hosted permissions already satisfy the baseline. No live permission change is
  needed for the October 30 transition. The migration is a local replay repair;
  it has not been applied to hosted migration history.
- Cross-repository replay results are recorded below; no hosted database was changed.

Run the focused guard with:

```sh
node --test scripts/public-data-api-grants.test.mjs
```

The guard also requires future literal `CREATE TABLE public.<name>` migrations
to declare grants or revokes for all three API roles. Dynamically generated DDL
and quoted identifiers require manual review.

## Full replay follow-up (October 20)

A disposable PostgreSQL 17.6.1.106 Supabase container, with no network or
published ports and cron execution disabled, replayed **all 263 Kwilt migrations**
from empty application storage. Supabase auth/storage/realtime schema definitions
came from the existing local development service (schema only, no user data).
Automatic public table/sequence API grants were removed before replay; a new
probe table confirmed no SELECT privilege for anon, authenticated, or service_role.
After replay, **1,333/1,333 baseline privilege assertions passed**.

Replay uncovered two historical ordering defects, repaired without renumbering
migration ledger entries:

- January's admin-summary replacement changes its return shape, so it must drop
  the previous signature before recreating it (as subsequent repairs already do).
- July's transaction-review DDL referenced a table created three days later.
  Its statements now run at the end of the transaction foundation migration;
  the earlier version remains as an explanatory no-op.

These repairs cover fresh replay, not arbitrary partially applied histories.
The grant contract now runs in CI and in the verification planner for SQL-only
migration changes. The planner regression was observed failing before wiring it
and passing afterward.

Cross-repository checks in the same isolated server:

| Source | Replay | Result |
| --- | --- | --- |
| Journal | 58 migrations after full Kwilt baseline | Passed; shares Kwilt dependencies |
| Orchard | 33 migrations into a separate empty database | Passed; feedback UPDATE is intentionally column-scoped |
| Have a Go | 137 migrations from the active checkout into a separate empty database | Passed, including a new narrow server-role grant repair |

Have a Go's `paid-checkout` and `local-fictional-listing` use direct service-role
queries. Its repair grants only the required SELECT columns on sessions and
experiences and UPDATE on experiences.is_fictional. The equivalent rollback-only
SQL test failed before the repair and passed after it. That checkout contains
concurrent unrelated work; its replay is a checkout observation, not proof of
its committed main or deployed state.

### Broader SQL regression findings (merge remains blocked)

Of 18 Kwilt SQL regression files, 13 passed (including two rerun after recovery).
Five remain unresolved and are outside the grant repair:

- `global_recipe_catalog_foundation.sql`: reproducible PostgreSQL backend signal
  11 during its first Cook/catalog assertion block on this image. No production
  reproduction was attempted; cause is not yet established.
- `contextual_ugc_safety.sql`: assumes moderation-table SELECT returns zero rows,
  but the table intentionally denies authenticated SELECT entirely.
- `plaid_lifecycle.sql`: requires a preexisting auth user; empty replay has none.
- `shared_home_deliveries.sql`: shared contact trigger references an invite-only
  record field on a delivery record.
- `unified_chat_trust_contract.sql`: fixture omits required agent-run trigger_id.

No permissions were broadened to make these tests pass. Do not treat migration
replay or the JavaScript gate as resolution of these SQL failures. Investigate
the crash and contact trigger, refresh the fixtures, and rerun the affected
SQL tests before merging this branch.
