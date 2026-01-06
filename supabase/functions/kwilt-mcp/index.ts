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

function asInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : null;
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


