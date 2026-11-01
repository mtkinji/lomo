# Budget native fixture

Runs the real transaction inventory, frame, owned UI and transaction-detail screen with synthetic snapshots. The optional settings fixture below adds an isolated authenticated API. Neither mode provides bank-sync or production household acceptance.

From the repository root, with its installed dependencies:

```sh
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 REACT_NATIVE_PACKAGER_HOSTNAME=localhost \
  node_modules/.bin/expo start scripts/money/native-harness --dev-client --localhost --port 8081
```

Use one Simulator/runtime owner. Open that Metro URL in a compatible development client. The `exp+kwilt` scheme can use an existing Kwilt development host; record its installed native version/build separately from the current JavaScript source. Do not start the repository's real entry point to run this fixture. The explicit hostname avoids an IPv6 localhost listener advertising an unreachable IPv4 address.

Isolation: this project has its own credential-free Expo config, does not import the root app, substitutes the Money provider, blocks Supabase construction and analytics, and substitutes in-memory AsyncStorage for host account/store state. Only the optional settings journal below uses a separate fixture-owned native storage namespace. The entry point permits fetch/XHR only to loopback for Metro assets and the isolated API. Inventory mutations reject with a fixture-only error; the optional settings mode permits only synthetic local category-setting commands. Do not weaken these boundaries to make a test pass. This is not a general security sandbox for arbitrary native code.

Cases: 0/1k/4k/10k transactions (90% forced into the device's current month), initial loading/error, stale data, refresh and overage review. The remainder comes from the dated two-year synthetic benchmark, including credits, transfers and split assignments; some dates can be in the future relative to the device clock. No real household data is used.

Acceptance checklist:

- Open inventory, all history, oldest/newest and amount/merchant sort; preserve count and oldest transaction access.
- Filter, clear filter and filtered-empty; open and return from an exact transaction.
- Scroll beyond initial rows and through date/overage groups, reach the final item, return with position retained.
- Pull to refresh, explicit refresh, stale-warning dismissal and initial-error retry.
- Check large text on fresh launch and after changing text size in-session, long names, amounts, counts and control badges.
- Overage review opens the coverage drawer. Fixture writes must reject.

Use `xcrun simctl ui <device> content_size` to record the starting text size, set the needed test size, and restore it afterward. Do not describe a button refresh as a successful pull gesture, a sort to oldest as a scroll to the last item, or test-renderer timing as native latency. Current partial evidence is in `docs/engineering/evidence/budget-native-2026-11-01/README.md`.

## Authenticated settings acceptance

The settings fixture adds a separate disposable backend, with PostgreSQL 17 and PostgREST 16.5 (tested Homebrew binaries). Start it in another terminal:

```sh
python3 scripts/money/native-harness/server.py
```

It creates a private temporary PostgreSQL cluster reachable only through a Unix socket, loads the same SQL contract as the isolated regression runner, and starts PostgREST on `127.0.0.1:8083` behind a fixture proxy on `127.0.0.1:8082`. It never loads app environment files or contacts a production database. Stop with Ctrl-C; termination removes the cluster. The proxy permits only fixture controls, synthetic auth-user lookup, category/plan reads, and the two category-settings RPCs. JWT signing keys are generated for this process and are not production credentials. Identity-provider sign-in is substituted; PostgREST signature verification, database roles, RLS and RPC execution are real.

Run the automated acceptance path with the repository runtime:

```sh
npm exec --yes --package=node@22.23.2 -c 'node --import tsx scripts/money/native-harness/check-api.ts'
```

This uses the production `createCategorySettingsRepository` and `createMoneyCategorySettingsCommand` over HTTP. It checks combined persistence, concurrent taps producing one receipt, lost committed responses with offline lookup, recovery through a newly created command instance, durable stale-edit rejection, rollback after a late governed failure, adult sharing, denied child/unrelated/anonymous access, and invalid JWT rejection. Its journal is an explicit in-memory adapter; this does not prove device persistence.

In the Simulator picker, **Category settings — isolated API** opens the real category-detail/settings screen against this backend. The adapter uses the production journal, command, repository and snapshot projection. Its native journal persists only under `kwilt:budget-native-fixture:` keys in the development host; other harness storage stays in memory. No production account/store keys are read, modified or cleared. Other mutations stay disabled. The fixture's amount preview returns no governed plan because this synthetic owner has no active governed plan; governed allocation behavior is covered separately by SQL fixtures.

Native acceptance sequence:

1. Open settings, change name/amount/role/rollover together, save, reopen, and compare with a fresh backend snapshot.
2. Return to the picker, choose **Lose next save response**, reopen settings, edit and save. The database commits, but the proxy drops that response and makes receipt lookup unavailable. Confirm the drawer retains the pending operation and offers **Check save**.
3. Close and reopen the drawer while offline. Confirm editing stays locked to the original request. Relaunch the development host while leaving the server running, reopen this fixture and confirm the pending operation survives.
4. Choose **Restore receipt network**, return to settings and check the save. It must show the original confirmed result, clear the journal, and permit a new edit without adding another receipt. `/fixture/receipt-count` exposes only a synthetic receipt count for this check.
5. Verify keyboard/drawer dismissal, validation and unchanged-save behavior. Do not count the automated API sequence as native gesture or device-persistence acceptance.

The Mac must be unlocked for CUA to operate the Simulator. Never work around that lock or report unobserved UI cases as passed.

Category/plan SELECT policies and auth-user lookup are fixture substitutes. The provider adapter awaits snapshot reload before confirmation, so this does not prove production MoneyDataProvider confirmation/refresh timing. Restarting the backend regenerates identities and removes receipts; only app/JS relaunch with the same backend instance tests recovery continuity.
