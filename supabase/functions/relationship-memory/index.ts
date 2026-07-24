/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { ServerAgentToolCall } from '../_shared/agentRuntime.ts';
import {
  executeServerRelationshipTool,
  executeServerRelationshipUndo,
} from '../_shared/serverRelationshipTools.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const TOOL_IDS = new Set([
  'relationships.read', 'relationships.remember', 'relationships.correct', 'relationships.forget',
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function boundedId(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function bearerToken(req: Request): string | null {
  return /^bearer\s+(.+)$/i.exec((req.headers.get('authorization') ?? '').trim())?.[1]?.trim() ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = bearerToken(req);
  if (!url || !anonKey || !serviceRole) return json(503, { ok: false, error: 'service_not_configured' });
  if (!token) return json(401, { ok: false, error: 'authentication_required' });

  const text = await req.text();
  if (!text || text.length > 30_000) return json(400, { ok: false, error: 'invalid_request_size' });
  let body: Record<string, unknown>;
  try {
    body = record(JSON.parse(text));
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }
  const requestKeys = Object.keys(body);
  const isUndoRequest = requestKeys.length === 1 && requestKeys[0] === 'undo';
  const isToolRequest = requestKeys.length === 2 && requestKeys.includes('call') && requestKeys.includes('context');
  if (!isUndoRequest && !isToolRequest) {
    return json(400, { ok: false, error: 'unsupported_request_field' });
  }

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json(401, { ok: false, error: 'authentication_required' });
  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  if (isUndoRequest) {
    const undo = record(body.undo);
    if (Object.keys(undo).length !== 1 || !Object.hasOwn(undo, 'receiptId')) {
      return json(400, { ok: false, error: 'invalid_relationship_undo_request' });
    }
    const receiptId = boundedId(undo.receiptId);
    if (!receiptId) return json(400, { ok: false, error: 'invalid_relationship_undo_request' });
    const result = await executeServerRelationshipUndo({ client: admin, userId: authData.user.id, receiptId });
    if (!result) return json(409, { ok: false, error: 'relationship_undo_failed' });
    return json(200, { ok: true, undo: { status: 'undone', ...result } });
  }

  const rawCall = record(body.call);
  const rawContext = record(body.context);
  const callId = boundedId(rawCall.id, 120);
  const toolId = boundedId(rawCall.toolId, 120);
  const threadId = boundedId(rawContext.threadId);
  const runId = boundedId(rawContext.runId);
  const messageId = boundedId(rawContext.messageId);
  if (!callId || !toolId || !TOOL_IDS.has(toolId) || !threadId || !runId || !messageId ||
      !rawCall.arguments || typeof rawCall.arguments !== 'object' || Array.isArray(rawCall.arguments)) {
    return json(400, { ok: false, error: 'invalid_relationship_tool_request' });
  }
  const result = await executeServerRelationshipTool({
    client: admin,
    userId: authData.user.id,
    call: { id: callId, toolId, arguments: rawCall.arguments as Record<string, unknown> } as ServerAgentToolCall,
    writeContext: { threadId, runId, messageId },
  });
  if (!result) return json(400, { ok: false, error: 'unsupported_relationship_tool' });
  return json(200, { ok: true, result });
});
