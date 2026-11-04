# Budget release acceptance — November 2, 2026

Source checkout: `/Users/andrewwatanabe/Kwilt`, branch
`codex/budget-native-acceptance`, based on `c011880c`. One local runtime owner.
This is an ongoing acceptance record, not a production readiness declaration.

## Native CI investigation

[Run 41457434237](https://github.com/mtkinji/lomo/actions/runs/41457434237)
built successfully, logged `SKIP_BUNDLING enabled; skipping.`, then failed all
20 Maestro flows. The Debug app requires Metro, but neither workflow job started
it. No diagnostic artifacts were retained. The workflow also runs flows whose
authenticated sessions and transaction IDs are not supplied by a fresh CI runner.
Fixing JavaScript startup alone does not establish those workflows' acceptance.

The shared runner now owns Metro, refuses an existing runtime on port 8081,
checks both status and iOS bundle generation, opens the development-client URL,
and propagates Maestro failure. Both jobs retain logs and screenshots even on
failure. The auth smoke reopens the development URL after clearing app state.
No existing flow or assertion was removed. Focused regression tests failed before
the fix and now pass. Independent review caught a hidden Maestro-log upload gap;
`--flatten-debug-output` corrects it, with a failing-then-passing regression.
Artifact flags follow [Maestro's CLI reference](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options).

## Settings native acceptance

Observed through Simulator UI on iPhone 17 Pro, iOS 26.5, existing Kwilt native
host build 127. Current JavaScript came from `scripts/money/native-harness` via
Metro on localhost:8081. This host was not rebuilt from the current commit.
The fixture uses a disposable PostgreSQL/PostgREST backend through localhost:8082
and a fixture-owned native journal namespace. Production configuration, external
network calls, household data, and unrelated host storage are excluded.

| Case | Observed result |
| --- | --- |
| Combined native settings save | Changed name to Native groceries, monthly amount to 375.00, role to Flexible, and rollover start to October 2026. Save returned to category detail. Reopened values and independent API readback matched. |
| Unchanged save | Closed normally; receipt count remained 6. |
| Lost committed response | Renamed to Recovered native groceries with response loss armed. Drawer reported an unconfirmed save, disabled editing, and offered Check save. Receipt count increased once, to 7. |
| Reopen while unresolved | Original request and disabled editing remained. |
| Native process relaunch | Closed Kwilt through the iOS app switcher and relaunched. Reopened settings retained the pending request even though a fresh snapshot already showed the committed name. |
| Recovery | Restored receipt transport and tapped Check save. Drawer closed; reopening permitted editing. Receipt count remained 7. |

Keyboard and month-picker interactions were observed; fields were entered through
native accessibility controls. This does not establish every keyboard gesture,
physical-device behavior, production-provider refresh timing, or release-binary
parity. The signed-JWT HTTP settings acceptance also passed freshly, including
actor denial, concurrent taps, durable stale rejection, rollback and recovery.

## Rule native acceptance

Using the same native host and a fresh disposable backend, both rule flows passed
native save and reopen, with independent API readback:

- Partial match: entering `Taylor Example` found the full original description
  `Online Payment 12345 To Taylor Example 10/23` despite the short merchant name
  `Online Payment`. Create rule succeeded; reopening showed the active category
  rule. Both synthetic history rows had `budget_match_source=merchant_rule`.
- Internal transfer: the offer **Use Internal transfer next time?** was present.
  Review/Create succeeded; reopening showed the active transfer rule. Backend
  readback showed the matching incoming Broker transaction marked as a transfer
  with `money_meaning_source=rule`.

The native adapter overlays only the initial manual category assignment and
presentation dates/accounts; rule writes and readback use the real repository
and HTTP API. Independent review found no blocking issues in this adapter.
Its focused HTTP acceptance and separate harness TypeScript check passed.
Production provider orchestration and live identity/entitlements remain unproven.

## Inventory observations and unresolved cases

A coordinate swipe in the 4,000-row fixture moved beyond the initial rows.
Opened Synthetic vendor43 store (-$12.83), then returned to the same visible
position (vendor29/-$12.69 through vendor51/-$12.91). This does not prove reaching
the final item. Downward drag attempts did not produce a refresh; one opened a
transaction, another left the stale warning unchanged. Pull acceptance remains
unresolved rather than being counted as a pass.

Changing from `large` to `accessibility-extra-extra-extra-large` in-session did
update text, but clipped the count/date header in the existing list. Reopening
Transactions at that size laid out the count, heading, merchant, category and
amount without that clipping. This reproduces an in-session layout invalidation
gap; no fix is claimed. The Simulator was restored to `large` afterward.

## Hosted validation at checkpoint

[PR CI 41479676407](https://github.com/mtkinji/lomo/actions/runs/41479676407)
finished with 1,319 suites passing and one failure in
`HouseholdDeviceSetupScreen.test.tsx`: the pairing receipt assertion ran while
the screen still showed its loading state. This file is unchanged by this branch;
the test waits for the request invocation rather than its rendered result. No
production change or assertion removal was made to hide this unrelated failure.
The native smoke run 41479673911 was still building at this checkpoint.

The rule-harness checkpoint passed `verify:local -- --run --base HEAD`:
1,320 suites, 8,331 tests passed, two skipped, plus whitespace, code health and
release-contract checks. The separate harness TypeScript check passed. This
local full-suite pass does not replace the failed hosted gate or native evidence.
The fixture Metro and disposable backend were stopped; the private database was
removed by its normal shutdown. No local runtime remains owned by this pass.

## Release preflight credential and hosted verification

Andrew saved `SUPABASE_RELEASE_READ_TOKEN` in the repository's Actions secrets on
November 2. Its prepared Supabase scope was only project
`sqxwjtorodqjdfnuvprf`, Database Read and Custom Domains Read, with a 90-day
expiry. The token value was not copied into the repository or this record.
Replace the GitHub secret before the token expires to preserve the release gate.

[Backend-only run 41484087573](https://github.com/mtkinji/lomo/actions/runs/41484087573)
completed successfully at 09:44 MST on November 2 against clean source commit
`c99ee7485648ff9c759a5819205a127a749ad64b`. All **61** contract checks passed for
`https://auth.kwilt.app`, profile `testflight-widgets`, contract version 1,
hash `a67616078742667083ccb52b8a4c8ebe0d910b2be4e32bc3d7e3c28c29a444d2`.
The `build_and_submit` job was skipped. This verifies the GitHub credential and
live database catalog contract; it does not establish native or API workflow
acceptance, and it must run again for the actual release candidate.

[PR CI 41482952344](https://github.com/mtkinji/lomo/actions/runs/41482952344)
also passed on `c99ee748`, superseding the earlier failed hosted test run for
this candidate. Native CI remains a separate gate.

## Remaining gates

- Native Accounts/main-menu navigation and signed-in provider integration.
- Inventory final-item/pull behavior and repair/verification of in-session Dynamic Type clipping.
- Hosted CI runtime rerun and authenticated/data fixture prerequisites.
- Re-run the backend contract check for the actual release candidate.
- Signed-in live workflow acceptance and physical-device/TestFlight validation.
- No app build, upload, production mutation, or release was performed in this pass.

## Follow-up: text layout and native navigation

The in-session Dynamic Type issue is fixed in `f8316a19`: changing font scale
rebuilds the list's native measurements. Screen-level inventory selection remains,
while scroll position deliberately restarts at the top. The regression failed
before the fix, then all 13 transaction-screen tests passed; independent review
found no blocking issue. Native before/after images and navigation observations
are in [the November 2 evidence](evidence/budget-native-2026-11-02/README.md).

Accounts' back button and Accounts → main-menu Budgets both returned to the real
Budget overview in the isolated native harness. The latter uses the real menu
handlers and MoneyEntry's offline automatic fallback, not production sign-in.
These observations supersede the corresponding unresolved layout/navigation
entries above within that stated scope. Pull and final-row scrolling remain open.

PR CI [41488161850](https://github.com/mtkinji/lomo/actions/runs/41488161850)
passed at `f8316a19`. Native CI
[41488149296](https://github.com/mtkinji/lomo/actions/runs/41488149296) built and
installed the app but failed all five smoke flows. Its retained screenshot still
showed the iOS Open confirmation after Maestro's first tap. Commit `3cafaf18`
adds bounded confirmation retries, asserts dismissal, and allows up to 180 seconds
for first-load bundling. This is a test-startup repair pending hosted confirmation.

A separate isolated Budget CI flow now covers Accounts back/menu routing, an
actual pull gesture with refresh-count readback, and All history scrolling through
4,000 transactions to a unique oldest row followed by detail/return-position
acceptance. It preserves the existing smoke suite and runs separately after app
installation even when that suite fails. Pending execution is not a passing gate.

TestFlight preparation: the existing local EAS identity was verified as `mtkinji`
with owner access to Kwilt. The repository release script uses `testflight-widgets`,
protected verification, full coverage, live backend contract validation, and EAS
build/submit. No build/upload was started; user-authorized merge/build remains
conditional on completing the native gates and candidate review.

## November 4 manual acceptance and hosted startup failures

Andrew tested the isolated fixture served from clean commit `2a7a8305` on the
existing local development host. He confirmed that pulling the stale transaction
list removed its warning; both Accounts back and menu-to-Budgets paths returned
to Budget; and All history scrolling reached the final synthetic transaction and
preserved its position after opening detail and returning. The completed-refresh
counter was not separately reported. These are user-observed Simulator results,
not production-provider or newly built binary acceptance.

PR CI `41853601322` and backend-only preflight `41853744958` passed for that
commit; the latter passed 61 catalog checks and skipped build/submission.
Native run `41853589814` attempt 1 could not acquire a macOS runner. Attempt 2
built and installed version 2.0.2 (135) on iPhone 17 Pro / iOS 26.4, then found:

- The ordinary runner exited before Metro because macOS Bash 3.2 treats its
  empty `project_args` array as unbound under `set -u`. Commit `226cd6b4` uses an
  initialized project directory instead. A regression invoking `/bin/bash`
  failed before the fix and passed afterward; all seven runner tests, local
  verification, independent review and the uncached integration gate passed.
- The isolated flow dismissed the iOS Open confirmation but timed out waiting
  for its picker. Its screenshot showed SpringBoard. The retained crash report
  records SIGTRAP in `_xzm_xzone_malloc_freelist_outlined`, through OSLogHandler
  and Expo ModuleRegistry initialization, before the fixture's JavaScript logged
  startup. Two React JavaScript threads were initializing native modules.

The runner pre-opened the project, then Maestro relaunched and opened it again.
The next isolated run removes that pre-open and clears the development client's
recent-project state before its one explicit URL open. This tests a possible
concurrent-startup cause; it does not establish that the native crash is fixed.
All UI assertions remain mandatory. The superseded queued run `41863027622`
was canceled before replacing it with this startup change.

Artifacts from attempt 2 were downloaded to
`/tmp/kwilt-maestro-41853589814`; GitHub retains `maestro-smoke-diagnostics` for
seven days. PR #203 remains draft, with no merge or TestFlight build performed.
