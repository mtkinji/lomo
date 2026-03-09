// Kwilt MCP server (Streamable HTTP) hosted as a Supabase Edge Function.
//
// Auth: per-user Kwilt PAT via `Authorization: Bearer <token>`
// Safety:
// - All reads/writes are scoped to PAT owner
// - All task operations are scoped to an execution_target_id
// - Tasks must be explicitly handed off (kwilt_activity_handoffs.handed_off=true)
//
// Endpoints:
// - POST /  (MCP Streamable HTTP entrypoint; JSON-RPC payload)
//
// MCP methods implemented:
// - initialize
// - tools/list
// - tools/call
//
// Note: This implementation is intentionally minimal and request/response-friendly.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBearerToken(req: Request): string | null {
  const h = (req.headers.get('authorization') ?? '').trim();
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

async function sha256HexAsync(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function requirePatOwner(req: Request): Promise<
  | { ok: true; ownerId: string; patId: string }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }) };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, response: json(503, { error: { message: 'Auth unavailable', code: 'provider_unavailable' } }) };
  }

  const tokenHash = await sha256HexAsync(token);
  const { data, error } = await admin
    .from('kwilt_pats')
    .select('id, owner_id, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, response: json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } }) };
  }
  if ((data as any).revoked_at) {
    return { ok: false, response: json(401, { error: { message: 'Token revoked', code: 'unauthorized' } }) };
  }
  const ownerId = String((data as any).owner_id);
  const patId = String((data as any).id);
  // Best-effort last_used_at update.
  try {
    await admin.from('kwilt_pats').update({ last_used_at: new Date().toISOString() }).eq('id', patId);
  } catch {
    // ignore
  }
  return { ok: true, ownerId, patId };
}

async function audit(admin: any, params: { ownerId: string; toolName: string; executionTargetId?: string | null; activityId?: string | null; summary?: string | null }) {
  try {
    await admin.from('kwilt_mcp_audit_log').insert({
      owner_id: params.ownerId,
      tool_name: params.toolName,
      execution_target_id: params.executionTargetId ?? null,
      activity_id: params.activityId ?? null,
      summary: params.summary ?? null,
    });
  } catch {
    // best-effort
  }
}

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: JsonValue;
  error?: { code: number; message: string; data?: JsonValue };
};

function rpcError(id: string | number | null, code: number, message: string, data?: JsonValue): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function rpcResult(id: string | number | null, result: JsonValue): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

type ListExecutionTargetsParams = { kind?: unknown; limit?: unknown };
type GetActiveGoalParams = { execution_target_id?: unknown };
type SetActiveGoalParams = { execution_target_id?: unknown; goal_id?: unknown };
type ListGoalsParams = { execution_target_id?: unknown; status?: unknown; limit?: unknown };
type CreateGoalParams = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  execution_target_id?: unknown;
  set_active?: unknown;
};
type ListActivitiesParams = {
  goal_id?: unknown;
  execution_target_id?: unknown;
  include_handoff_state?: unknown;
  status?: unknown;
  limit?: unknown;
};
type CreateActivityParams = {
  goal_id?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  type?: unknown;
  priority?: unknown;
  tags?: unknown;
  handoff_to_execution_target_id?: unknown;
};
type HandoffActivityParams = {
  activity_id?: unknown;
  execution_target_id?: unknown;
  title_override?: unknown;
  problem_statement?: unknown;
  desired_outcome?: unknown;
  acceptance_criteria?: unknown;
  verification_steps?: unknown;
  do_not_change?: unknown;
  perf_or_security_notes?: unknown;
  links?: unknown;
  relevant_files_hint?: unknown;
  examples?: unknown;
};
type ListTasksParams = {
  execution_target_id?: unknown;
  handed_off_to_cursor?: unknown;
  status?: unknown;
  limit?: unknown;
};

type GetTaskParams = { task_id?: unknown };
type RepoContextParams = { execution_target_id?: unknown };
type PostProgressParams = { task_id?: unknown; message?: unknown; percent?: unknown; artifacts?: unknown };
type AttachArtifactParams = { task_id?: unknown; artifact?: unknown };
type SetStatusParams = { task_id?: unknown; status?: unknown; reason?: unknown };

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const normalized = v.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

function asInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function asRecord(v: unknown): Record<string, any> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.map(asString).filter(Boolean) as string[]));
}

function pickStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(asString).filter(Boolean) as string[] : [];
}

function normalizeStatusFilter(v: unknown, allowed: string[], fallback: string[]): string[] {
  const raw = Array.isArray(v)
    ? v.map(asString).filter(Boolean)
    : asString(v)
      ? [asString(v) as string]
      : [];
  const allowedSet = new Set(allowed);
  const filtered = raw.filter((item) => allowedSet.has(item));
  return filtered.length > 0 ? filtered : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function nowIso(): string {
  return new Date().toISOString();
}

async function resolveHandoff(admin: any, ownerId: string, taskId: string) {
  const { data, error } = await admin
    .from('kwilt_activity_handoffs')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('activity_id', taskId)
    .eq('handed_off', true)
    .limit(2);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  if (data.length > 1) return { __ambiguous: true };
  return data[0] as any;
}

async function requireHandedOff(admin: any, ownerId: string, taskId: string) {
  const row = await resolveHandoff(admin, ownerId, taskId);
  if (!row) return { ok: false as const, reason: 'Task not found' };
  if ((row as any).__ambiguous) {
    return { ok: false as const, reason: 'Task handed off to multiple execution targets; specify execution_target_id' };
  }
  return { ok: true as const, row };
}

function buildWorkPacket(params: { handoff: any; activityData: any | null }) {
  const h = params.handoff ?? {};
  const activity = params.activityData ?? null;
  const titleFromActivity = typeof activity?.title === 'string' ? activity.title : null;
  const title = (typeof h.title_override === 'string' && h.title_override.trim()) ? h.title_override.trim() : (titleFromActivity ?? 'Untitled');

  return {
    task_id: String(h.activity_id),
    title,
    status: String(h.status ?? 'READY'),
    priority: null,
    created_at: h.created_at ?? null,
    execution_target_id: h.execution_target_id,
    intent: {
      problem_statement: h.problem_statement ?? null,
      desired_outcome: h.desired_outcome ?? null,
    },
    definition_of_done: {
      acceptance_criteria: Array.isArray(h.acceptance_criteria) ? h.acceptance_criteria : [],
      verification_steps: Array.isArray(h.verification_steps) ? h.verification_steps : [],
    },
    constraints: {
      do_not_change: Array.isArray(h.do_not_change) ? h.do_not_change : [],
      performance_or_security_notes: h.perf_or_security_notes ?? null,
    },
    context: {
      links: Array.isArray(h.links) ? h.links : [],
      relevant_files_hint: Array.isArray(h.relevant_files_hint) ? h.relevant_files_hint : [],
      examples: Array.isArray(h.examples) ? h.examples : [],
    },
  };
}

const DEFAULT_FORCE_INTENT = {
  'force-activity': 0,
  'force-connection': 0,
  'force-mastery': 0,
  'force-spirituality': 0,
} as const;

function buildGoalExecutionContext(goalData: Record<string, any>, executionTargetId: string, markPrimary: boolean) {
  const current = asRecord(goalData.executionContext) ?? {};
  const targetIds = Array.from(
    new Set([
      ...asStringArray(current.executionTargetIds),
      executionTargetId,
    ]),
  );
  return {
    ...current,
    executionTargetIds: targetIds,
    isPrimaryForExecutionTarget: markPrimary ? executionTargetId : (asString(current.isPrimaryForExecutionTarget) ?? null),
  };
}

function goalMatchesExecutionTarget(goalData: Record<string, any>, executionTargetId: string, activeGoalId: string | null): boolean {
  if (asString(goalData.id) === activeGoalId) return true;
  const ctx = asRecord(goalData.executionContext);
  if (!ctx) return false;
  if (asString(ctx.isPrimaryForExecutionTarget) === executionTargetId) return true;
  return asStringArray(ctx.executionTargetIds).includes(executionTargetId);
}

function summarizeGoal(goalData: Record<string, any>) {
  return {
    id: asString(goalData.id) ?? '',
    arcId: asString(goalData.arcId),
    title: asString(goalData.title) ?? 'Untitled',
    description: asString(goalData.description),
    status: asString(goalData.status) ?? 'planned',
    priority: [1, 2, 3].includes(asInt(goalData.priority) ?? -1) ? asInt(goalData.priority) : null,
    qualityState: asString(goalData.qualityState),
    executionContext: asRecord(goalData.executionContext) ?? null,
    createdAt: asString(goalData.createdAt),
    updatedAt: asString(goalData.updatedAt),
  };
}

function summarizeActivity(activityData: Record<string, any>, handoffRow?: any | null) {
  return {
    id: asString(activityData.id) ?? '',
    goalId: asString(activityData.goalId),
    title: asString(activityData.title) ?? 'Untitled',
    notes: asString(activityData.notes),
    type: asString(activityData.type) ?? 'task',
    tags: asStringArray(activityData.tags),
    status: asString(activityData.status) ?? 'planned',
    priority: [1, 2, 3].includes(asInt(activityData.priority) ?? -1) ? asInt(activityData.priority) : null,
    createdAt: asString(activityData.createdAt),
    updatedAt: asString(activityData.updatedAt),
    handoff: handoffRow
      ? {
          execution_target_id: handoffRow.execution_target_id,
          handed_off: Boolean(handoffRow.handed_off),
          status: asString(handoffRow.status) ?? 'READY',
          updated_at: handoffRow.updated_at ?? null,
        }
      : null,
  };
}

async function getExecutionTarget(admin: any, ownerId: string, executionTargetId: string) {
  const { data, error } = await admin
    .from('kwilt_execution_targets')
    .select('id, owner_id, kind, display_name, config, requirements, playbook, is_enabled, updated_at')
    .eq('owner_id', ownerId)
    .eq('id', executionTargetId)
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
}

async function getGoalRow(admin: any, ownerId: string, goalId: string) {
  const { data, error } = await admin
    .from('kwilt_goals')
    .select('id, data, updated_at')
    .eq('user_id', ownerId)
    .eq('id', goalId)
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
}

async function getActivityRow(admin: any, ownerId: string, activityId: string) {
  const { data, error } = await admin
    .from('kwilt_activities')
    .select('id, data, updated_at')
    .eq('user_id', ownerId)
    .eq('id', activityId)
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
}

async function updateExecutionTargetConfig(admin: any, ownerId: string, targetRow: any, patch: Record<string, unknown>) {
  const nextConfig = {
    ...(asRecord(targetRow?.config) ?? {}),
    ...patch,
  };
  const { error } = await admin
    .from('kwilt_execution_targets')
    .update({
      config: nextConfig,
      updated_at: nowIso(),
    })
    .eq('owner_id', ownerId)
    .eq('id', targetRow.id);
  if (error) throw error;
  return nextConfig;
}

async function upsertGoalRow(admin: any, ownerId: string, goalData: Record<string, any>) {
  const row = {
    user_id: ownerId,
    id: goalData.id,
    data: goalData,
    created_at: goalData.createdAt ?? nowIso(),
    updated_at: goalData.updatedAt ?? nowIso(),
  };
  const { error } = await admin.from('kwilt_goals').upsert(row, { onConflict: 'user_id,id' });
  if (error) throw error;
}

async function upsertActivityRow(admin: any, ownerId: string, activityData: Record<string, any>) {
  const row = {
    user_id: ownerId,
    id: activityData.id,
    data: activityData,
    created_at: activityData.createdAt ?? nowIso(),
    updated_at: activityData.updatedAt ?? nowIso(),
  };
  const { error } = await admin.from('kwilt_activities').upsert(row, { onConflict: 'user_id,id' });
  if (error) throw error;
}

async function upsertActivityHandoff(admin: any, ownerId: string, params: {
  activityId: string;
  executionTargetId: string;
  titleOverride?: string | null;
  problemStatement?: string | null;
  desiredOutcome?: string | null;
  acceptanceCriteria?: string[];
  verificationSteps?: string[];
  doNotChange?: string[];
  perfOrSecurityNotes?: string | null;
  links?: JsonValue[];
  relevantFilesHint?: string[];
  examples?: JsonValue[];
}) {
  const now = nowIso();
  const row = {
    owner_id: ownerId,
    activity_id: params.activityId,
    execution_target_id: params.executionTargetId,
    handed_off: true,
    handed_off_at: now,
    status: 'READY',
    title_override: params.titleOverride ?? null,
    problem_statement: params.problemStatement ?? null,
    desired_outcome: params.desiredOutcome ?? null,
    acceptance_criteria: params.acceptanceCriteria ?? [],
    verification_steps: params.verificationSteps ?? [],
    do_not_change: params.doNotChange ?? [],
    perf_or_security_notes: params.perfOrSecurityNotes ?? null,
    links: params.links ?? [],
    relevant_files_hint: params.relevantFilesHint ?? [],
    examples: params.examples ?? [],
    updated_at: now,
  };
  const { error } = await admin
    .from('kwilt_activity_handoffs')
    .upsert(row, { onConflict: 'owner_id,activity_id,execution_target_id' });
  if (error) throw error;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Service unavailable', code: 'provider_unavailable' } });
  }

  const who = await requirePatOwner(req);
  if (!who.ok) return who.response;

  const body = (await req.json().catch(() => null)) as JsonRpcRequest | null;
  const idRaw = body?.id;
  const id: string | number | null = typeof idRaw === 'string' || typeof idRaw === 'number' ? idRaw : null;
  const method = asString(body?.method) ?? '';
  const params = (body?.params ?? {}) as any;

  if (!method) {
    return json(200, rpcError(id, -32600, 'Invalid Request'));
  }

  try {
    if (method === 'initialize') {
      await audit(admin, { ownerId: who.ownerId, toolName: 'initialize' });
      return json(
        200,
        rpcResult(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'kwilt-mcp', version: '0.1.0' },
          capabilities: { tools: {} },
        } as any),
      );
    }

    if (method === 'tools/list') {
      const tools = [
        {
          name: 'kwilt.list_execution_targets',
          description: 'List installed execution targets available to the authenticated user.',
          inputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              limit: { type: 'number' },
            },
          },
        },
        {
          name: 'kwilt.get_active_goal_for_execution_target',
          description: 'Get the active Goal configured for an execution target.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_target_id: { type: 'string' },
            },
            required: ['execution_target_id'],
          },
        },
        {
          name: 'kwilt.set_active_goal_for_execution_target',
          description: 'Set the active Goal for an execution target.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_target_id: { type: 'string' },
              goal_id: { type: 'string' },
            },
            required: ['execution_target_id', 'goal_id'],
          },
        },
        {
          name: 'kwilt.list_goals',
          description: 'List the user goals, optionally filtered to a repo execution target.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_target_id: { type: 'string' },
              status: { type: ['string', 'array'] },
              limit: { type: 'number' },
            },
          },
        },
        {
          name: 'kwilt.create_goal',
          description: 'Create a Goal and optionally set it active for an execution target.',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'archived'] },
              priority: { type: 'number' },
              execution_target_id: { type: 'string' },
              set_active: { type: 'boolean' },
            },
            required: ['title'],
          },
        },
        {
          name: 'kwilt.list_activities',
          description: 'List Activities, optionally for a Goal and with execution handoff state.',
          inputSchema: {
            type: 'object',
            properties: {
              goal_id: { type: 'string' },
              execution_target_id: { type: 'string' },
              include_handoff_state: { type: 'boolean' },
              status: { type: ['string', 'array'] },
              limit: { type: 'number' },
            },
          },
        },
        {
          name: 'kwilt.create_activity',
          description: 'Create an Activity under a Goal and optionally hand it off to an execution target.',
          inputSchema: {
            type: 'object',
            properties: {
              goal_id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: ['planned', 'in_progress', 'done', 'skipped', 'cancelled'] },
              type: { type: 'string' },
              priority: { type: 'number' },
              tags: { type: 'array', items: { type: 'string' } },
              handoff_to_execution_target_id: { type: 'string' },
            },
            required: ['goal_id', 'title'],
          },
        },
        {
          name: 'kwilt.handoff_activity',
          description: 'Explicitly hand off an Activity to an execution target queue.',
          inputSchema: {
            type: 'object',
            properties: {
              activity_id: { type: 'string' },
              execution_target_id: { type: 'string' },
              title_override: { type: 'string' },
              problem_statement: { type: 'string' },
              desired_outcome: { type: 'string' },
              acceptance_criteria: { type: 'array', items: { type: 'string' } },
              verification_steps: { type: 'array', items: { type: 'string' } },
              do_not_change: { type: 'array', items: { type: 'string' } },
              perf_or_security_notes: { type: 'string' },
              links: { type: 'array' },
              relevant_files_hint: { type: 'array', items: { type: 'string' } },
              examples: { type: 'array' },
            },
            required: ['activity_id', 'execution_target_id'],
          },
        },
        {
          name: 'kwilt.list_tasks',
          description: 'List tasks explicitly handed off to the executor for an execution_target_id.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_target_id: { type: 'string' },
              handed_off_to_cursor: { type: 'boolean' },
              status: { type: ['string', 'array'] },
              limit: { type: 'number' },
            },
            required: ['execution_target_id'],
          },
        },
        {
          name: 'kwilt.get_task',
          description: 'Fetch a full Work Packet for a handed-off task.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              execution_target_id: { type: 'string' },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'kwilt.get_repo_context',
          description: 'Fetch executor context (playbook + verification) for an execution target.',
          inputSchema: {
            type: 'object',
            properties: {
              execution_target_id: { type: 'string' },
            },
            required: ['execution_target_id'],
          },
        },
        {
          name: 'kwilt.post_progress',
          description: 'Post a progress update (message + optional percent) to a task. Optionally include small artifacts.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              message: { type: 'string' },
              percent: { type: 'number' },
              artifacts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['diff_summary', 'file_list', 'commands_run', 'pr_url', 'commit_hash', 'notes'],
                    },
                    content: { type: 'string' },
                  },
                  required: ['type', 'content'],
                },
              },
            },
            required: ['task_id', 'message'],
          },
        },
        {
          name: 'kwilt.attach_artifact',
          description: 'Attach a small artifact to a task.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              artifact: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['diff_summary', 'file_list', 'commands_run', 'pr_url', 'commit_hash', 'notes'],
                  },
                  content: { type: 'string' },
                },
                required: ['type', 'content'],
              },
            },
            required: ['task_id', 'artifact'],
          },
        },
        {
          name: 'kwilt.set_status',
          description: 'Set executor status of a handed-off task.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              status: { type: 'string', enum: ['READY', 'IN_PROGRESS', 'BLOCKED', 'DONE'] },
              reason: { type: 'string' },
            },
            required: ['task_id', 'status'],
          },
        },
      ];
      await audit(admin, { ownerId: who.ownerId, toolName: 'tools/list', summary: `count=${tools.length}` });
      return json(200, rpcResult(id, { tools } as any));
    }

    if (method !== 'tools/call') {
      return json(200, rpcError(id, -32601, `Method not found: ${method}`));
    }

    const toolName = asString((params as any)?.name);
    const args = ((params as any)?.arguments ?? {}) as any;
    if (!toolName) return json(200, rpcError(id, -32602, 'Missing tool name'));

    const tool = toolName.startsWith('kwilt.') ? toolName.slice('kwilt.'.length) : toolName;

    switch (tool) {
      case 'list_execution_targets': {
        const p = args as ListExecutionTargetsParams;
        const kind = asString((p as any).kind);
        const limit = clamp(asInt((p as any).limit) ?? 50, 1, 200);
        let q = admin
          .from('kwilt_execution_targets')
          .select('id, kind, display_name, is_enabled, config, requirements, playbook, definition_id, created_at, updated_at')
          .eq('owner_id', who.ownerId)
          .eq('is_enabled', true)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (kind) q = q.eq('kind', kind);
        const { data, error } = await q;
        if (error) throw error;
        await audit(admin, { ownerId: who.ownerId, toolName: toolName, summary: `count=${Array.isArray(data) ? data.length : 0}` });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: (data ?? []) as any }] } as any));
      }

      case 'get_active_goal_for_execution_target': {
        const p = args as GetActiveGoalParams;
        const executionTargetId = asString((p as any).execution_target_id);
        if (!executionTargetId) return json(200, rpcError(id, -32602, 'Missing execution_target_id'));

        const target = await getExecutionTarget(admin, who.ownerId, executionTargetId);
        if (!target) return json(200, rpcError(id, 404, 'Execution target not found'));

        const config = asRecord(target.config) ?? {};
        const activeGoalId = asString(config.active_goal_id);
        const goalRow = activeGoalId ? await getGoalRow(admin, who.ownerId, activeGoalId) : null;
        const goalData = asRecord(goalRow?.data);
        const result = {
          execution_target_id: executionTargetId,
          active_goal_id: activeGoalId,
          goal: goalData ? summarizeGoal(goalData) : null,
        };
        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId,
          summary: activeGoalId ? `goal=${activeGoalId}` : 'goal=null',
        });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: result as any }] } as any));
      }

      case 'set_active_goal_for_execution_target': {
        const p = args as SetActiveGoalParams;
        const executionTargetId = asString((p as any).execution_target_id);
        const goalId = asString((p as any).goal_id);
        if (!executionTargetId || !goalId) return json(200, rpcError(id, -32602, 'Missing execution_target_id or goal_id'));

        const [target, goalRow] = await Promise.all([
          getExecutionTarget(admin, who.ownerId, executionTargetId),
          getGoalRow(admin, who.ownerId, goalId),
        ]);
        if (!target) return json(200, rpcError(id, 404, 'Execution target not found'));
        if (!goalRow) return json(200, rpcError(id, 404, 'Goal not found'));

        const goalData = asRecord(goalRow.data) ?? {};
        const goalWithContext = {
          ...goalData,
          executionContext: buildGoalExecutionContext(goalData, executionTargetId, true),
          updatedAt: nowIso(),
        };
        await upsertGoalRow(admin, who.ownerId, goalWithContext);
        await updateExecutionTargetConfig(admin, who.ownerId, target, { active_goal_id: goalId });

        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId,
          summary: `goal=${goalId}`,
        });
        return json(200, rpcResult(id, {
          content: [{
            type: 'json',
            json: {
              execution_target_id: executionTargetId,
              active_goal_id: goalId,
              goal: summarizeGoal(goalWithContext),
            } as any,
          }],
        } as any));
      }

      case 'list_goals': {
        const p = args as ListGoalsParams;
        const executionTargetId = asString((p as any).execution_target_id);
        const limit = clamp(asInt((p as any).limit) ?? 20, 1, 100);
        const statuses = normalizeStatusFilter((p as any).status, ['planned', 'in_progress', 'completed', 'archived'], ['planned', 'in_progress']);

        let activeGoalId: string | null = null;
        if (executionTargetId) {
          const target = await getExecutionTarget(admin, who.ownerId, executionTargetId);
          if (!target) return json(200, rpcError(id, 404, 'Execution target not found'));
          activeGoalId = asString((asRecord(target.config) ?? {}).active_goal_id);
        }

        const { data, error } = await admin
          .from('kwilt_goals')
          .select('id, data, updated_at')
          .eq('user_id', who.ownerId)
          .order('updated_at', { ascending: false })
          .limit(Math.max(limit * 3, 50));
        if (error) throw error;

        const goals = (Array.isArray(data) ? data : [])
          .map((row: any) => asRecord(row?.data))
          .filter(Boolean)
          .filter((goal: any) => statuses.includes(asString(goal.status) ?? 'planned'))
          .filter((goal: any) => {
            if (!executionTargetId) return true;
            return goalMatchesExecutionTarget(goal, executionTargetId, activeGoalId);
          })
          .slice(0, limit)
          .map((goal: any) => summarizeGoal(goal));

        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId,
          summary: `count=${goals.length}`,
        });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: goals as any }] } as any));
      }

      case 'create_goal': {
        const p = args as CreateGoalParams;
        const title = asString((p as any).title);
        if (!title) return json(200, rpcError(id, -32602, 'Missing title'));

        const executionTargetId = asString((p as any).execution_target_id);
        const setActive = asBoolean((p as any).set_active) === true;
        const requestedStatus = asString((p as any).status);
        const status = ['planned', 'in_progress', 'completed', 'archived'].includes(requestedStatus ?? '')
          ? (requestedStatus as string)
          : 'planned';
        const priorityRaw = asInt((p as any).priority);
        const priority = priorityRaw === 1 || priorityRaw === 2 || priorityRaw === 3 ? priorityRaw : undefined;
        const description = asString((p as any).description);

        let target: any | null = null;
        if (executionTargetId) {
          target = await getExecutionTarget(admin, who.ownerId, executionTargetId);
          if (!target) return json(200, rpcError(id, 404, 'Execution target not found'));
        }

        const timestamp = nowIso();
        const goalId = `goal-${crypto.randomUUID()}`;
        const goalData: Record<string, any> = {
          id: goalId,
          arcId: null,
          title,
          description: description ?? undefined,
          status,
          qualityState: 'draft',
          priority,
          forceIntent: { ...DEFAULT_FORCE_INTENT },
          metrics: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        if (executionTargetId) {
          goalData.executionContext = buildGoalExecutionContext(goalData, executionTargetId, setActive);
        }

        await upsertGoalRow(admin, who.ownerId, goalData);
        if (target && setActive) {
          await updateExecutionTargetConfig(admin, who.ownerId, target, { active_goal_id: goalId });
        }

        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId,
          summary: `goal=${goalId}`,
        });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: summarizeGoal(goalData) as any }] } as any));
      }

      case 'list_activities': {
        const p = args as ListActivitiesParams;
        const goalId = asString((p as any).goal_id);
        const executionTargetId = asString((p as any).execution_target_id);
        const includeHandoffState = asBoolean((p as any).include_handoff_state) === true;
        const limit = clamp(asInt((p as any).limit) ?? 30, 1, 200);
        const statuses = normalizeStatusFilter((p as any).status, ['planned', 'in_progress', 'done', 'skipped', 'cancelled'], ['planned', 'in_progress']);

        if (executionTargetId) {
          const target = await getExecutionTarget(admin, who.ownerId, executionTargetId);
          if (!target) return json(200, rpcError(id, 404, 'Execution target not found'));
        }
        if (goalId) {
          const goal = await getGoalRow(admin, who.ownerId, goalId);
          if (!goal) return json(200, rpcError(id, 404, 'Goal not found'));
        }

        const { data, error } = await admin
          .from('kwilt_activities')
          .select('id, data, updated_at')
          .eq('user_id', who.ownerId)
          .order('updated_at', { ascending: false })
          .limit(Math.max(limit * 3, 60));
        if (error) throw error;

        const filteredRows = (Array.isArray(data) ? data : [])
          .filter((row: any) => {
            const activity = asRecord(row?.data);
            if (!activity) return false;
            if (goalId && asString(activity.goalId) !== goalId) return false;
            return statuses.includes(asString(activity.status) ?? 'planned');
          })
          .slice(0, limit);

        let handoffByActivityId = new Map<string, any>();
        if (executionTargetId && includeHandoffState) {
          const activityIds = filteredRows.map((row: any) => String(row.id));
          if (activityIds.length > 0) {
            const { data: handoffRows, error: handoffError } = await admin
              .from('kwilt_activity_handoffs')
              .select('activity_id, execution_target_id, handed_off, status, updated_at')
              .eq('owner_id', who.ownerId)
              .eq('execution_target_id', executionTargetId)
              .in('activity_id', activityIds);
            if (handoffError) throw handoffError;
            handoffByActivityId = new Map((handoffRows ?? []).map((row: any) => [String(row.activity_id), row]));
          }
        }

        const activities = filteredRows.map((row: any) => {
          const activity = asRecord(row?.data) ?? {};
          return summarizeActivity(activity, handoffByActivityId.get(String(row.id)) ?? null);
        });

        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId,
          summary: `count=${activities.length}`,
        });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: activities as any }] } as any));
      }

      case 'create_activity': {
        const p = args as CreateActivityParams;
        const goalId = asString((p as any).goal_id);
        const title = asString((p as any).title);
        if (!goalId || !title) return json(200, rpcError(id, -32602, 'Missing goal_id or title'));

        const goalRow = await getGoalRow(admin, who.ownerId, goalId);
        if (!goalRow) return json(200, rpcError(id, 404, 'Goal not found'));

        const handoffTargetId = asString((p as any).handoff_to_execution_target_id);
        if (handoffTargetId) {
          const target = await getExecutionTarget(admin, who.ownerId, handoffTargetId);
          if (!target) return json(200, rpcError(id, 404, 'Execution target not found'));
        }

        const requestedStatus = asString((p as any).status);
        const status = ['planned', 'in_progress', 'done', 'skipped', 'cancelled'].includes(requestedStatus ?? '')
          ? (requestedStatus as string)
          : 'planned';
        const priorityRaw = asInt((p as any).priority);
        const priority = priorityRaw === 1 || priorityRaw === 2 || priorityRaw === 3 ? priorityRaw : undefined;
        const timestamp = nowIso();
        const activityId = `activity-${crypto.randomUUID()}`;
        const activityData: Record<string, any> = {
          id: activityId,
          goalId,
          title,
          type: asString((p as any).type) ?? 'task',
          tags: asStringArray((p as any).tags),
          notes: asString((p as any).description) ?? undefined,
          steps: [],
          reminderAt: null,
          priority,
          estimateMinutes: null,
          creationSource: 'ai',
          planGroupId: null,
          scheduledDate: null,
          orderIndex: null,
          phase: null,
          status,
          actualMinutes: null,
          startedAt: null,
          completedAt: status === 'done' ? timestamp : null,
          forceActual: { ...DEFAULT_FORCE_INTENT },
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await upsertActivityRow(admin, who.ownerId, activityData);
        if (handoffTargetId) {
          await upsertActivityHandoff(admin, who.ownerId, {
            activityId,
            executionTargetId: handoffTargetId,
          });
        }

        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId: handoffTargetId,
          activityId,
          summary: `goal=${goalId}`,
        });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: summarizeActivity(activityData) as any }] } as any));
      }

      case 'handoff_activity': {
        const p = args as HandoffActivityParams;
        const activityId = asString((p as any).activity_id);
        const executionTargetId = asString((p as any).execution_target_id);
        if (!activityId || !executionTargetId) return json(200, rpcError(id, -32602, 'Missing activity_id or execution_target_id'));

        const [activityRow, target] = await Promise.all([
          getActivityRow(admin, who.ownerId, activityId),
          getExecutionTarget(admin, who.ownerId, executionTargetId),
        ]);
        if (!activityRow) return json(200, rpcError(id, 404, 'Activity not found'));
        if (!target) return json(200, rpcError(id, 404, 'Execution target not found'));

        await upsertActivityHandoff(admin, who.ownerId, {
          activityId,
          executionTargetId,
          titleOverride: asString((p as any).title_override),
          problemStatement: asString((p as any).problem_statement),
          desiredOutcome: asString((p as any).desired_outcome),
          acceptanceCriteria: pickStringArray((p as any).acceptance_criteria),
          verificationSteps: pickStringArray((p as any).verification_steps),
          doNotChange: pickStringArray((p as any).do_not_change),
          perfOrSecurityNotes: asString((p as any).perf_or_security_notes),
          links: Array.isArray((p as any).links) ? ((p as any).links as JsonValue[]) : [],
          relevantFilesHint: pickStringArray((p as any).relevant_files_hint),
          examples: Array.isArray((p as any).examples) ? ((p as any).examples as JsonValue[]) : [],
        });

        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId,
          activityId,
          summary: 'handoff=ready',
        });
        return json(200, rpcResult(id, {
          content: [{
            type: 'json',
            json: {
              ok: true,
              activity_id: activityId,
              execution_target_id: executionTargetId,
              status: 'READY',
            } as any,
          }],
        } as any));
      }

      case 'list_tasks': {
        const p = args as ListTasksParams;
        const executionTargetId = asString((p as any).execution_target_id);
        if (!executionTargetId) {
          return json(200, rpcError(id, -32602, 'Missing execution_target_id'));
        }
        const limit = clamp(asInt((p as any).limit) ?? 20, 1, 100);

        // Enforce handed_off_to_cursor=true by default if param omitted; ignore false.
        const handedOff = (p as any).handed_off_to_cursor;
        const requireHandedOff = handedOff === undefined ? true : Boolean(handedOff);
        if (!requireHandedOff) {
          return json(200, rpcError(id, -32602, 'handed_off_to_cursor must be true'));
        }

        const statusesRaw = (p as any).status;
        const statuses = Array.isArray(statusesRaw)
          ? statusesRaw.map(asString).filter(Boolean)
          : asString(statusesRaw)
            ? [asString(statusesRaw)].filter(Boolean)
            : ['READY', 'IN_PROGRESS', 'BLOCKED'];

        const { data, error } = await admin
          .from('kwilt_activity_handoffs')
          .select('activity_id, status, handed_off, handed_off_at, updated_at, created_at')
          .eq('owner_id', who.ownerId)
          .eq('execution_target_id', executionTargetId)
          .eq('handed_off', true)
          .in('status', statuses as any)
          .order('updated_at', { ascending: true })
          .limit(limit);
        if (error) throw error;

        const tasks = (data ?? []).map((r: any) => ({
          task_id: String(r.activity_id),
          status: String(r.status ?? 'READY'),
          handed_off: Boolean(r.handed_off),
          handed_off_at: r.handed_off_at ?? null,
          updated_at: r.updated_at ?? null,
          created_at: r.created_at ?? null,
        }));
        await audit(admin, { ownerId: who.ownerId, toolName: toolName, executionTargetId, summary: `count=${tasks.length}` });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: tasks as any }] } as any));
      }

      case 'get_task': {
        const p = args as GetTaskParams & { execution_target_id?: unknown };
        const taskId = asString((p as any).task_id);
        if (!taskId) return json(200, rpcError(id, -32602, 'Missing task_id'));

        // Optional execution_target_id disambiguation.
        const forcedTargetId = asString((p as any).execution_target_id);
        let handoffRow: any | null = null;
        if (forcedTargetId) {
          const { data: forced, error } = await admin
            .from('kwilt_activity_handoffs')
            .select('*')
            .eq('owner_id', who.ownerId)
            .eq('activity_id', taskId)
            .eq('execution_target_id', forcedTargetId)
            .eq('handed_off', true)
            .maybeSingle();
          if (error || !forced) return json(200, rpcError(id, 404, 'Task not found for execution target'));
          handoffRow = forced as any;
        } else {
          const handoff = await requireHandedOff(admin, who.ownerId, taskId);
          if (!handoff.ok) return json(200, rpcError(id, 404, handoff.reason));
          handoffRow = handoff.row;
        }

        // Best-effort: fetch the Activity domain blob so the title is always present.
        const { data: activityRow } = await admin
          .from('kwilt_activities')
          .select('data')
          .eq('user_id', who.ownerId)
          .eq('id', taskId)
          .maybeSingle();
        const activityData = (activityRow as any)?.data ?? null;

        const packet = buildWorkPacket({ handoff: handoffRow, activityData });
        await audit(admin, { ownerId: who.ownerId, toolName: toolName, executionTargetId: String(handoffRow.execution_target_id), activityId: taskId });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: packet as any }] } as any));
      }

      case 'get_repo_context': {
        const p = args as RepoContextParams;
        const executionTargetId = asString((p as any).execution_target_id);
        if (!executionTargetId) return json(200, rpcError(id, -32602, 'Missing execution_target_id'));

        const { data, error } = await admin
          .from('kwilt_execution_targets')
          .select('id, kind, display_name, config, requirements, playbook')
          .eq('owner_id', who.ownerId)
          .eq('id', executionTargetId)
          .maybeSingle();
        if (error || !data) return json(200, rpcError(id, 404, 'Execution target not found'));

        await audit(admin, { ownerId: who.ownerId, toolName: toolName, executionTargetId });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: data as any }] } as any));
      }

      case 'post_progress': {
        const p = args as PostProgressParams;
        const taskId = asString((p as any).task_id);
        const messageRaw = asString((p as any).message);
        const percent = (p as any).percent;
        if (!taskId || !messageRaw) return json(200, rpcError(id, -32602, 'Missing task_id or message'));

        const handoff = await requireHandedOff(admin, who.ownerId, taskId);
        if (!handoff.ok) return json(200, rpcError(id, 404, handoff.reason));

        const message = messageRaw.length > 2000 ? messageRaw.slice(0, 2000) : messageRaw;
        const pct = percent == null ? null : clamp(asInt(percent) ?? 0, 0, 100);
        await admin.from('kwilt_activity_progress').insert({
          owner_id: who.ownerId,
          activity_id: taskId,
          execution_target_id: handoff.row.execution_target_id,
          message,
          percent: pct,
          created_at: nowIso(),
        });

        // Optional embedded artifacts (small; capped).
        const artifacts = (p as any).artifacts;
        if (Array.isArray(artifacts)) {
          const rows = artifacts
            .slice(0, 5)
            .map((a: any) => ({
              type: asString(a?.type),
              content: asString(a?.content),
            }))
            .filter((a: any) => a.type && a.content)
            .map((a: any) => ({
              owner_id: who.ownerId,
              activity_id: taskId,
              execution_target_id: handoff.row.execution_target_id,
              type: a.type,
              content: a.content.length > 5000 ? a.content.slice(0, 5000) : a.content,
              created_at: nowIso(),
            }));
          if (rows.length > 0) {
            await admin.from('kwilt_activity_artifacts').insert(rows);
          }
        }

        await audit(admin, {
          ownerId: who.ownerId,
          toolName: toolName,
          executionTargetId: String(handoff.row.execution_target_id),
          activityId: taskId,
          summary: message.slice(0, 160),
        });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: { ok: true } }] } as any));
      }

      case 'attach_artifact': {
        const p = args as AttachArtifactParams;
        const taskId = asString((p as any).task_id);
        const artifact = (p as any).artifact ?? null;
        if (!taskId || !artifact || typeof artifact !== 'object') return json(200, rpcError(id, -32602, 'Missing task_id or artifact'));

        const type = asString((artifact as any).type);
        const content = asString((artifact as any).content);
        if (!type || !content) return json(200, rpcError(id, -32602, 'artifact.type and artifact.content are required'));

        const handoff = await requireHandedOff(admin, who.ownerId, taskId);
        if (!handoff.ok) return json(200, rpcError(id, 404, handoff.reason));

        const trimmed = content.length > 5000 ? content.slice(0, 5000) : content;
        await admin.from('kwilt_activity_artifacts').insert({
          owner_id: who.ownerId,
          activity_id: taskId,
          execution_target_id: handoff.row.execution_target_id,
          type,
          content: trimmed,
          created_at: nowIso(),
        });
        await audit(admin, { ownerId: who.ownerId, toolName: toolName, executionTargetId: String(handoff.row.execution_target_id), activityId: taskId, summary: `type=${type}` });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: { ok: true } }] } as any));
      }

      case 'set_status': {
        const p = args as SetStatusParams;
        const taskId = asString((p as any).task_id);
        const status = asString((p as any).status);
        const reason = asString((p as any).reason);
        if (!taskId || !status) return json(200, rpcError(id, -32602, 'Missing task_id or status'));

        const handoff = await requireHandedOff(admin, who.ownerId, taskId);
        if (!handoff.ok) return json(200, rpcError(id, 404, handoff.reason));

        const allowed = ['READY', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
        if (!allowed.includes(status)) return json(200, rpcError(id, -32602, 'Invalid status'));

        await admin
          .from('kwilt_activity_handoffs')
          .update({
            status,
            blocked_reason: status === 'BLOCKED' ? (reason ?? null) : null,
            updated_at: nowIso(),
          })
          .eq('owner_id', who.ownerId)
          .eq('activity_id', taskId)
          .eq('handed_off', true);

        await audit(admin, { ownerId: who.ownerId, toolName: toolName, executionTargetId: String(handoff.row.execution_target_id), activityId: taskId, summary: `${status}${reason ? `: ${reason.slice(0, 120)}` : ''}` });
        return json(200, rpcResult(id, { content: [{ type: 'json', json: { ok: true } }] } as any));
      }

      default:
        return json(200, rpcError(id, -32601, `Tool not found: ${toolName}`));
    }
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Server error';
    await audit(admin, { ownerId: who.ownerId, toolName: method || 'unknown', summary: `error=${msg.slice(0, 200)}` });
    return json(200, rpcError(id, 500, msg));
  }
});


