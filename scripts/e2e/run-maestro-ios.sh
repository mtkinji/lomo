#!/usr/bin/env bash
set -euo pipefail

: "${SIMULATOR_ID:?Set SIMULATOR_ID to the installed test simulator}"
if [ "$#" -eq 0 ]; then
  echo "Pass the Maestro flow files or directory to run." >&2
  exit 1
fi
artifact_dir=artifacts/maestro
project_dir=.
if [ "${KWILT_MAESTRO_BUDGET_FIXTURE:-0}" = 1 ]; then
  project_dir=scripts/money/native-harness
  artifact_dir=artifacts/maestro/budget-fixture
fi
case "${KWILT_MAESTRO_APP_FIXTURE:-}" in
  '') ;;
  auth|workspace)
    if [ "${KWILT_MAESTRO_BUDGET_FIXTURE:-0}" = 1 ]; then
      echo "Choose one isolated native fixture per run." >&2
      exit 1
    fi
    project_dir=scripts/e2e/native-harness
    artifact_dir="artifacts/maestro/${KWILT_MAESTRO_APP_FIXTURE}-fixture"
    ;;
  *) echo "Unknown native app fixture." >&2; exit 1 ;;
esac
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
runtime_tmp=$(mktemp -d)
cleanup() {
  if [ -n "${manifest_pid:-}" ]; then kill "$manifest_pid" 2>/dev/null || true; wait "$manifest_pid" 2>/dev/null || true; fi
  kill "$metro_pid" 2>/dev/null || true; wait "$metro_pid" 2>/dev/null || true
  rm -rf "$runtime_tmp"
}
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
# Warm the actual development-client launch asset, including Hermes/lazy
# transforms. A generic .bundle request builds a different cache entry and
# leaves cold hosted runners compiling during the UI assertion timeout.
manifest_started=$SECONDS
manifest_json=$(curl --fail --silent --show-error --max-time 60 \
  -H 'expo-platform: ios' -H 'accept: application/expo+json' \
  http://localhost:8081/)
printf '%s' "$manifest_json" > "$runtime_tmp/manifest.json"
launch_asset=$(printf '%s' "$manifest_json" | node -e '

    const fs = require("node:fs");
    const manifest = JSON.parse(fs.readFileSync(0, "utf8"));
    const url = new URL(manifest.launchAsset?.url);
    if (url.origin !== "http://localhost:8081") throw new Error("Expected local Metro launch asset");
    process.stdout.write(url.href);
  ')
printf 'manifest\t%s\tsuccess\n' "$((SECONDS-manifest_started))" >> "$artifact_dir/timings.tsv"
bundle_started=$SECONDS
curl --fail --silent --show-error --max-time 900 "$launch_asset" --output /dev/null
printf 'bundle\t%s\tsuccess\n' "$((SECONDS-bundle_started))" >> "$artifact_dir/timings.tsv"
echo "[native] Exact bundle ready in $((SECONDS-bundle_started))s; beginning UI acceptance."
# Expo's development-tools tutorial otherwise covers the app on fresh installs.
# This affects the dev menu only; Kwilt's onboarding and sign-in remain enabled.
project_url='http://localhost:8081'
if [ "$project_dir" != . ]; then
  script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  node "$script_dir/fixture-manifest.mjs" "$runtime_tmp/manifest.json" "$runtime_tmp/manifest-url" > "$artifact_dir/manifest-server.log" 2>&1 &
  manifest_pid=$!
  for attempt in {1..60}; do
    if [ -s "$runtime_tmp/manifest-url" ]; then break; fi
    if ! kill -0 "$manifest_pid" 2>/dev/null; then echo 'Fixture manifest server exited.' >&2; exit 1; fi
    sleep 0.1
  done
  project_url=$(cat "$runtime_tmp/manifest-url")
fi
DEV_CLIENT_URL=$(node -e 'process.stdout.write("exp+kwilt://expo-development-client/?url=" + encodeURIComponent(process.argv[1] + "?disableOnboarding=1"))' "$project_url")
# The isolated flow clears development-client state and owns its one URL open.
# Pre-opening it here saves a recent project that can auto-load during launchApp
# while the flow opens the same project again.
if [ "$project_dir" = . ]; then
  xcrun simctl openurl "$SIMULATOR_ID" "$DEV_CLIENT_URL"
fi
ui_started=$SECONDS
if maestro --device "$SIMULATOR_ID" test \
  --debug-output "$artifact_dir" --test-output-dir "$artifact_dir" --flatten-debug-output \
  -e "DEV_CLIENT_URL=$DEV_CLIENT_URL" "$@"; then result=0; else result=$?; fi
printf 'ui\t%s\t%s\n' "$((SECONDS-ui_started))" "$result" >> "$artifact_dir/timings.tsv"
exit "$result"
