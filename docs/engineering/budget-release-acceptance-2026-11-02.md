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

## Remaining gates

- Native transaction-rule matching/save/reopen and Accounts navigation.
- Inventory scroll/pull behavior and in-session Dynamic Type acceptance.
- Hosted CI runtime rerun and authenticated/data fixture prerequisites.
- Configure and exercise `SUPABASE_RELEASE_READ_TOKEN`; it was absent from the
  repository's Actions secrets and the local process at this checkpoint.
- Signed-in live workflow acceptance and physical-device/TestFlight validation.
- No app build, upload, production mutation, or release was performed in this pass.
