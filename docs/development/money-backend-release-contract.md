# Money backend release contract

The supported TestFlight commands run a read-only target-backend check after protected verification and the full coverage suite, before EAS build/auto-submit:

```sh
npm run money:verify-backend -- --profile testflight-widgets
```

`ios:testflight:no-widgets` checks `testflight`. The same contract can be checked directly for `production` and `production-widgets`. A missing credential, unreachable service, invalid response, different target, missing object, unexpected implementation or incorrect permission stops the command. The checker does not migrate the database or retry a write. Direct ad hoc EAS commands are outside this supported release wrapper.

## Target and credentials

The contract in `scripts/money/backend-contract.mjs` is bound to Kwilt project `sqxwjtorodqjdfnuvprf` and `https://auth.kwilt.app`. EAS profile inheritance is resolved, then the actual Expo configuration is evaluated in a child process. Only its backend URL is returned; other configuration values and credentials are not printed. Store profiles also validate their backend after dotenv loading in `app.config.ts`, and `.easignore` excludes all `.env*` files so an uploaded environment variant cannot silently change the remote build's target. Profile configuration and EAS-managed environment values supply release configuration.

For a local check, provide `SUPABASE_ACCESS_TOKEN` through the process environment. CI reads the GitHub secret `SUPABASE_RELEASE_READ_TOKEN`. Use a Supabase personal access token scoped to this project with **Database Read** and **Custom Domain Read** permissions. Do not use a service-role app key; this is the Management API. The task implementing this gate did not provision or save a token, and no local token was available for an end-to-end CLI request. Missing setup blocks release rather than skipping the check.

The transport uses Supabase's [read-only query endpoint](https://supabase.com/docs/reference/api/v1-read-only-query) and [custom hostname configuration endpoint](https://supabase.com/docs/reference/api/v1-get-hostname-config). Requests go only to `api.supabase.com`, reject redirects, have bounded timeouts, and suppress response bodies on errors. These endpoints are documented as beta; an incompatible API response fails closed.

## What is verified

- Required category, plan and private receipt columns with their types.
- Exact source-body hashes, signatures, argument names/default counts, return types, security mode, language and fixed search paths for atomic settings, receipt lookup, promotion/reversal, rollover and household-owner dependencies. Expected bodies come from the named source migrations, not from migration-history names.
- Authenticated execution of command and household helpers, required schema access, and denied API access to the private receipt table and promotion helper.
- Required read grants and RLS flags, household/owner read-policy expressions, and absence of additional permissive read policies on the two preview settings tables.
- The validated rollover constraint and enabled before-row insert/update history trigger.

A successful CLI response records the contract hash, project, origin, profile, observation time, check count, source HEAD and dirty state. It is catalog evidence for that source contract, not an IPA identity or a durable promise that the backend cannot later change. Re-run for the release candidate. Changes to required SQL behavior must update the contract's source references and pass the local fixtures before deployment approval.

## Verification and proof limits

```sh
node --test scripts/money/backend-contract.test.mjs scripts/ios-testflight-contract.test.mjs scripts/eas-upload-policy.test.mjs
python3 scripts/money/verify-category-settings-postgres.py --pg-bin /opt/homebrew/opt/postgresql@17/bin
```

The isolated PostgreSQL runner also executes `supabase/tests/category_rollover_schema_contract.sql`. It checks the good schema, then separately rolls back each deliberate break: missing rollover column, receipt column or RPC; missing command/helper permissions; changed RPC code; missing household policy; and broader owner/extra read policies. The shell regression proves an incompatible backend prevents invoking the EAS build command. Integration verification selects these tests when this gate or the relevant migrations change.

The live query reads system catalogs only; it does not read household records or invoke save functions. It does not prove PostgREST's current schema cache, authenticated API round trips, native gestures, installed app persistence, or end-user latency. Those remain separate deployment/native acceptance gates. The isolated database uses real relevant migrations plus explicitly documented JWT/category-read fixtures; it is not a full Supabase replay.

The isolated runner supplies minimal authenticated SELECT privileges on the legacy household tables directly, just as it supplies category/plan read fixtures. It does not require the separate, unmerged full-replay grant-baseline migration from PR #197. Actual household RLS and actor-denial tests remain in place. This fixture correction changes no deployed privileges.

On November 1 the live catalog query correctly found the original rollover schema repaired while rejecting the new, undeployed atomic settings functions and household preview policies. Neither new migration was deployed by implementing this checker. A green local test suite cannot override that failed target result.
