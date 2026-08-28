import type {
  ExternalActionHistoryItem,
  ExternalConnection,
  ExternalConnectionsResult,
} from '../../../services/externalConnections';

export const CONNECTED_TOOL_PROVIDER_IDS = ['chatgpt', 'claude', 'cursor', 'codex', 'other'] as const;
export type ConnectedToolProviderId = typeof CONNECTED_TOOL_PROVIDER_IDS[number];

export type ConnectedToolBoundary = {
  load(): Promise<ExternalConnectionsResult>;
  revoke(connectionId: string): Promise<void>;
};

export class ConnectedToolConflictError extends Error {
  constructor() {
    super('The connection changed after this revocation was reviewed.');
    this.name = 'ConnectedToolConflictError';
  }
}

function connectionSummary(connection: ExternalConnection) {
  return {
    connectionId: connection.client_id,
    name: connection.client_name,
    surface: connection.surface,
    scopes: connection.scope.split(/\s+/).map((scope) => scope.trim()).filter(Boolean),
    connectedAt: connection.connected_at,
    lastUsedAt: connection.last_used_at,
    revokedAt: connection.revoked_at,
    writeCount: connection.write_count,
    lastActionAt: connection.last_action_at,
  };
}

function actionSummary(action: ExternalActionHistoryItem) {
  return {
    actionId: action.id,
    toolName: action.tool_name,
    success: action.success,
    errorCode: action.error_code,
    resultStatus: action.result_status,
    createdAt: action.created_at,
  };
}

export function parseConnectedToolConnectRequest(input: unknown): { providerId: ConnectedToolProviderId } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.providerId !== 'string'
    || !(CONNECTED_TOOL_PROVIDER_IDS as readonly string[]).includes(record.providerId)) return null;
  return { providerId: record.providerId as ConnectedToolProviderId };
}

export function createConnectedToolActions(boundary: ConnectedToolBoundary) {
  return {
    loadNativeInventory: () => boundary.load(),
    async list() {
      const result = await boundary.load();
      return { connections: result.connections.map(connectionSummary) };
    },
    async get(input: { connectionId: string }) {
      const result = await boundary.load();
      const connection = result.connections.find((item) => item.client_id === input.connectionId);
      if (!connection) throw new Error('That connected tool is not available.');
      return {
        connection: connectionSummary(connection),
        recentActions: result.actions
          .filter((action) => action.client_id === input.connectionId)
          .slice(0, 10)
          .map(actionSummary),
      };
    },
    async revoke(input: { connectionId: string; expectedConnectedAt: string | null }) {
      const before = await boundary.load();
      const connection = before.connections.find((item) => item.client_id === input.connectionId);
      if (!connection || connection.revoked_at) throw new Error('That active connected tool is not available.');
      if (connection.connected_at !== input.expectedConnectedAt) throw new ConnectedToolConflictError();
      await boundary.revoke(input.connectionId);
      const after = await boundary.load();
      const confirmed = after.connections.find((item) => item.client_id === input.connectionId);
      if (confirmed && !confirmed.revoked_at) throw new Error('The provider did not confirm that the connection was revoked.');
      return { connectionId: input.connectionId, revoked: true, revokedAt: confirmed?.revoked_at ?? null };
    },
  };
}
