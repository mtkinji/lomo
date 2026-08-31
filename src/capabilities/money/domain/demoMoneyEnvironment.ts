type DemoMetadataUser = {
  app_metadata?: Record<string, unknown> | null;
};

type MoneyEnvironmentSnapshot = {
  connections?: Array<{ environment?: string | null }>;
};

export function canReadSandboxMoneyData(
  user: DemoMetadataUser,
  isDevelopment: boolean,
): boolean {
  if (isDevelopment) return true;
  const fixtureVersion = user.app_metadata?.kwilt_demo_fixture_version;
  return typeof fixtureVersion === 'string' && fixtureVersion.trim().length > 0;
}

export function shouldSyncConnectedMoneyActivity(
  snapshot: MoneyEnvironmentSnapshot | null | undefined,
): boolean {
  if (!snapshot?.connections?.length) return true;
  return snapshot.connections.some(
    (connection) => connection.environment !== 'sandbox',
  );
}
