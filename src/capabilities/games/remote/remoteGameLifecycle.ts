export function remoteRematchPresentation(isHost: boolean) {
  return isHost
    ? { canRestart: true, primaryCopy: 'Play again with this group' }
    : { canRestart: false, primaryCopy: 'Waiting for the host to start another game' };
}
