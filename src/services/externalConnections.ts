import { getSupabaseClient } from './backend/supabaseClient';

export type ExternalConnection = {
  client_id: string;
  client_name: string;
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

export async function fetchExternalConnections(): Promise<ExternalConnectionsResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('external-connections', {
    method: 'GET',
  });
  if (error) throw new Error(error.message || 'Unable to load connected tools.');
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
  if (error) throw new Error(error.message || 'Unable to revoke this connection.');
}
