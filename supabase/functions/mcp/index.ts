// Kwilt External AI Connector MCP server (OAuth + Streamable HTTP).
//
// This function is separate from `kwilt-mcp`, which remains the PAT-based
// operator/Cursor MCP surface. This one is the hosted remote connector intended
// for Claude/ChatGPT directory-style installs.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  EXTERNAL_MCP_READ_TOOLS,
  EXTERNAL_MCP_WRITE_TOOLS,
  normalizeGetArcArgs,
  normalizeGetGoalArgs,
  normalizeListGoalsArgs,
  normalizeListRecentActivitiesArgs,
  summarizeActivity,
  summarizeArc,
  summarizeChapter,
  summarizeGoal,
  summarizeShowUpStatus,
} from '../_shared/externalMcp.ts';
import {
  addGoalCheckinForUser,
  createActivityForUser,
  createArcForUser,
  createGoalForUser,
  deleteActivityForUser,
  deleteArcForUser,
  deleteGoalForUser,
  markActivityDoneForUser,
  setFocusTodayForUser,
  updateActivityForUser,
  updateArcForUser,
  updateChapterUserNoteForUser,
  updateGoalForUser,
  type ExternalWriteResult,
} from '../_shared/externalMcpWrite.ts';
import {
  buildAuthorizationServerMetadata,
  buildProtectedResourceMetadata,
  normalizeClientRegistration,
  normalizeOAuthScope,
  verifyPkceChallenge,
} from '../_shared/externalMcpOAuth.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

type ExternalTokenContext = {
  userId: string;
  clientId: string;
  surface: 'claude' | 'chatgpt' | 'custom';
  scope: string;
  tokenId: string;
};

const MCP_PROTOCOL_VERSION = '2024-11-05';
const ALL_EXTERNAL_MCP_TOOLS = [...EXTERNAL_MCP_READ_TOOLS, ...EXTERNAL_MCP_WRITE_TOOLS];

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(status: number, body: JsonValue, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

function oauthChallenge(req: Request) {
  const baseUrl = getBaseUrl(req);
  const metadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;
  return `Bearer resource_metadata="${metadataUrl}"`;
}

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: location,
    },
  });
}

function getBaseUrl(req: Request): string {
  const configured = (Deno.env.get('KWILT_MCP_ISSUER') ?? '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, '');
  const wellKnownIndex = pathname.indexOf('/.well-known/');
  if (wellKnownIndex >= 0) return `${url.origin}${pathname.slice(0, wellKnownIndex)}`.replace(/\/+$/, '');
  const endpoint = pathname.split('/').pop() ?? '';
  if (['authorize', 'register', 'token', 'revoke', 'approve'].includes(endpoint)) {
    const withoutEndpoint = pathname.split('/').slice(0, -1).join('/');
    return `${url.origin}${withoutEndpoint.replace(/\/authorize$/, '')}`.replace(/\/+$/, '');
  }
  return `${url.origin}${pathname}`.replace(/\/+$/, '');
}

function getSiteUrl(): string {
  return (Deno.env.get('KWILT_SITE_URL') ?? 'https://kwilt.app').replace(/\/+$/, '');
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

function getBearerToken(req: Request): string | null {
  const header = (req.headers.get('authorization') ?? '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function scopeSet(scope: string): Set<string> {
  return new Set(scope.split(/\s+/).filter(Boolean));
}

function hasScope(context: ExternalTokenContext, scope: 'read' | 'write'): boolean {
  return scopeSet(context.scope).has(scope);
}

function getToolScope(name: string): 'read' | 'write' | null {
  const tool = ALL_EXTERNAL_MCP_TOOLS.find((candidate) => candidate.name === name);
  return tool?.scope === 'write' ? 'write' : tool ? 'read' : null;
}

function getIdempotencyKey(args: unknown): string | null {
  return asString(asRecord(args)?.idempotency_key);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomToken(prefix: string, bytes = 32): string {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  return `${prefix}_${base64Url(raw)}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = new URLSearchParams(await req.text());
    return Object.fromEntries(form.entries());
  }
  return (await req.json().catch(() => ({}))) as Record<string, unknown>;
}

async function requireSupabaseUser(req: Request): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, response: json(401, { error: 'missing_authorization' }) };
  const anon = getSupabaseAnon();
  if (!anon) return { ok: false, response: json(503, { error: 'auth_unavailable' }) };
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { ok: false, response: json(401, { error: 'unauthorized' }) };
  return { ok: true, userId: String(data.user.id) };
}

async function requireExternalToken(req: Request): Promise<
  | { ok: true; admin: any; context: ExternalTokenContext }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }, { 'WWW-Authenticate': oauthChallenge(req) }),
    };
  }
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, response: json(503, { error: { message: 'Service unavailable', code: 'provider_unavailable' } }) };

  const tokenHash = await sha256Hex(token);
  const { data, error } = await admin
    .from('kwilt_external_oauth_tokens')
    .select('id,user_id,client_id,scope,expires_at,revoked_at,kwilt_external_oauth_clients(surface,revoked_at)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  const row = data as any;
  const client = Array.isArray(row?.kwilt_external_oauth_clients)
    ? row.kwilt_external_oauth_clients[0]
    : row?.kwilt_external_oauth_clients;
  if (error || !row || row.revoked_at || client?.revoked_at || new Date(String(row.expires_at)).getTime() <= Date.now()) {
    return { ok: false, response: json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } }) };
  }
  const scope = normalizeOAuthScope(row.scope);
  if (!scope) return { ok: false, response: json(403, { error: { message: 'Invalid scope', code: 'insufficient_scope' } }) };

  try {
    await admin.from('kwilt_external_oauth_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);
  } catch {
    // Best-effort only.
  }

  return {
    ok: true,
    admin,
    context: {
      userId: String(row.user_id),
      clientId: String(row.client_id),
      surface: client?.surface === 'claude' || client?.surface === 'chatgpt' ? client.surface : 'custom',
      scope,
      tokenId: String(row.id),
    },
  };
}

function rpcError(id: string | number | null, code: number, message: string, data?: JsonValue) {
  const error: JsonObject = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id, error };
}

function rpcResult(id: string | number | null, result: JsonValue) {
  return { jsonrpc: '2.0', id, result };
}

function rpcId(raw: unknown): string | number | null {
  return typeof raw === 'string' || typeof raw === 'number' ? raw : null;
}

async function auditToolCall(
  admin: any,
  context: ExternalTokenContext,
  params: {
    toolName: string;
    toolKind: 'read' | 'write';
    scopeUsed: 'read' | 'write';
    args: unknown;
    success: boolean;
    errorCode?: string | null;
    requestId?: string | null;
    userAgent?: string | null;
    objectType?: string | null;
    objectId?: string | null;
    idempotencyKeyHash?: string | null;
    resultStatus?: 'success' | 'error' | 'idempotent_replay' | null;
    resultSummary?: string | null;
  },
) {
  try {
    await admin.from('kwilt_external_capture_log').insert({
      user_id: context.userId,
      surface: context.surface,
      oauth_client_id: context.clientId,
      tool_name: params.toolName,
      tool_kind: params.toolKind,
      input_hash: await sha256Hex(JSON.stringify(params.args ?? {})),
      success: params.success,
      error_code: params.errorCode ?? null,
      request_id_hash: params.requestId ? await sha256Hex(params.requestId) : null,
      user_agent_hash: params.userAgent ? await sha256Hex(params.userAgent) : null,
      object_type: params.objectType ?? null,
      object_id: params.objectId ?? null,
      idempotency_key_hash: params.idempotencyKeyHash ?? null,
      scope_used: params.scopeUsed,
      result_status: params.resultStatus ?? (params.success ? 'success' : 'error'),
      result_summary: params.resultSummary ?? null,
    });
  } catch {
    // Audit is best-effort; tool behavior should not fail because logging failed.
  }
}

async function capturePosthogEvent(params: {
  distinctId: string;
  event: 'ExternalConnectorInstalled' | 'ExternalToolCalled';
  properties: JsonObject;
}) {
  const apiKey = (Deno.env.get('KWILT_POSTHOG_PROJECT_API_KEY') ?? '').trim();
  if (!apiKey) return;
  const host = (Deno.env.get('KWILT_POSTHOG_HOST') ?? 'us.i.posthog.com').trim().replace(/\/+$/, '');
  const url = host.startsWith('http') ? `${host}/capture/` : `https://${host}/capture/`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event: params.event,
        distinct_id: params.distinctId,
        properties: params.properties,
      }),
    });
  } catch {
    // Analytics should never block connector behavior.
  }
}

function withRowUpdatedAt(row: any): unknown {
  return {
    ...(asRecord(row?.data) ?? {}),
    updated_at: row?.updated_at,
  };
}

async function handleReadTool(admin: any, context: ExternalTokenContext, name: string, args: unknown): Promise<JsonValue> {
  if (name === 'list_arcs') {
    const limit = Math.max(1, Math.min(asInt(asRecord(args)?.limit) ?? 50, 100));
    const status = asString(asRecord(args)?.status);
    let query = admin
      .from('kwilt_arcs')
      .select('id,data,updated_at')
      .eq('user_id', context.userId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });
    if (status) query = query.filter('data->>status', 'eq', status);
    const { data, error } = await query.limit(limit);
    if (error) throw new Error('list_arcs_failed');
    const arcs = ((Array.isArray(data) ? data : []) as any[])
      .map(withRowUpdatedAt)
      .map(summarizeArc);
    return { arcs };
  }

  if (name === 'get_arc') {
    const { arcId } = normalizeGetArcArgs(args);
    if (!arcId) throw new Error('missing_arc_id');
    const { data: arcRows, error } = await admin
      .from('kwilt_arcs')
      .select('id,data,updated_at')
      .eq('user_id', context.userId)
      .eq('id', arcId)
      .eq('is_deleted', false)
      .limit(1);
    if (error) throw new Error('get_arc_failed');
    const arcRow = Array.isArray(arcRows) ? arcRows[0] : null;
    if (!arcRow) throw new Error('arc_not_found');

    const { data: goalRows } = await admin
      .from('kwilt_goals')
      .select('id,data,updated_at')
      .eq('user_id', context.userId)
      .eq('is_deleted', false)
      .filter('data->>arcId', 'eq', arcId)
      .order('updated_at', { ascending: false })
      .limit(5);
    const recentGoals = ((Array.isArray(goalRows) ? goalRows : []) as any[])
      .map(withRowUpdatedAt)
      .map(summarizeGoal);

    return { arc: summarizeArc(withRowUpdatedAt(arcRow)), recent_goals: recentGoals };
  }

  if (name === 'list_goals') {
    const normalized = normalizeListGoalsArgs(args);
    let query = admin
      .from('kwilt_goals')
      .select('id,data,updated_at')
      .eq('user_id', context.userId)
      .eq('is_deleted', false)
      .in('data->>status', normalized.statuses)
      .order('updated_at', { ascending: false });
    if (normalized.arcId) query = query.filter('data->>arcId', 'eq', normalized.arcId);
    const { data, error } = await query.limit(normalized.limit);
    if (error) throw new Error('list_goals_failed');
    const goals = ((Array.isArray(data) ? data : []) as any[])
      .map(withRowUpdatedAt)
      .map(summarizeGoal);
    return { goals };
  }

  if (name === 'get_goal') {
    const { goalId } = normalizeGetGoalArgs(args);
    if (!goalId) throw new Error('missing_goal_id');
    const { data: goalRows, error } = await admin
      .from('kwilt_goals')
      .select('id,data,updated_at')
      .eq('user_id', context.userId)
      .eq('id', goalId)
      .eq('is_deleted', false)
      .limit(1);
    if (error) throw new Error('get_goal_failed');
    const goalRow = Array.isArray(goalRows) ? goalRows[0] : null;
    if (!goalRow) throw new Error('goal_not_found');

    const { data: activityRows } = await admin
      .from('kwilt_activities')
      .select('id,data,updated_at')
      .eq('user_id', context.userId)
      .eq('is_deleted', false)
      .filter('data->>goalId', 'eq', goalId)
      .order('updated_at', { ascending: false })
      .limit(10);
    const recentActivities = ((Array.isArray(activityRows) ? activityRows : []) as any[])
      .map(withRowUpdatedAt)
      .map((activity) => summarizeActivity(activity, { includeRich: false }));

    return { goal: summarizeGoal(withRowUpdatedAt(goalRow)), recent_activities: recentActivities };
  }

  if (name === 'list_recent_activities') {
    const normalized = normalizeListRecentActivitiesArgs(args);
    const since = Date.now() - normalized.days * 24 * 60 * 60 * 1000;
    const sinceIso = new Date(since).toISOString();
    const { data, error } = await admin
      .from('kwilt_activities')
      .select('id,data,updated_at')
      .eq('user_id', context.userId)
      .eq('is_deleted', false)
      .gte('updated_at', sinceIso)
      .order('updated_at', { ascending: false })
      .limit(250);
    if (error) throw new Error('list_recent_activities_failed');
    const activities = ((Array.isArray(data) ? data : []) as any[])
      .map(withRowUpdatedAt)
      .map((activity) => summarizeActivity(activity, { includeRich: normalized.includeRich }));
    return { days: normalized.days, activities };
  }

  if (name === 'get_current_chapter') {
    const { data, error } = await admin
      .from('kwilt_chapters')
      .select('id,period_start,period_end,period_key,output_json,status,updated_at')
      .eq('user_id', context.userId)
      .eq('status', 'ready')
      .order('period_start', { ascending: false })
      .limit(1);
    if (error) throw new Error('get_current_chapter_failed');
    const chapter = Array.isArray(data) ? data[0] : null;
    return { chapter: chapter ? summarizeChapter(chapter) : null };
  }

  if (name === 'get_show_up_status') {
    const { data, error } = await admin
      .from('kwilt_streak_summaries')
      .select('last_show_up_date,current_show_up_streak,current_covered_show_up_streak,eligible_repair_until_ms')
      .eq('user_id', context.userId)
      .maybeSingle();
    if (error) throw new Error('get_show_up_status_failed');
    return { show_up: summarizeShowUpStatus(data ?? {}) };
  }

  throw new Error('unknown_tool');
}

async function findIdempotentWrite(admin: any, context: ExternalTokenContext, idempotencyKeyHash: string): Promise<JsonObject | null> {
  const { data } = await admin
    .from('kwilt_external_capture_log')
    .select('object_type,object_id,result_summary,result_status')
    .eq('user_id', context.userId)
    .eq('oauth_client_id', context.clientId)
    .eq('idempotency_key_hash', idempotencyKeyHash)
    .eq('success', true)
    .maybeSingle();
  const row = data as any;
  if (!row?.object_type || !row?.object_id) return null;
  return {
    idempotent_replay: true,
    object_type: String(row.object_type),
    object_id: String(row.object_id),
    result_summary: asString(row.result_summary) ?? 'Already completed.',
  };
}

async function handleWriteTool(admin: any, context: ExternalTokenContext, name: string, args: unknown): Promise<ExternalWriteResult> {
  switch (name) {
    case 'create_arc':
      return createArcForUser(admin, context.userId, args);
    case 'update_arc':
      return updateArcForUser(admin, context.userId, args);
    case 'delete_arc':
      return deleteArcForUser(admin, context.userId, args);
    case 'create_goal':
      return createGoalForUser(admin, context.userId, args);
    case 'update_goal':
      return updateGoalForUser(admin, context.userId, args);
    case 'delete_goal':
      return deleteGoalForUser(admin, context.userId, args);
    case 'add_goal_checkin':
      return addGoalCheckinForUser(admin, context.userId, args);
    case 'capture_activity':
      return createActivityForUser(admin, context.userId, args);
    case 'update_activity':
      return updateActivityForUser(admin, context.userId, args);
    case 'mark_activity_done':
      return markActivityDoneForUser(admin, context.userId, args);
    case 'set_focus_today':
      return setFocusTodayForUser(admin, context.userId, args);
    case 'delete_activity':
      return deleteActivityForUser(admin, context.userId, args);
    case 'update_chapter_user_note':
      return updateChapterUserNoteForUser(admin, context.userId, args);
    default:
      throw new Error('unknown_tool');
  }
}

async function handleRegister(req: Request) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: 'service_unavailable' });
  const body = await parseBody(req);
  const normalized = normalizeClientRegistration(body);
  if (!normalized.ok) return json(400, { error: normalized.error });

  const clientId = randomToken('kwilt_client', 18);
  const clientSecret = normalized.tokenEndpointAuthMethod === 'none' ? null : randomToken('kwilt_secret', 32);
  const { error } = await admin.from('kwilt_external_oauth_clients').insert({
    client_id: clientId,
    client_secret_hash: clientSecret ? await sha256Hex(clientSecret) : null,
    client_name: normalized.clientName,
    redirect_uris: normalized.redirectUris,
    grant_types: normalized.grantTypes,
    response_types: normalized.responseTypes,
    token_endpoint_auth_method: normalized.tokenEndpointAuthMethod,
    surface: normalized.surface,
  });
  if (error) return json(500, { error: 'client_registration_failed' });

  return json(201, {
    client_id: clientId,
    client_secret: clientSecret,
    client_name: normalized.clientName,
    redirect_uris: normalized.redirectUris,
    grant_types: normalized.grantTypes,
    response_types: normalized.responseTypes,
    token_endpoint_auth_method: normalized.tokenEndpointAuthMethod,
    client_id_issued_at: Math.floor(Date.now() / 1000),
  });
}

async function getClient(admin: any, clientId: string) {
  const { data } = await admin
    .from('kwilt_external_oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  return data as any | null;
}

function getBasicClientCredentials(req: Request): { clientId: string | null; clientSecret: string | null } {
  const basic = req.headers.get('authorization') ?? '';
  const basicMatch = /^Basic\s+(.+)$/i.exec(basic);
  if (!basicMatch) return { clientId: null, clientSecret: null };
  const decoded = atob(basicMatch[1]);
  const separator = decoded.indexOf(':');
  if (separator < 0) return { clientId: null, clientSecret: null };
  return {
    clientId: decodeURIComponent(decoded.slice(0, separator)),
    clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
  };
}

function redirectUriAllowed(client: any, redirectUri: string): boolean {
  return Array.isArray(client?.redirect_uris) && client.redirect_uris.includes(redirectUri);
}

async function verifyClientSecret(client: any, body: Record<string, unknown>, req: Request): Promise<boolean> {
  if (client?.token_endpoint_auth_method === 'none') return true;
  const basicCredentials = getBasicClientCredentials(req);
  let secret = asString(body.client_secret);
  if (basicCredentials.clientSecret) secret = basicCredentials.clientSecret;
  if (!secret || !client?.client_secret_hash) return false;
  return (await sha256Hex(secret)) === client.client_secret_hash;
}

async function handleAuthorize(req: Request) {
  const url = new URL(req.url);
  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: 'service_unavailable' });
  const clientId = url.searchParams.get('client_id') ?? '';
  const redirectUri = url.searchParams.get('redirect_uri') ?? '';
  const client = await getClient(admin, clientId);
  if (!client || client.revoked_at || !redirectUriAllowed(client, redirectUri)) {
    return json(400, { error: 'invalid_request' });
  }

  const consent = new URL(`${getSiteUrl()}/oauth/consent`);
  for (const key of ['client_id', 'redirect_uri', 'response_type', 'state', 'code_challenge', 'code_challenge_method', 'scope']) {
    const value = url.searchParams.get(key);
    if (value) consent.searchParams.set(key, value);
  }
  consent.searchParams.set('surface', String(client.surface ?? 'custom'));
  consent.searchParams.set('client_name', String(client.client_name ?? 'Kwilt connector'));
  consent.searchParams.set('approve_endpoint', `${getBaseUrl(req)}/authorize/approve`);
  return redirect(consent.toString());
}

async function handleAuthorizeApprove(req: Request) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const who = await requireSupabaseUser(req);
  if (!who.ok) return who.response;
  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: 'service_unavailable' });
  const body = await parseBody(req);
  const clientId = asString(body.client_id);
  const redirectUri = asString(body.redirect_uri);
  const codeChallenge = asString(body.code_challenge);
  const codeChallengeMethod = asString(body.code_challenge_method);
  if (!clientId || !redirectUri) return json(400, { error: 'invalid_request' });
  const client = await getClient(admin, clientId);
  if (!client || client.revoked_at || !redirectUriAllowed(client, redirectUri)) return json(400, { error: 'invalid_request' });
  if (!codeChallenge || codeChallengeMethod !== 'S256') return json(400, { error: 'invalid_request', error_description: 'S256 PKCE is required' });

  const scope = normalizeOAuthScope(body.scope);
  if (!scope) return json(400, { error: 'invalid_scope' });

  const code = randomToken('kwilt_code', 32);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await admin.from('kwilt_external_oauth_authorization_codes').insert({
    code_hash: await sha256Hex(code),
    client_id: clientId,
    user_id: who.userId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope,
    expires_at: expiresAt,
  });
  if (error) return json(500, { error: 'authorization_code_failed' });

  const destination = new URL(redirectUri);
  destination.searchParams.set('code', code);
  const state = asString(body.state);
  if (state) destination.searchParams.set('state', state);
  return json(200, { redirect_to: destination.toString(), expires_at: expiresAt });
}

async function handleToken(req: Request) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: 'service_unavailable' });
  const body = await parseBody(req);
  const grantType = asString(body.grant_type);
  const basicCredentials = getBasicClientCredentials(req);
  const clientId = asString(body.client_id) ?? basicCredentials.clientId;
  if (!clientId) return json(400, { error: 'invalid_client' });
  const client = await getClient(admin, clientId);
  if (!client || client.revoked_at || !(await verifyClientSecret(client, body, req))) {
    return json(401, { error: 'invalid_client' });
  }

  let userId: string | null = null;
  let scope = 'read';
  if (grantType === 'authorization_code') {
    const code = asString(body.code);
    const redirectUri = asString(body.redirect_uri);
    if (!code || !redirectUri) return json(400, { error: 'invalid_grant' });
    const { data } = await admin
      .from('kwilt_external_oauth_authorization_codes')
      .select('*')
      .eq('code_hash', await sha256Hex(code))
      .maybeSingle();
    const row = data as any;
    const pkceOk = await verifyPkceChallenge({
      verifier: asString(body.code_verifier),
      challenge: row?.code_challenge ? String(row.code_challenge) : null,
      method: row?.code_challenge_method ? String(row.code_challenge_method) : null,
    });
    if (
      !row ||
      row.client_id !== clientId ||
      row.redirect_uri !== redirectUri ||
      row.consumed_at ||
      new Date(String(row.expires_at)).getTime() <= Date.now() ||
      !pkceOk
    ) {
      return json(400, { error: 'invalid_grant' });
    }
    const { data: claimed } = await admin
      .from('kwilt_external_oauth_authorization_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed) return json(400, { error: 'invalid_grant' });
    userId = String(row.user_id);
    const normalizedScope = normalizeOAuthScope(row.scope);
    if (!normalizedScope) return json(400, { error: 'invalid_grant' });
    scope = normalizedScope;
  } else if (grantType === 'refresh_token') {
    const refreshToken = asString(body.refresh_token);
    if (!refreshToken) return json(400, { error: 'invalid_grant' });
    const { data } = await admin
      .from('kwilt_external_oauth_tokens')
      .select('*')
      .eq('refresh_token_hash', await sha256Hex(refreshToken))
      .maybeSingle();
    const row = data as any;
    if (!row || row.client_id !== clientId || row.revoked_at) return json(400, { error: 'invalid_grant' });
    userId = String(row.user_id);
    const normalizedScope = normalizeOAuthScope(row.scope);
    if (!normalizedScope) return json(400, { error: 'invalid_grant' });
    scope = normalizedScope;
  } else {
    return json(400, { error: 'unsupported_grant_type' });
  }

  const accessToken = randomToken('kwilt_mcp', 32);
  const refreshToken = randomToken('kwilt_refresh', 32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const { error } = await admin.from('kwilt_external_oauth_tokens').insert({
    token_hash: await sha256Hex(accessToken),
    refresh_token_hash: await sha256Hex(refreshToken),
    client_id: clientId,
    user_id: userId,
    scope,
    expires_at: expiresAt.toISOString(),
  });
  if (error) return json(500, { error: 'token_issue_failed' });

  if (grantType === 'authorization_code') {
    await capturePosthogEvent({
      distinctId: userId,
      event: 'ExternalConnectorInstalled',
      properties: {
        surface: String(client.surface ?? 'custom'),
        client_id: clientId,
        scope,
      },
    });
  }

  return json(200, {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope,
  });
}

async function handleRevoke(req: Request) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: 'service_unavailable' });
  const body = await parseBody(req);
  const token = asString(body.token);
  if (!token) return json(200, {});
  const tokenHash = await sha256Hex(token);
  await admin
    .from('kwilt_external_oauth_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .or(`token_hash.eq.${tokenHash},refresh_token_hash.eq.${tokenHash}`);
  return json(200, {});
}

async function handleMcp(req: Request) {
  if (req.method !== 'POST') return json(405, { error: { message: 'Method not allowed' } });
  const auth = await requireExternalToken(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as JsonRpcRequest | null;
  const id = rpcId(body?.id);
  const method = asString(body?.method);
  if (!body || body.jsonrpc !== '2.0' || !method) return json(200, rpcError(id, -32600, 'Invalid Request'));

  if (method === 'initialize') {
    return json(200, rpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'Kwilt', version: '0.1.0' },
    } as JsonObject));
  }

  if (method === 'tools/list') {
    const tools = hasScope(auth.context, 'write') ? ALL_EXTERNAL_MCP_TOOLS : EXTERNAL_MCP_READ_TOOLS;
    return json(200, rpcResult(id, { tools } as JsonObject));
  }

  if (method !== 'tools/call') return json(200, rpcError(id, -32601, `Method not found: ${method}`));
  const params = asRecord(body.params) ?? {};
  const name = asString(params.name);
  const args = params.arguments ?? {};
  if (!name) return json(200, rpcError(id, -32602, 'Missing tool name'));
  const toolScope = getToolScope(name);
  if (!toolScope) return json(200, rpcError(id, -32601, `Unknown tool: ${name}`));
  if (!hasScope(auth.context, toolScope)) return json(200, rpcError(id, -32000, `${toolScope} scope required`));

  try {
    const idempotencyKey = toolScope === 'write' ? getIdempotencyKey(args) : null;
    const idempotencyKeyHash = idempotencyKey ? await sha256Hex(`${name}:${idempotencyKey}`) : null;
    const replay = idempotencyKeyHash ? await findIdempotentWrite(auth.admin, auth.context, idempotencyKeyHash) : null;
    const writeResult = toolScope === 'write' && !replay
      ? await handleWriteTool(auth.admin, auth.context, name, args)
      : null;
    const finalResult = replay ?? (writeResult ? writeResult.structured : await handleReadTool(auth.admin, auth.context, name, args));
    await auditToolCall(auth.admin, auth.context, {
      toolName: name,
      toolKind: toolScope,
      scopeUsed: toolScope,
      args,
      success: true,
      requestId: typeof id === 'string' || typeof id === 'number' ? String(id) : null,
      userAgent: req.headers.get('user-agent'),
      objectType: writeResult?.object_type ?? (replay ? asString(replay.object_type) : null),
      objectId: writeResult?.object_id ?? (replay ? asString(replay.object_id) : null),
      idempotencyKeyHash: replay ? null : idempotencyKeyHash,
      resultStatus: replay ? 'idempotent_replay' : 'success',
      resultSummary: writeResult?.result_summary ?? (replay ? asString(replay.result_summary) : null),
    });
    await capturePosthogEvent({
      distinctId: auth.context.userId,
      event: 'ExternalToolCalled',
      properties: {
        surface: auth.context.surface,
        tool_name: name,
        tool_kind: toolScope,
        scope_used: toolScope,
        success: true,
      },
    });
    return json(200, rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(finalResult) }], structuredContent: finalResult } as JsonObject));
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : 'tool_failed';
    await auditToolCall(auth.admin, auth.context, {
      toolName: name,
      toolKind: toolScope,
      scopeUsed: toolScope,
      args,
      success: false,
      errorCode,
      requestId: typeof id === 'string' || typeof id === 'number' ? String(id) : null,
      userAgent: req.headers.get('user-agent'),
      resultStatus: 'error',
    });
    await capturePosthogEvent({
      distinctId: auth.context.userId,
      event: 'ExternalToolCalled',
      properties: {
        surface: auth.context.surface,
        tool_name: name,
        tool_kind: toolScope,
        scope_used: toolScope,
        success: false,
        error_code: errorCode,
      },
    });
    return json(200, rpcError(id, errorCode.startsWith('missing_') ? -32602 : -32000, errorCode));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const last = path.split('/').pop() ?? '';

  if (req.method === 'GET' && path.endsWith('/.well-known/oauth-authorization-server')) {
    return json(200, buildAuthorizationServerMetadata(getBaseUrl(req)));
  }
  if (req.method === 'GET' && path.endsWith('/.well-known/oauth-protected-resource')) {
    return json(200, buildProtectedResourceMetadata(getBaseUrl(req)));
  }
  if (req.method === 'GET' && last === 'authorize') return handleAuthorize(req);
  if (last === 'authorize' && req.method === 'GET') return handleAuthorize(req);
  if (last === 'approve' && path.endsWith('/authorize/approve')) return handleAuthorizeApprove(req);
  if (last === 'register') return handleRegister(req);
  if (last === 'token') return handleToken(req);
  if (last === 'revoke') return handleRevoke(req);
  return handleMcp(req);
});
