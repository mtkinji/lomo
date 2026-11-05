#!/usr/bin/env bash
set -euo pipefail

# Verify the release candidate, build iOS (EAS), and automatically submit the
# resulting .ipa to TestFlight.
# Requirements:
# - `EXPO_TOKEN` set (recommended for CI) OR `eas login` already done locally.
# - App Store Connect auth configured for EAS Submit (recommended: ASC API key).

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
bash "$script_dir/ios-testflight-main.sh"
verified_head=$(git rev-parse HEAD)

# Verify the latest integration, not an empty main-to-itself diff.
# An explicit earlier release base can widen this range.
verification_base="${KWILT_VERIFY_BASE:-HEAD^1}"
testflight_profile="${KWILT_TESTFLIGHT_PROFILE:-testflight-widgets}"

case "$testflight_profile" in
  testflight|testflight-widgets) ;;
  *)
    echo "[kwilt] Unsupported TestFlight profile: $testflight_profile" >&2
    exit 2
    ;;
esac

echo "[kwilt] Running protected release verification against ${verification_base}…"
npm run verify:changed -- --run --base "$verification_base"

echo "[kwilt] Running the complete Jest coverage suite…"
npm run test:ci

echo "[kwilt] Checking the release target Budget backend…"
npm run money:verify-backend -- --profile "$testflight_profile"

# Recheck after verification so main movement or local edits cannot change the candidate.
if [[ "$(git rev-parse HEAD)" != "$verified_head" ]]; then
  echo "[kwilt] Checkout moved during verification. Verify the new candidate before building." >&2
  exit 2
fi
bash "$script_dir/ios-testflight-main.sh"

echo "[kwilt] Building iOS (${testflight_profile}) + auto-submitting to TestFlight…"
npx eas-cli@22.0.0 build \
  --platform ios \
  --profile "$testflight_profile" \
  --non-interactive \
  --auto-submit



