/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  normalizeAgentRunRequest,
  providerAvailabilityForChannel,
  resolveAgentChannelAdmission,
} from '../_shared/agentRuntime.ts';
import { SERVER_AGENT_TOOL_CATALOG } from '../_shared/serverAgentCatalog.ts';
import { requestServerAgentModel } from '../_shared/serverAgentModel.ts';
import { resolveServerProEntitlement } from '../_shared/serverAgentEntitlement.ts';
import {
  executeCanonicalAgentRun,
} from '../_shared/agentRunCoordinator.ts';
import { createServiceAgentRunPersistence } from '../_shared/serviceAgentRunPersistence.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bearerToken(req: Request): string | null {
  const match = /^bearer\s+(.+)$/i.exec((req.headers.get('authorization') ?? '').trim());
  return match?.[1]?.trim() ?? null;
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

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) return json(401, { ok: false, error: 'authentication_required' });

  let request;
  try {
    request = normalizeAgentRunRequest(await req.json());
  } catch (error) {
    return json(400, { ok: false, error: error instanceof Error ? error.message : 'invalid_request' });
  }

  let phoneLink = null;
  if (request.channel === 'sms' || request.channel === 'phone') {
    const linkId = request.channelContext.phoneLinkId;
    if (linkId) {
      const { data } = await client
        .from('kwilt_phone_agent_links')
        .select('status,opted_out_at,permissions,timezone')
        .eq('id', linkId)
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (data) {
        request = normalizeAgentRunRequest({
          ...request,
          channelContext: {
            ...request.channelContext,
            timeZone: typeof data.timezone === 'string' ? data.timezone : 'UTC',
          },
        });
        phoneLink = {
          status: String(data.status),
          optedOutAt: typeof data.opted_out_at === 'string' ? data.opted_out_at : null,
          permissions: data.permissions && typeof data.permissions === 'object'
            ? data.permissions as Record<string, boolean>
            : {},
        };
      }
    }
  }
  const admission = resolveAgentChannelAdmission({ request, phoneLink });
  if (admission.decision !== 'admit') {
    return json(409, { ok: false, error: admission.decision, ...admission });
  }

  const persistence = createServiceAgentRunPersistence({
    admin,
    userId: authData.user.id,
  });

  try {
    const isPro = await resolveServerProEntitlement(admin, authData.user.id);
    const result = await executeCanonicalAgentRun({
      request, userId: authData.user.id, persistence, dataClient: admin,
      modelStep: ({ messages }) => requestServerAgentModel({
        supabaseUrl: url, anonKey, token, quotaIdentity: authData.user.id,
        isPro, messages, tools: SERVER_AGENT_TOOL_CATALOG,
      }),
      authorizeTool: (tool) => (
        (request.channel !== 'sms' && request.channel !== 'phone')
        || (
          (tool.id !== 'activities.capture' || phoneLink?.permissions.create_activities === true)
          && (!['relationships.remember', 'relationships.correct', 'relationships.forget'].includes(tool.id)
            || phoneLink?.permissions.remember_relationships === true)
        )
      ),
    });
    return json(200, {
      ok: true, state: result.state, replayed: result.replayed,
      run: result.run as unknown as JsonValue,
      ...('answer' in result ? { answer: result.answer } : {}),
      providerAvailability: providerAvailabilityForChannel(request.channel),
    });
  } catch (runError) {
    const code = runError instanceof Error ? runError.message.split(':')[0] : 'run_failed';
    return json(503, { ok: false, error: code });
  }
});
