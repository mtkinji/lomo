#!/usr/bin/env bash
set -euo pipefail

# Build iOS (EAS) and automatically submit the resulting .ipa to TestFlight.
# Requirements:
# - `EAS_TOKEN` set (recommended for CI) OR `eas login` already done locally.
# - App Store Connect auth configured for EAS Submit (recommended: ASC API key).

echo "[kwilt] Building iOS (production) + auto-submitting to TestFlight…"
npm run -s ios:testflight





