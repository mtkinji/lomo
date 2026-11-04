#!/usr/bin/env bash
set -euo pipefail

: "${SIMULATOR_ID:?Set SIMULATOR_ID to the installed test simulator}"
if [ "$#" -eq 0 ]; then
  echo "Pass the Maestro flow files or directory to run." >&2
  exit 1
fi
artifact_dir=artifacts/maestro
project_dir=.
bundle_path=.expo/.virtual-metro-entry.bundle
if [ "${KWILT_MAESTRO_BUDGET_FIXTURE:-0}" = 1 ]; then
  project_dir=scripts/money/native-harness
  bundle_path=index.bundle
  artifact_dir=artifacts/maestro/budget-fixture
fi
mkdir -p "$artifact_dir"
if curl --fail --silent --max-time 2 http://localhost:8081/status >/dev/null 2>&1; then
  echo "Port 8081 already serves a runtime; refusing to test unrelated JavaScript." >&2
  exit 1
fi

# Debug simulator builds skip the embedded bundle. Own Metro for this run and
# fail before UI assertions when JavaScript cannot be served.
CI=1 EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 REACT_NATIVE_PACKAGER_HOSTNAME=localhost \
  node_modules/.bin/expo start "$project_dir" --dev-client --localhost --port 8081 \
  >"$artifact_dir/metro.log" 2>&1 &
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
  "http://localhost:8081/$bundle_path?platform=ios&dev=true&minify=false" \
  --output /dev/null
DEV_CLIENT_URL='exp+kwilt://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'
# The isolated flow clears development-client state and owns its one URL open.
# Pre-opening it here saves a recent project that can auto-load during launchApp
# while the flow opens the same project again.
if [ "${KWILT_MAESTRO_BUDGET_FIXTURE:-0}" != 1 ]; then
  xcrun simctl openurl "$SIMULATOR_ID" "$DEV_CLIENT_URL"
fi
maestro --device "$SIMULATOR_ID" test \
  --debug-output "$artifact_dir" --test-output-dir "$artifact_dir" --flatten-debug-output \
  -e "DEV_CLIENT_URL=$DEV_CLIENT_URL" "$@"
