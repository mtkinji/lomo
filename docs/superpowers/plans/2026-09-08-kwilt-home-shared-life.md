# Kwilt Home Shared Life Implementation Plan

> Execute inline in the current checkout. Andrew authorized implementation; no worktree or delegation.

**Goal:** Build the authored Home loop with photos, Explore offers, responses, durable history, and approved connections.

**Architecture:** Home owns posts; existing capability deliveries retain source authority. A restricted RPC boundary resolves audience membership and enforces lifecycle rules. Private media is authorized against the post on every request. Drafts are durable and account-scoped; recipient content is refreshed rather than persisted offline.

**Tech Stack:** Expo/React Native, canonical Kwilt UI, Supabase/Postgres, Jest and isolated PGlite SQL integration tests.

## UI contract

Job: share ordinary life and respond to people without re-entering capability context.
Authority: Andrew's accepted direction → native requirements → UI constitution/tokens/canonical components → existing Shared Home and drawer patterns. No external visual exemplar or dependency migration.
Three-second read: who shared, their words/photo, and the audience.
Primary action: create a post; in composition, publish.
Scan order: people/content → source attachment → responses.
Secondary/reveal later: source metadata, audience selection, connection approvals, edit/delete/report.
Reuse: AppShell/PageHeader, canonical Card/Button/Input, BottomDrawer and semantic footer, Typography, HapticPressable, KwiltLoader. Shared Home is the local composition precedent; rich content and composer intentionally extend it.
States: loading, empty, denied, draft restored, uploading, failed, published, unavailable, revoked, keyboard, account switch, long content and enlarged text.
Proof: SharedHome in the current iOS Simulator; direct composer and Explore entry, two-account backend lifecycle separately. Keep source/runtime/deployment evidence distinct.

## Execution

- [x] Backend: `supabase/migrations/*_home_shared_life.sql`; tests `scripts/shared-life/database.test.mjs`. Test adults/anonymous/child, household and selected people, retries, approval history, block/revoke, source snapshot, replies, media access and deletion before implementation. Run with `KWILT_PGLITE_PATH=/tmp/kwilt-home-sql-test/node_modules/@electric-sql/pglite/dist/index.js node --test scripts/shared-life/database.test.mjs`.
- [x] Domain and commands: `src/features/shared-home/sharedLife*.ts`. Validate drafts/attachments; round-trip retries and account cancellation. Focused Jest red/green.
- [x] UI: `SharedLifeFeed.tsx`, `SharedLifeComposer.tsx`, `SharedLifeConversation.tsx`, `SharedLifeConnections.tsx`; integrate with existing `SharedHomeScreen.tsx`. Use the same composition entry for direct and capability posts. No source data required for direct posts.
- [x] Explore: integrate a secondary share action after a saved place and in the outing recap. Publish only reviewed place or summary data, not private raw routes. Save shared places without manufacturing a visit.
- [x] Goal arrivals: retain existing check-in delivery and add written encouragement delivery with original Goal authority. Preserve existing pending actions.
- [ ] Verification/review: focused suites, SQL integration, `npm run verify:changed -- --run`, real Simulator inspection, migration/runtime readiness notes. Deployment and signed-device proof are explicit follow-on gates.

## Adopted defaults

Combined Home with household/history browsing; approved follows for people and households; publication-time recipients with revocation; adults first; up to four photos; manual contextual share actions avoid repeated interruption. No automatic production release, migration push, commit, or external messages.


## Verification record

Source: normal checkout `/Users/andrewwatanabe/Kwilt`, branch `main`, base HEAD `9db7bd690f63936641588a61e974d0d6f07db8b3`, uncommitted implementation and design documents. No worktree, commit, push, or app release. Backend deployment is recorded below.

- Focused initial checks: 13 Jest suites / 90 tests passed. Review follow-ups add a polling-versus-pagination regression, observed failing before its fix.
- Actual migration exercised in isolated PostgreSQL (PGlite): nine scenarios pass, covering account eligibility, audience scoping, follow approval/no backfill/removal, blocks, membership changes, payload rejection, private media RLS, report attribution, Goal note authority, deletion and retryable cleanup/discard.
- First completion gate: `npm run verify:changed -- --run` exited 0; 1,199 Jest suites, 7,460 tests passed, 2 skipped. App and test typechecks, product and architecture gates passed. Existing architecture warnings remain. The dependency change caused the gate to select the full suite.
- Independent source review found pagination/polling and cleanup reconciliation issues; both fixed. Failed media cleanup no longer prevents the successful deletion from refreshing the UI. Tombstones deny reads immediately; Storage API cleanup retries on a subsequent Home mount. Uncertain publish retries reuse IDs; discard cannot erase a published post.
- Native build: `npx expo run:ios --device D437E709-EF87-49B1-A6C1-7AE350C0BF8A --no-bundler` succeeded with 0 errors and 9 warnings. Installed on iPhone 17 Pro / iOS 26.5 Simulator. Metro on port 8081 serves this checkout. Home opened through More and displayed its server-unavailable state. This does not prove the native published-post flow.

### Deployed backend and live acceptance

Andrew authorized needed migration deployments. Applied to Kwilt `sqxwjtorodqjdfnuvprf`:
- `20260909032319_home_shared_life.sql` (local filename aligned with the server migration ledger).
- `20260909032858_home_storage_policy_isolation.sql`. Live Home uploads exposed an existing Storage policy calling a revoked Chores actor helper. The new bucket-scoped private helper preserves the original Chores membership/assignment rules and leaves direct actor-helper access revoked. A failing-then-passing PostgreSQL regression covers the conflict.
- `account-delete` Edge Function v26, including the `home-moments` storage cleanup prefix. Its existing custom-auth / `verify_jwt=false` setting was preserved. The CLI env credential failed; the connected Supabase tool deployed successfully.

`live-verification.mjs` uses dedicated temporary Auth users and households. Live pass covers household publication/idempotency, upload-before-publish gate, private Storage reads, direct-table denial, idempotent replies, exact report attribution, reactions, saved places, membership removal revocation, follow approval/no backfill/removal, tombstones, and physical photo cleanup. All temporary accounts, reports, photos, and fixture rows were removed. No messages or posts were sent to Andrew's household.

Live testing found cached authenticated photo URLs could return previously fetched bytes after revocation. Native photo requests now use a fresh URL nonce plus no-store headers and uploads use zero cache age. Live tests verify fresh authenticated requests are denied immediately after membership removal. Already downloaded content cannot be recalled. The focused media regression failed before the fix and passed afterward.

Simulator: Home loads against the deployed server. Verified direct composer, text entry, audience controls, closing/restoring the draft, and discarding only the temporary verification draft. Native inspection caught split Button text labels; a composer regression reproduced the issue and passed after correction. No keyboard overlay was visible with the Simulator hardware keyboard configuration, so keyboard-overlay acceptance is not claimed.

Database advisors: Home has six informational RLS-without-policy notices, expected because its tables deny direct client access and all operations use the authorized RPC. Direct-table denial was verified live. See [advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Anonymous-policy notices on shared Storage are conservative; the Home helper requires a permanent adult account, covered by isolated tests. No Home-specific performance finding. Existing unrelated project notices were not changed.

### Remaining release acceptance

Keep release flags off until native photo selection/upload, published-post conversation/report flows, long/large text, and Explore handoff are visually accepted. Signed-device and release proof remain separate. Recipes, Games summaries, project/activity offers, and Plan participation remain subsequent adapters on the same contract. A failed direct friendship insert during live-fixture setup exposed an existing trigger error (`record new has no field entity_type`); the fixture used authorized shared-household relationships instead. That unrelated friendship-trigger defect is not claimed fixed.

### Final completion result

Final `npm run verify:changed -- --run` exited 0 after the native-label and photo-cache fixes: 1,201 suites passed; 7,463 tests passed, 2 skipped. App/test typechecks, product gates, and architecture lint passed (10 existing architecture warnings). The preceding run failed only because the new media test needed an explicit Expo UUID mock; its focused regression and the final full gate pass. Ten isolated PostgreSQL scenarios pass, and the final live API/Storage verification passes with fixture cleanup independently confirmed. The Mac locked during the remaining native screen checks; an unlock request is pending. No app release or release flag change was performed.

### Shared full-screen offer follow-up

The user requested an immediate offer on goal completion, then a consistent full-screen celebration pattern across capabilities. `offerHomeMoment` supplies the source snapshot to the existing celebration host, with Share this moment and Continue. Goal completion and newly saved Explore places use it; explicit recap Share actions still open the composer directly. Release affordances use `shared-life-v1` consistently. There is no cross-capability once-per-session quota.

The host closes before opening the composer, renders text/actions when celebration media is disabled, clears account-mismatched queued offers, and hides personal offers on entry to Household mode. The pending Goal check-in draft is preserved without a competing automatic approval sheet. An older Home draft can be finished/discarded without losing the newly offered moment.

Deployed `20260909043604_goal_completion_home_moments.sql` extends the reviewed attachment allowlist to a Goal completion title snapshot. Eleven isolated PostgreSQL scenarios pass, and live dedicated-account acceptance verified the new attachment and cleanup. Focused adapter/interstitial/composer regressions pass. Native visual acceptance and screenshots remain blocked by the locked Mac. No app release flag was enabled.

### Unlocked Simulator acceptance — September 9

Resumed native inspection from `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `9db7bd690f63936641588a61e974d0d6f07db8b3`, with the uncommitted Home changes. The installed development client reported 1.0.120 and initially displayed cached JavaScript; restarted Metro from this checkout on port 8081 and reloaded the current bundle. This is development-client evidence, not TestFlight or release proof.

Captured current native screenshots of Home as the first standard navigation row, the Home empty feed, composer audience choices, People & households, the full-screen Goal celebration, and the composer with its Goal title attachment. Added a development-only preview button using the fictional title “Finish the garden”; no real Goal status changed. Share this moment navigated into Home, preserved the empty QA draft created earlier in the session, then loaded the pending title attachment after that draft was discarded. Discarded the final preview draft as well. No post or follow request was submitted.

The completion gate for the preview addition exited 0: 1,202 Jest suites, 7,470 tests passed, 2 skipped; app/test typechecks and product/architecture checks passed with existing warnings. The remaining release acceptance above still applies, including the real Explore handoff and native published-post/media flows.
