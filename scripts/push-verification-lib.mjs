const ZERO_SHA_PATTERN = /^0+$/;

export function parsePrePushUpdates(input) {
  return String(input ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const fields = line.split(/\s+/);
      if (fields.length !== 4) {
        throw new Error(`Invalid pre-push ref update: ${line}`);
      }
      const [localRef, localSha, remoteRef, remoteSha] = fields;
      return { localRef, localSha, remoteRef, remoteSha };
    });
}

export function findMainPush(updates) {
  return (
    updates.find(
      (update) =>
        update.remoteRef === 'refs/heads/main' &&
        !ZERO_SHA_PATTERN.test(update.localSha),
    ) ?? null
  );
}

export function validateMainPushCandidate(
  update,
  { headSha, statusPorcelain },
) {
  if (update.localSha !== headSha) {
    return `The commit being pushed to main (${update.localSha}) does not match HEAD (${headSha}). Check out the exact candidate before pushing.`;
  }
  if (statusPorcelain.trim()) {
    return 'The working tree is not clean. Commit or remove local changes so the tested checkout exactly matches the main candidate.';
  }
  return null;
}
