# Production account-deletion backend deployment — September 3, 2026

## Proof boundary

This record proves that the account-deletion database contract and both Edge
Functions were deployed to the production Supabase project, that required
secret names and storage buckets exist, and that unauthenticated requests are
rejected. It does not prove a successful destructive deletion, external
provider revocation, Apple token revocation, or post-deletion absence of every
user-owned row.

## Source and deployment

- Repository: `https://github.com/mtkinji/lomo.git`.
- Deployment-wiring commits: `d9792e0c` and `8bcd9385`, pushed to `main`.
- Production project: `sqxwjtorodqjdfnuvprf`.
- Applied migration: `20260903230301_account_deletion_integrity`.
- `account-delete`: version 23; deployment
  `ffc5ade2-cc48-4fab-92a3-595813987c0a`; SHA-256
  `caee98cf1610d92ebadf263f00eb52b818d115643e7e1079135407e3951ac768`.
- `account-deletion-token-register`: version 1; deployment
  `d2f73f06-24a4-4ce4-98d4-0ea75541d18b`; SHA-256
  `97b43c6747e657052b932ae605d73fa75dc0d09b1ce198a3477e751b329a7c0f`.

## Runtime configuration

The production secret inventory contains these names; no values were read or
recorded:

- `ACCOUNT_DELETION_HASH_SECRET`
- `ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET`
- `APPLE_AUTH_CLIENT_ID`
- `APPLE_AUTH_CLIENT_SECRET`
- `CALENDAR_TOKEN_SECRET`
- `REVENUECAT_SECRET_API_KEY`

The protected `production-auth` workflow initialized missing deletion secrets
without replacing existing encryption material and synchronized the Apple
client secret. Successful run:
<https://github.com/mtkinji/lomo/actions/runs/33816318153>.

## Verification

- Both function entry points returned HTTP 401 to unauthenticated POSTs.
- Both functions use internal `auth.getUser` validation before privileged work;
  gateway JWT verification is therefore intentionally disabled.
- `prepare_kwilt_account_deletion` and the deletion operation/provider-token
  tables exist in production.
- Anonymous and authenticated roles cannot execute the deletion RPC;
  `service_role` can.
- The scalar successor reassignment fix is present and the prior composite-row
  bug pattern is absent.
- The prune schedule has one registered job.
- Storage buckets `activity_attachments`, `hero_images`, `household-avatars`,
  and `recipe-import-artifacts` exist.
- The production security advisor was inspected but is not globally clean. Its
  no-policy notices for the service-only deletion tables are expected because
  client grants are revoked; unrelated pre-existing findings remain tracked
  separately.

## Remaining runtime evidence

- Complete the irreversible deletion of an authorized disposable account, then
  verify auth, Kwilt rows, storage objects, and sessions are absent.
- Use separate sandbox-connected fixtures to verify provider-token and external
  provider cleanup. The existing Simulator fixture has no connected providers
  and cannot prove that matrix.
