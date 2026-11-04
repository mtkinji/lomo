#!/usr/bin/env bash
set -euo pipefail
simulator_id=$(xcrun simctl list devices available --json | node -e '
  let input=""; process.stdin.on("data", x => input += x); process.stdin.on("end", () => {
    const devices = Object.entries(JSON.parse(input).devices).filter(([runtime]) => runtime.includes(".iOS-"))
      .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true })).flatMap(([, devices]) => devices);
    const device = devices.find(d => d.isAvailable && d.name.startsWith("iPhone"));
    if (!device) throw new Error("No available iPhone Simulator");
    process.stdout.write(device.udid);
  });')
xcrun simctl boot "$simulator_id" || true
xcrun simctl bootstatus "$simulator_id" -b
printf 'SIMULATOR_ID=%s\n' "$simulator_id" >> "$GITHUB_ENV"
