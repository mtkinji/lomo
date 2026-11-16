#!/usr/bin/env bash
set -euo pipefail

# Build only the current remote main commit, including detached CI/tag checkouts.
# Fetch failures are failures: a stale local tracking ref is not release evidence.
git fetch --quiet origin refs/heads/main:refs/remotes/origin/main
release_head=$(git rev-parse HEAD)
main_head=$(git rev-parse refs/remotes/origin/main)
checkout_changes=$(git status --porcelain)
if [[ -n "$checkout_changes" ]]; then
  echo '[kwilt] TestFlight requires a clean checkout. Commit and merge changes first.' >&2
  exit 2
fi
if [[ "$release_head" != "$main_head" ]]; then
  echo '[kwilt] TestFlight requires the current origin/main commit. Merge and update main first.' >&2
  exit 2
fi
printf '[kwilt] Verified TestFlight source: origin/main at %s\n' "$release_head"
