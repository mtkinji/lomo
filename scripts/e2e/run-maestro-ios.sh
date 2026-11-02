#!/usr/bin/env bash
set -euo pipefail

: "${SIMULATOR_ID:?Set SIMULATOR_ID to the installed test simulator}"
if [ "$#" -eq 0 ]; then
  echo "Pass the Maestro flow files or directory to run." >&2
  exit 1
fi
mkdir -p artifacts/maestro
if curl --fail --silent --max-time 2 http://localhost:8081/status >/dev/null 2>&1; then
  echo "Port 8081 already serves a runtime; refusing to test unrelated JavaScript." >&2
  exit 1
fi

# Debug simulator builds skip the embedded bundle. Own Metro for this run and
# fail before UI assertions when JavaScript cannot be served.
CI=1 EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 REACT_NATIVE_PACKAGER_HOSTNAME=localhost \
  node_modules/.bin/expo start --dev-client --localhost --port 8081 \
  >artifacts/maestro/metro.log 2>&1 &
metro_pid=$!
cleanup() { kill "$metro_pid" 2>/dev/null || true; wait "$metro_pid" 2>/dev/null || true; }
trap cleanup EXIT
ready=false
for attempt in {1..60}; do
  if ! kill -0 "$metro_pid" 2>/dev/null; then
    echo "Metro exited before readiness; see metro.log." >&2
    exit 1
  fi
  if curl --fail --silent --max-time 2 http://localhost:8081/status | grep -q 'packager-status:running'; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" != true ]; then
  echo "Metro did not become ready; see metro.log." >&2
  exit 1
fi
curl --fail --silent --show-error --max-time 180 \
  'http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true&minify=false' \
  --output /dev/null
DEV_CLIENT_URL='exp+kwilt://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'
xcrun simctl openurl "$SIMULATOR_ID" "$DEV_CLIENT_URL"
maestro --device "$SIMULATOR_ID" test \
  --debug-output artifacts/maestro --test-output-dir artifacts/maestro --flatten-debug-output \
  -e "DEV_CLIENT_URL=$DEV_CLIENT_URL" "$@"
