#!/usr/bin/env bash
set -euo pipefail

# Verify the release candidate, build iOS (EAS), and automatically submit the
# resulting .ipa to TestFlight.
# Requirements:
# - `EXPO_TOKEN` set (recommended for CI) OR `eas login` already done locally.
# - App Store Connect auth configured for EAS Submit (recommended: ASC API key).

verification_base="${KWILT_VERIFY_BASE:-origin/main}"
testflight_profile="${KWILT_TESTFLIGHT_PROFILE:-testflight-widgets}"

case "$testflight_profile" in
  testflight|testflight-widgets) ;;
  *)
    echo "[kwilt] Unsupported TestFlight profile: $testflight_profile" >&2
    exit 2
    ;;
esac

echo "[kwilt] Running protected release verification against $verification_base…"
npm run verify:changed -- --run --base "$verification_base"

echo "[kwilt] Building iOS ($testflight_profile) + auto-submitting to TestFlight…"
npx eas-cli@22.0.0 build \
  --platform ios \
  --profile "$testflight_profile" \
  --non-interactive \
  --auto-submit





