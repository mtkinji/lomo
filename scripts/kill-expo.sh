#!/bin/bash

set -euo pipefail

echo "[kill-expo] Ensuring no stale Expo/Metro processes are running..."

PORTS=(8081 8082 19000 19001 19002)

for PORT in "${PORTS[@]}"; do
  if PIDS=$(lsof -ti tcp:${PORT} 2>/dev/null); then
    if [[ -n "${PIDS}" ]]; then
      echo "[kill-expo] Killing processes on port ${PORT}: ${PIDS}"
      kill -9 ${PIDS} || true
    fi
  fi
done

# Clean up any expo or metro processes that might not be tied to the ports above.
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true

echo "[kill-expo] Done."

