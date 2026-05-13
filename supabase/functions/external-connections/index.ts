import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getBearerToken(req: Request): string | null {
  const header = (req.headers.get('authorization') ?? '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseAnon() {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = (Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '').trim();
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser(req: Request): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, response: json(401, { error: 'missing_authorization' }) };
  const anon = getSupabaseAnon();
  if (!anon) return { ok: false, response: json(503, { error: 'auth_unavailable' }) };
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { ok: false, response: json(401, { error: 'unauthorized' }) };
  return { ok: true, userId: String(data.user.id) };
}

async function listConnections(admin: any, userId: string) {
  const { data: tokenRows, error: tokenError } = await admin
    .from('kwilt_external_oauth_tokens')
    .select('client_id,scope,created_at,last_used_at,revoked_at,kwilt_external_oauth_clients(client_name,surface,revoked_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (tokenError) throw new Error('connections_read_failed');

  const { data: actionRows, error: actionError } = await admin
    .from('kwilt_external_capture_log')
    .select('id,surface,oauth_client_id,tool_name,tool_kind,object_type,object_id,success,error_code,result_status,result_summary,created_at')
    .eq('user_id', userId)
    .in('tool_kind', ['write'])
    .order('created_at', { ascending: false })
    .limit(50);
  if (actionError) throw new Error('actions_read_failed');

  const connectionMap = new Map<string, any>();
  for (const row of Array.isArray(tokenRows) ? tokenRows as any[] : []) {
    const client = Array.isArray(row.kwilt_external_oauth_clients)
      ? row.kwilt_external_oauth_clients[0]
      : row.kwilt_external_oauth_clients;
    const key = String(row.client_id);
    const existing = connectionMap.get(key);
    const lastUsedAt = row.last_used_at ?? existing?.last_used_at ?? null;
    connectionMap.set(key, {
      client_id: key,
      client_name: String(client?.client_name ?? 'Kwilt connector'),
      surface: String(client?.surface ?? 'custom'),
      scope: String(row.scope ?? 'read'),
      connected_at: existing?.connected_at ?? row.created_at ?? null,
      last_used_at: lastUsedAt,
      revoked_at: row.revoked_at ?? client?.revoked_at ?? existing?.revoked_at ?? null,
    });
  }

  const connections = Array.from(connectionMap.values()).map((connection) => {
    const actions = (Array.isArray(actionRows) ? actionRows as any[] : []).filter(
      (action) => String(action.oauth_client_id ?? '') === connection.client_id,
    );
    return {
      ...connection,
      write_count: actions.length,
      last_action_at: actions[0]?.created_at ?? null,
    };
  });

  return {
    connections,
    actions: (Array.isArray(actionRows) ? actionRows as any[] : []).map((action) => ({
      id: String(action.id),
      client_id: action.oauth_client_id ? String(action.oauth_client_id) : null,
      surface: String(action.surface ?? 'custom'),
      tool_name: String(action.tool_name),
      tool_kind: String(action.tool_kind),
      object_type: action.object_type ? String(action.object_type) : null,
      object_id: action.object_id ? String(action.object_id) : null,
      success: Boolean(action.success),
      error_code: action.error_code ? String(action.error_code) : null,
      result_status: action.result_status ? String(action.result_status) : null,
      result_summary: action.result_summary ? String(action.result_summary) : null,
      created_at: String(action.created_at),
    })),
  };
}

async function revokeConnection(admin: any, userId: string, body: Record<string, unknown>) {
  const clientId = typeof body.client_id === 'string' && body.client_id.trim() ? body.client_id.trim() : null;
  if (!clientId) return json(400, { error: 'missing_client_id' });
  const revokedAt = new Date().toISOString();
  const { data, error } = await admin
    .from('kwilt_external_oauth_tokens')
    .update({ revoked_at: revokedAt })
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .select('id');
  if (error) return json(500, { error: 'revoke_failed' });
  return json(200, { revoked: Array.isArray(data) ? data.length : 0, revoked_at: revokedAt });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const who = await requireUser(req);
  if (!who.ok) return who.response;
  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: 'service_unavailable' });

  try {
    if (req.method === 'GET') return json(200, await listConnections(admin, who.userId));
    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      if (body.action === 'revoke') return revokeConnection(admin, who.userId, body);
    }
    return json(405, { error: 'method_not_allowed' });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'external_connections_failed' });
  }
});
