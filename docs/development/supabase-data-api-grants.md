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
- This checks grant syntax and role permissions, not complete historical
  migration replay, authenticated app journeys, or the correctness of all RLS.
- Hosted permissions already satisfy the baseline. No live permission change is
  needed for the October 30 transition. The migration is a local replay repair;
  it has not been applied to hosted migration history.
- Orchard, Have a Go, and Journal migration-replay readiness was not repaired or
  exhaustively verified in this Kwilt checkout.

Run the focused guard with:

```sh
node --test scripts/public-data-api-grants.test.mjs
```

The guard also requires future literal `CREATE TABLE public.<name>` migrations
to declare grants or revokes for all three API roles. Dynamically generated DDL
and quoted identifiers require manual review.
