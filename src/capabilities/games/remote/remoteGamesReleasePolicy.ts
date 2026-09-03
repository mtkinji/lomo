export function resolveRemoteGamesReleaseEnabled({ isDev }: { isDev: boolean; override?: string }): boolean {
  return isDev;
}

// Anonymous remote rooms remain a development-only proving surface until they
// have contextual reporting and durable moderation identity.
export const REMOTE_GAMES_RELEASE_ENABLED = resolveRemoteGamesReleaseEnabled({
  isDev: __DEV__,
  override: process.env.EXPO_PUBLIC_REMOTE_GAMES_ENABLED,
});
