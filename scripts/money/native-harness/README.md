# Budget native fixture

Runs the real transaction inventory, frame, owned UI and transaction-detail screen with synthetic snapshots. This is UI verification, not backend, write, bank-sync or production acceptance.

From the repository root, with its installed dependencies:

```sh
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 REACT_NATIVE_PACKAGER_HOSTNAME=localhost \
  node_modules/.bin/expo start scripts/money/native-harness --dev-client --localhost --port 8081
```

Use one Simulator/runtime owner. Open that Metro URL in a compatible development client. The `exp+kwilt` scheme can use an existing Kwilt development host; record its installed native version/build separately from the current JavaScript source. Do not start the repository's real entry point to run this fixture. The explicit hostname avoids an IPv6 localhost listener advertising an unreachable IPv4 address.

Isolation: this project has its own credential-free Expo config, does not import the root app, substitutes the Money provider, blocks Supabase construction and analytics, and substitutes in-memory AsyncStorage so it cannot read or change the host's saved account/store. The entry point permits fetch/XHR only to loopback for Metro assets. Mutations reject with a fixture-only error. Do not weaken these boundaries to make a test pass. This is not a general security sandbox for arbitrary native code.

Cases: 0/1k/4k/10k transactions (90% forced into the device's current month), initial loading/error, stale data, refresh and overage review. The remainder comes from the dated two-year synthetic benchmark, including credits, transfers and split assignments; some dates can be in the future relative to the device clock. No real household data is used.

Acceptance checklist:

- Open inventory, all history, oldest/newest and amount/merchant sort; preserve count and oldest transaction access.
- Filter, clear filter and filtered-empty; open and return from an exact transaction.
- Scroll beyond initial rows and through date/overage groups, reach the final item, return with position retained.
- Pull to refresh, explicit refresh, stale-warning dismissal and initial-error retry.
- Check large text on fresh launch and after changing text size in-session, long names, amounts, counts and control badges.
- Overage review opens the coverage drawer. Fixture writes must reject.

Use `xcrun simctl ui <device> content_size` to record the starting text size, set the needed test size, and restore it afterward. Do not describe a button refresh as a successful pull gesture, a sort to oldest as a scroll to the last item, or test-renderer timing as native latency. Current partial evidence is in `docs/engineering/evidence/budget-native-2026-11-01/README.md`.
