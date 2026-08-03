# Dependency modernization baseline

Captured on 2026-08-03 before dependency changes on `codex/dependency-modernization`.

## Provenance and proof boundary

- Starting commit: `72dabd2` (`main` and `origin/main` were identical and clean before branching).
- App manifest version/build: `1.0.100` / `100`. An installed TestFlight build was not independently inspected in this baseline.
- Local tools: Node `25.9.0`, npm `11.12.1`, Xcode `26.6` (`17F113`), CocoaPods `1.16.2`.
- CI uses Node 20 in five workflow jobs. Expo's SDK compatibility table requires Node `22.13.x` or newer for the planned SDK 57 destination, so the alignment cohort will pin the current Node 22 LTS line across local declarations and CI.
- Runtime owner: this checkout owned Metro on port 8081 before capture; Metro was stopped before `npm ci`. Simulator `iPhone 17 Pro` (`D437E709-EF87-49B1-A6C1-7AE350C0BF8A`, iOS 26.5) remained booted.
- Signed-device availability: `Andy’s iPhone 16` was visible but offline. No signed-device or TestFlight flow was exercised.
- Evaluated Expo public and introspected configs were captured under `/tmp`; config evaluation succeeded. Expo warned that `ios.usesAppleSignIn` lacks `expo-apple-authentication` and Android `userInterfaceStyle` lacks `expo-system-ui`. Those are cohort candidates, not silently accepted fixes.

## Installed framework and protected native dependencies

| Surface | Baseline |
| --- | --- |
| Expo / React / React Native | `54.0.24` / `19.1.0` / `0.81.5` |
| Reanimated / Worklets / Screens | `4.1.5` / `0.5.1` / `4.16.0` |
| Maps | `react-native-maps@1.20.1`, pinned |
| Plaid / RevenueCat / HealthKit | `13.0.2` / `9.6.11` / `14.0.0` |
| New Architecture | Enabled |

`npm ci` installed 1,939 packages. Both checked-in patches applied: the drawer patch preserves system Reduce Motion behavior, and `react-native-maps+1.20.1.patch` preserves Kwilt Explore's Silver Mist Metal overlay. Neither dependency may move incidentally in another cohort.

## Compatibility and Doctor findings

`npx expo install --check` reported 14 mismatches. The SDK 54 alignment cohort owns only these changes:

- `expo` `54.0.24` -> `~54.0.36`
- `expo-auth-session` `7.0.10` -> `~7.0.11`
- `expo-clipboard` `8.0.7` -> `~8.0.8`
- `expo-dev-client` `6.0.20` -> `~6.0.21`
- `expo-file-system` `19.0.21` -> `~19.0.23`
- `expo-font` `14.0.9` -> `~14.0.12`
- `expo-image-picker` `17.0.8` -> `~17.0.11`
- `expo-linear-gradient` `15.0.7` -> `~15.0.8`
- `expo-localization` `17.0.8` -> `~17.0.9`
- `expo-notifications` `0.32.14` -> `~0.32.17`
- `expo-status-bar` `3.0.8` -> `~3.0.9`
- `expo-web-browser` `15.0.10` -> `~15.0.11`
- `@types/jest` `30.0.0` -> `29.5.14`
- `jest-expo` `54.0.16` -> `~54.0.17`

Expo Doctor passed 9 of 18 checks. Blocking/alignment findings are the 14 mismatches, missing direct `expo-asset` peer required by `expo-audio`, and duplicate native `expo-constants` (`18.0.11` and `18.0.12`). Cohort candidates are the redundant `app.json`, locally installed `eas-cli`, direct `@types/react-native`, `storybook` script/binary collision, and root-only native ignore patterns. SDK-coupled or documented upstream warnings are Plaid's unverified New Architecture metadata and absent React Native Directory metadata for Kwilt's three local modules.

`npx expo-modules-autolinking verify -v` found all three local modules and 54 dependency modules, with the same duplicate `expo-constants` warning.

## Security and deprecation posture

The full audit reports 49 findings: 4 low, 26 moderate, 17 high, and 2 critical. `npm audit --omit=dev` reports 33: 19 moderate, 12 high, and 2 critical. Counts do not establish reachability:

- `shell-quote` critical is reached through React Native's development tooling (`react-devtools-core`). Treat as build/development exposure unless a shipped invocation is demonstrated.
- `tar` critical is reached through Expo CLI and the direct development-only EAS CLI. It affects package/build tooling, not an imported application runtime path.
- `markdown-it@10.0.0` and `linkify-it` high are reached through direct runtime dependency `react-native-markdown-display`. This is the principal shipped-input risk and remains assigned to the bounded Markdown hardening cohort.
- Other high findings (`@xmldom/xmldom`, brace/minimatch variants, `js-yaml`, `node-forge`, `picomatch`, `postcss`, `undici`, `ws`) are retained for path-by-path review; most are CLI, test, bundler, or networking transitive dependencies. No forced audit fix is authorized.

Deprecated runtime APIs are present and intentionally deferred to dedicated cohorts: `expo-av`, `expo-background-fetch`, and `expo-file-system/legacy` callers. They must not be removed as incidental SDK-alignment work.

## Behavioral baseline

| Gate | Result before dependency changes |
| --- | --- |
| `npm run lint` | Pass |
| `npm run lint:tests` | Pass |
| `npm run product:lint` | Pass with 8 existing unreferenced-brief warnings |
| `npm run architecture:lint` | Pass with 11 existing raw-Text warnings |
| `npm run verify:changed -- --run` | Pass; no changed files |
| `npm test -- --runInBand` | Pre-existing failure on current `main` content |

The full Jest baseline completed with 512 passing suites, 15 failing suites, 3,249 passing tests, and one skipped test. All 15 failures are under `prototypes/pixel-pets/tests`: 14 files expose Node test-runner tests that Jest therefore reports as empty suites, while `pet-engine.test.ts` also uses `import.meta.url`, which the current Expo Jest transform rejects. Animated `act(...)` warnings remain in otherwise passing suites. These are recorded as pre-existing; the SDK 54 cohort must not introduce additional failures.

## Advance decision

Advance to the bounded SDK 54 alignment cohort. Its rollback point is `72dabd2` plus this baseline-only commit. It may change the declared Node line, named Expo packages, the two invalid direct tooling dependencies, app-config ownership, Doctor-specific script/ignore metadata, and resulting lock/native resolution only. It must stop if React, React Native, Reanimated, Worklets, Screens, Maps, Plaid, RevenueCat, or HealthKit move unexpectedly.

## SDK 54 alignment result

Completed on 2026-08-03 from baseline commit `aa69917`:

- Pinned the repository to Node `22.23.2` via `.nvmrc`, declared `>=22.13.0 <23`, and updated all six GitHub Actions Node setup entries. A clean install run under Node `22.23.2` completed without an engine warning; the interactive shell still had Node `25.9.0` until its next version-manager activation.
- Applied Expo's SDK 54 patch set, added direct `expo-asset`, aligned Jest types/preset, and declared `babel-preset-expo` because the root Babel config imports it directly. Removed project-local `eas-cli` and obsolete direct `@types/react-native`.
- Removed unused `app.json`; `app.config.ts` remains the sole owner. The evaluated config retained version/build, bundle/application IDs, schemes, associated domains, background modes, permissions, New Architecture, and extension conditionals. `expo-asset` and `expo-web-browser` were added to the plugin list as requested by Expo install.
- Renamed the conflicting script to `storybook:web`. Corrected `.easignore` from nested-matching `ios/` and `android/` patterns to root-only `/ios` and `/android`.
- React Native Directory exclusions cover Kwilt's three owned local modules and Plaid. The local modules are in-repository and were autolinked in the native build. Plaid remains pinned at `13.0.2`; the exclusion suppresses an incomplete metadata warning, not the requirement for sandbox, New Architecture, and signed-device verification.
- Protected versions did not move: React `19.1.0`, React Native `0.81.5`, Reanimated `4.1.5`, Worklets `0.5.1`, Screens `4.16.0`, Maps `1.20.1`, Plaid `13.0.2`, RevenueCat `9.6.11`, and HealthKit `14.0.0`.
- `npx expo install --check` passed, Expo Doctor passed 18/18, autolinking found a single `expo-constants@18.0.13`, Pods installed, both patches reapplied, app/test typechecks passed, diff-aware verification passed, and product/architecture lint retained only their baseline warnings.
- The full Jest result exactly matched the baseline: 512 suites and 3,249 tests passed; the same 15 Pixel Pet prototype suites failed for their recorded runner/import-meta mismatch. A transient all-suite failure caused by the undeclared Babel preset was reproduced, root-caused, fixed by the direct SDK-aligned declaration, and eliminated.
- Audit posture improved from 49 total / 33 omit-dev findings to 30 total / 25 omit-dev findings. The `tar` critical disappeared with the CLI updates/removal. The remaining critical is `shell-quote` through React Native development tooling; the shipped Markdown path remains 2 high findings and is assigned to its own cohort.
- `npx expo run:ios` succeeded with 0 errors and 4 native warnings, compiled the app plus widget and Screen Time extension targets, compiled the patched Silver Mist Metal map implementation, installed build 100, bundled 5,793 modules, restored the signed-in session, and completed initial domain sync on Simulator `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`. The observed screen was the expected disabled-Chat development state because the Chat flag was off.
- Remaining proof before merge/advance: deliberate Simulator smoke across the minimum critical flows, signed-device checks for notifications/background/location/audio/HealthKit/Plaid/RevenueCat/Screen Time, and TestFlight observation. Existing native warnings include Screen Time Swift exhaustiveness/sendability, a missing simulator Metal toolchain search path, and the Maps privacy bundle's old deployment target.
