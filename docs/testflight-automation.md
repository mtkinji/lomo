# TestFlight automation (EAS)

This repo uses EAS Build + EAS Submit to ship iOS builds to TestFlight.

## One-command local release

From the repo root:

```sh
npm run ios:testflight
```

This runs:

- `eas build --platform ios --profile production --non-interactive --auto-submit`

There is also a convenience wrapper:

```sh
bash scripts/ios-testflight.sh
```

## CI release (GitHub Actions)

Workflow: `.github/workflows/ios-testflight.yml`

Triggers:

- Manual: GitHub → Actions → **iOS TestFlight (EAS)** → Run workflow
- Tag push: `ios-v*` (example: `ios-v1.0.8`)

### Required GitHub secrets

- **`EXPO_TOKEN`**: an Expo access token that can run EAS builds/submits.
  - Create in Expo: Account → Access Tokens

### App Store Connect auth (required for fully hands-off submit)

EAS Submit needs *either*:

- **An App Store Connect API key configured in Expo (recommended)**:
  - Run `eas credentials -p ios`
  - Choose **App Store Connect: Manage your API Key**
  - Follow the prompts to upload/select your API key

OR

- **An Apple ID + app-specific password** (not recommended for CI):
  - EAS Submit supports `EXPO_APPLE_APP_SPECIFIC_PASSWORD` + `appleId` in `eas.json`.
  - Prefer API key instead.

## Notes

- iOS submission uses the `submit.production` profile in `eas.json` (ASC app id is already set).
- If EAS Submit prompts for credentials locally, run `eas submit --platform ios --profile production` once interactively to store/verify settings, then rerun `npm run ios:testflight`.


