export type DisconnectConnectionRecord = {
  id: string;
  updatedAt: string;
  accountCount: number;
};

export type DisconnectMoneyConnectionDependencies = {
  loadOwnedConnection(userId: string, connectionId: string): Promise<DisconnectConnectionRecord | null>;
  loadAccessToken(connectionId: string): Promise<string | null>;
  removeProviderItem(accessToken: string): Promise<void>;
  markDisconnected(input: {
    userId: string; connectionId: string; expectedUpdatedAt: string;
  }): Promise<{ confirmedAt: string } | null>;
};

export class DisconnectMoneyConnectionError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function disconnectMoneyConnection(input: {
  userId: string; connectionId: unknown; expectedUpdatedAt: unknown;
}, dependencies: DisconnectMoneyConnectionDependencies) {
  const connectionId = text(input.connectionId);
  const expectedUpdatedAt = text(input.expectedUpdatedAt);
  if (!connectionId || !expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))) {
    throw new DisconnectMoneyConnectionError('invalid_request', 'Choose one current connection.', 400);
  }
  const connection = await dependencies.loadOwnedConnection(input.userId, connectionId);
  if (!connection) {
    throw new DisconnectMoneyConnectionError('connection_not_found', 'That connection is no longer available.', 404);
  }
  if (connection.updatedAt !== expectedUpdatedAt) {
    throw new DisconnectMoneyConnectionError('connection_stale', 'That connection changed. Refresh before continuing.', 409);
  }
  const accessToken = await dependencies.loadAccessToken(connectionId);
  if (!accessToken) {
    throw new DisconnectMoneyConnectionError('provider_token_missing', 'The provider connection cannot be verified.', 409);
  }

  // A provider exception deliberately escapes before any local success write.
  await dependencies.removeProviderItem(accessToken);
  const confirmation = await dependencies.markDisconnected({
    userId: input.userId, connectionId, expectedUpdatedAt,
  });
  if (!confirmation) {
    throw new DisconnectMoneyConnectionError(
      'disconnect_confirmation_failed',
      'The provider accepted the disconnect, but Kwilt could not confirm local completion. Refresh before retrying.',
      409,
    );
  }
  return {
    connectionId,
    disconnectedAccountCount: connection.accountCount,
    confirmedAt: confirmation.confirmedAt,
  };
}
