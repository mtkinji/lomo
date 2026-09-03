# Account deletion verification runbook

Account deletion is destructive. Run this matrix first against a non-production
Supabase project, then against one deliberately disposable account on the exact
signed App Store candidate. Source tests are not a substitute for either run.

## Preconditions

- Record branch, commit, dirty state, app version/build, EAS build ID, Supabase
  project ref, migration version, Edge Function deployment ID, device, OS, and
  timestamp.
- Use a newly created account explicitly labeled disposable. Never use a
  founder, reviewer, employee, family, or customer account.
- Populate `KWILT_ACCOUNT_DELETION_PROTECTED_USER_IDS` with every known protected
  account ID. Keep all IDs, access tokens, service keys, emails, phone numbers,
  financial values, Storage paths, and content out of captured evidence.
- Exercise only provider sandbox/test connections in non-production.
- Configure `ACCOUNT_DELETION_HASH_SECRET`,
  `ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET`, `APPLE_AUTH_CLIENT_ID`,
  `APPLE_AUTH_CLIENT_SECRET`, `CALENDAR_TOKEN_SECRET`, and the other server-side provider secrets,
  including `REVENUECAT_SECRET_API_KEY`; missing required secrets fail closed.

## Fixture matrix

Create separate disposable fixtures for:

1. A non-owner caregiver in a two-caregiver Household with children.
2. The owner caregiver in a two-caregiver Household with children.
3. The only authenticated adult in a Household with children.
4. A standalone adult with Planning, Chat, Chapters, attachments, private and
   shared Recipes, Meal Plans, Grocery data, Explore history, feedback, Friends,
   shared goals, games, and notifications.
5. Every enabled external connection: Plaid, Google Calendar, Microsoft
   Calendar, Kroger, connected OAuth tools, Phone Agent, RevenueCat, and Sign in
   with Apple.

For each fixture, confirm the successor is another active authenticated adult,
never a child or unauthenticated person. Confirm the departing membership is
removed, retained shared authorship says `Former member`, private person-owned
rows are absent, and a sole-adult Household is absent. Confirm the surviving
caregiver and children can still open retained shared Household data.

## Automated destructive check

Set the required environment variables in the shell without printing them, then
run:

```bash
npm run verify:account-deletion:destructive
```

For local database verification, start Docker Desktop, reset the local project,
then run the rollback-only SQL suite (including
`supabase/tests/account_deletion_integrity.sql`) with `supabase test db`.

The script refuses to run unless
`KWILT_ALLOW_DESTRUCTIVE_ACCOUNT_DELETION_TEST=1` and
`KWILT_ACCOUNT_DELETION_TEST_USER_CONFIRMATION=disposable`. It validates the
target project ref, deletes the account, checks Auth and direct user-owned rows,
checks the redacted receipt, and emits only salted hashes, counts, stage names,
and a timestamp.

## Manual provider and device checks

- Confirm Plaid Item removal, OAuth/Kroger credential removal, Calendar access
  removal, connected-tool revocation, Phone Agent delivery stop, push-token
  removal, and RevenueCat customer deletion in their provider dashboards or
  sandbox APIs.
- Confirm new Sign in with Apple sessions escrow an encrypted provider refresh
  token through `account-deletion-token-register` and deletion calls Apple's
  revocation endpoint before removing that token. For legacy Apple accounts
  without a server-held revocable token, confirm Kwilt gives post-deletion Apple
  access-removal guidance and does not block deletion.
- Confirm every user-owned Storage prefix is empty: Activity attachments, hero
  images, account avatar, and Recipe import artifacts. Confirm retained
  dependent avatars remain only when another caregiver's Household survives.
- On a second signed-in device, confirm refresh sessions no longer work. Access
  JWTs may remain valid until expiry, so verify sensitive functions call
  server-side `auth.getUser(jwt)`.
- On the deleting device, confirm account caches, SecureStore child access,
  notifications, background tasks, RevenueCat/PostHog identity, Realtime, and
  in-memory stores are cleared while install ID, analytics consent, theme, and
  device preferences survive.
- Repeat the same operation ID and confirm a terminal success. Start a competing
  operation ID and confirm `409 deletion_in_progress`. Inject a provider failure
  and confirm Auth remains present and the same operation safely resumes.

## Evidence and ledger

Save only redacted evidence under `docs/delivery-evidence/account-deletion/`.
Move `ASR-002` to `VERIFIED` only when source (`S`), automated (`A`), deployed
backend (`B`), and exact signed-device (`D`) evidence are all linked. Otherwise
leave it open or mark it ready for external verification with the missing layer
named explicitly.
