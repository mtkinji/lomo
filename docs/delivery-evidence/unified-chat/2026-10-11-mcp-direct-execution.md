# MCP execution stays in the originating conversation

The external MCP adapter no longer persists mobile review proposals or device
handoff tasks. Canonical validation produces an in-memory plan. Supported Life
operations apply atomically with a durable receipt; existing server-owned executors
continue to execute. Mobile-only providers return unavailable, without a review task.
This is not complete server execution parity for the entire advertised catalog.

## Deployment

- Checkout: `/Users/andrewwatanabe/Kwilt`, branch `main`, base `399e26e3`, dirty.
- Deployed only MCP and the additive receipt migration. No mobile release, commit or push.
- Supabase project: `sqxwjtorodqjdfnuvprf`; MCP version **80**, active.
- Bundle SHA-256: `5b889c446b1647fc0bbafb016cfc53e3721392d0d950ef5f783f574eb48becf7`.
- Migration: `20261012051853_external_mcp_direct_execution.sql`. Local filename
  matches the version assigned by the hosted migration API; SQL bytes unchanged.
- Existing MCP OAuth authentication and `verify_jwt=false` custom-auth configuration
  preserved. CLI deployment failed with an invalid access token; authenticated
  Supabase connector deployment succeeded. No credentials were exposed.

## Verification

- Scoped `verify:local`: passed; 16 selected files, 35 unrelated changed files omitted.
- Uncached `verify:changed -- --run`: passed, including 230 Jest suites / 1,673 tests
  (2 skipped), Deno checks and tests, product checks and architecture checks.
- Focused MCP Jest regression run: 6 suites / 132 tests, 1 snapshot passed.
- Deno entrypoint check passed with `--unstable-sloppy-imports`; an existing
  extensionless type import in Money prevents plain Deno check. Hosted bundling succeeded.
- Disposable local PostgreSQL test database: atomic rollback, stale-version refusal,
  owner isolation, operation contract, duplicate prevention, soft-delete cascades,
  recovery snapshots, step completion, Arc identity preservation, service-role ACLs.
  Separate legacy fixtures confirmed pending-proposal supersession and refusal to
  repeat already-applied proposals. This fixture database is not a full app-schema test.
- Live schema/ACL readback: RPC installed, RLS enabled, authenticated users cannot
  execute the service RPC or select private receipts. The advisor's informational
  [RLS-without-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  is intentional: this table is service-only with no user grants.
- Live authenticated MCP: requested Goal creation returned completed, a receipt, and
  null confirmation/handoff. Owner-scoped readback found the Goal; SQL readback
  confirmed target date `2027-01-11` and the previous pending proposal superseded.
  Identical retry returned the same receipt and object with `idempotent_replay=true`.
- These live calls verify the authenticated write/read/retry path. The OAuth
  registration/token lifecycle was not rerun; its implementation did not change.

The earlier New goal button restoration remains a local mobile change. The passing
screen regression is not evidence of a physical-device or TestFlight release.
