import { getSupabaseClient } from './backend/supabaseClient';

type EdgeFunctionErrorDetails = {
  message: string | null;
  status: number | null;
  code: string | null;
  serverMessage: string | null;
  body: unknown;
};

export type ExternalConnection = {
  client_id: string;
  client_name: string;
  connection_type?: 'oauth' | 'pat';
  surface: string;
  scope: string;
  connected_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  write_count: number;
  last_action_at: string | null;
};

export type ExternalActionHistoryItem = {
  id: string;
  client_id: string | null;
  surface: string;
  tool_name: string;
  tool_kind: string;
  object_type: string | null;
  object_id: string | null;
  success: boolean;
  error_code: string | null;
  result_status: string | null;
  result_summary: string | null;
  created_at: string;
};

export type ExternalConnectionsResult = {
  connections: ExternalConnection[];
  actions: ExternalActionHistoryItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseServerError(body: unknown): Pick<EdgeFunctionErrorDetails, 'code' | 'serverMessage'> {
  if (!isRecord(body)) return { code: null, serverMessage: null };

  const nestedError = isRecord(body.error) ? body.error : null;
  const errorString = stringValue(body.error);

  return {
    code:
      stringValue(body.code) ??
      stringValue(body.error_code) ??
      stringValue(nestedError?.code) ??
      errorString,
    serverMessage:
      stringValue(body.message) ??
      stringValue(nestedError?.message) ??
      (errorString && errorString.includes(' ') ? errorString : null),
  };
}

async function readEdgeFunctionError(error: unknown): Promise<EdgeFunctionErrorDetails> {
  const err = isRecord(error) ? error : {};
  const context = err.context;
  const response = context instanceof Response ? context : null;
  let body: unknown = null;

  if (response) {
    try {
      body = await response.clone().json();
    } catch {
      try {
        body = await response.clone().text();
      } catch {
        body = null;
      }
    }
  }

  const parsed = parseServerError(body);
  return {
    message: stringValue(err.message),
    status: response?.status ?? null,
    code: parsed.code,
    serverMessage: parsed.serverMessage,
    body,
  };
}

function connectedToolsMessage(details: EdgeFunctionErrorDetails, fallback: string): string {
  const code = details.code;

  if (details.status === 401 || code === 'missing_authorization' || code === 'unauthorized') {
    return 'Your Kwilt session needs refreshing. Please sign in again, then reopen Connected tools.';
  }

  if (details.status === 404 || code === 'NOT_FOUND') {
    return 'Connected tools is not available from the server yet. Please try again after the latest backend deploy finishes.';
  }

  if (details.status === 503 || code === 'service_unavailable' || code === 'auth_unavailable') {
    return 'Connected tools is temporarily unavailable. Please try again in a moment.';
  }

  if (
    code === 'connections_read_failed' ||
    code === 'actions_read_failed' ||
    code === 'manual_connections_read_failed' ||
    code === 'manual_actions_read_failed'
  ) {
    return 'Connected tools could not read your connection audit trail. Please try again in a moment.';
  }

  if (details.serverMessage) return details.serverMessage;
  if (details.status) return `Connected tools request failed with status ${details.status}. Please try again.`;
  return fallback;
}

async function throwConnectedToolsError(error: unknown, fallback: string): Promise<never> {
  const details = await readEdgeFunctionError(error);
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[external-connections] Edge Function failed', details);
  }
  throw new Error(connectedToolsMessage(details, fallback));
}

export async function fetchExternalConnections(): Promise<ExternalConnectionsResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('external-connections', {
    method: 'GET',
  });
  if (error) await throwConnectedToolsError(error, 'Unable to load connected tools. Please try again.');
  const result = data as Partial<ExternalConnectionsResult> | null;
  return {
    connections: Array.isArray(result?.connections) ? result.connections : [],
    actions: Array.isArray(result?.actions) ? result.actions : [],
  };
}

export async function revokeExternalConnection(clientId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.functions.invoke('external-connections', {
    method: 'POST',
    body: { action: 'revoke', client_id: clientId },
  });
  if (error) await throwConnectedToolsError(error, 'Unable to revoke this connection. Please try again.');
}
