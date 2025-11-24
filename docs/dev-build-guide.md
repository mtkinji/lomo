# Running LOMO in Development (Dev Client Flow)

This guide walks through running the app with Expo’s **development build paradigm**—the flow that replaces Expo Go so we can load custom native modules, use the new architecture, and stay close to production.

## Prerequisites

- Node 18+ (Node 20 LTS recommended) and npm. Install via `nvm` if you need multiple versions.
- Xcode 15+ with Command Line Tools for iOS builds.
- Android Studio (Hedgehog or newer) with SDK Platform 34, build-tools 34.0.0, and at least one emulator image.
- Watchman (optional but recommended for faster Metro reloads) – `brew install watchman`.
- CocoaPods – `sudo gem install cocoapods` (only needed after `pod install` changes).

## 1. Install project dependencies

```sh
cd /Users/andrewwatanabe/Desktop/Goooal/LOMO
npm install
```

If you bump native dependencies, also install pods:

```sh
cd ios && pod install && cd ..
```

### Core runtime version pins

This project currently targets **Expo SDK 54.0.x + React Native 0.81.5** and is tested with:

- `react`: `19.1.0`
- `react-dom`: `19.1.0`
- `react-native-worklets`: `0.5.1`
- `react-native-reanimated`: `~4.1.1`

These versions line up with Expo 54’s React 19 template and Reanimated’s compatibility matrix. Mixing React 18 / 19 or mismatched Worklets versions has previously produced hard‐to-debug Hermes boot errors (for example, `ReactCurrentDispatcher` and Worklets version mismatch crashes) in TestFlight, so when upgrading React, React Native, Reanimated, or Worklets, update all of them together and verify native builds before shipping.

## 2. Start Metro in dev-client mode

The dev client expects Metro to run with the `--dev-client` flag.

```sh
npx expo start --dev-client
# or, to guarantee a clean cache:
bash scripts/kill-expo.sh && npx expo start --dev-client --clear
```

Leave this terminal tab running; Metro will bundle JS updates for every connected device.

## 3. Build & install the native dev client

You only need to rebuild when native code/config changes (e.g., package updates, editing `app.config.ts`, or native modules). JS-only changes hot-reload through Metro.

### iOS (simulator or device)

```sh
npx expo run:ios --scheme LOMO --configuration Debug
```

- Add `--device "My iPhone"` to target a plugged-in device, or omit to choose a simulator interactively.
- Under the hood this runs a one-off `expo prebuild` and then launches Xcode. Subsequent runs reuse the generated native project.
- If the build opens Xcode, you can hit the Run button there for faster iteration after the first CLI run.

### Android (emulator or device)

```sh
npx expo run:android --variant debug
```

- Start an emulator from Android Studio or plug a device with USB debugging enabled before running the command.
- Gradle outputs an `.apk`/`.aab` and installs it automatically. Re-run the command if you change native code.

## 4. Pair the client with Metro

1. Keep `expo start --dev-client` running.
2. Launch the installed `LOMO` app on your simulator/device.
3. The first screen shows the Expo development launcher. Tap your machine under “Dev servers” (or scan the QR from Metro using the device camera).
4. Metro logs should show the bundle request; the app loads just like it did in Expo Go, but now inside the custom dev client.

## 5. Everyday workflow

1. Start Metro once (`npx expo start --dev-client`).
2. Open the already-installed dev build (from the previous section) on each target device/emulator.
3. Make JS/TS changes; they hot-reload automatically. Native changes require re-running `expo run:ios` / `expo run:android`.
4. When caches misbehave, stop Metro and run `bash scripts/kill-expo.sh && npx expo start --dev-client --clear`.

## 6. Troubleshooting

- **Metro can’t see the device**: ensure the device and laptop share the same network. For USB-only iOS, open the Developer Menu and choose `Connect to Metro`.
- **Build fails after dependency changes**: delete the `ios/build`, `android/.gradle`, and `android/app/build` folders, reinstall pods, and rerun the `expo run:*` command.
- **Stale native code**: if you change `app.json`/`app.config.ts`, run `npx expo prebuild --clean` before the next `expo run:*`.
- **Expo Go accidentally launches**: uninstall Expo Go on the test device or long-press the dev launcher tile and pick the custom LOMO client.

Following this playbook keeps us on the “new paradigm” development flow—fast JS iteration with Metro plus full access to the native layer without relying on Expo Go.

