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

## Remaining gates

- Native Accounts/main-menu navigation and signed-in provider integration.
- Inventory final-item/pull behavior and repair/verification of in-session Dynamic Type clipping.
- Hosted CI runtime rerun and authenticated/data fixture prerequisites.
- Configure and exercise `SUPABASE_RELEASE_READ_TOKEN`; it was absent from the
  repository's Actions secrets and the local process at this checkpoint.
- Signed-in live workflow acceptance and physical-device/TestFlight validation.
- No app build, upload, production mutation, or release was performed in this pass.
