/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { processAgentChannelJob } from '../_shared/agentChannelWorker.ts';
import { normalizeAgentRunRequest } from '../_shared/agentRuntime.ts';
import { executeCanonicalAgentRun } from '../_shared/agentRunCoordinator.ts';
import { SERVER_AGENT_TOOL_CATALOG } from '../_shared/serverAgentCatalog.ts';
import { resolveServerProEntitlement } from '../_shared/serverAgentEntitlement.ts';
import { requestServerAgentModel } from '../_shared/serverAgentModel.ts';
import { sendPhoneAgentSms } from '../_shared/phoneAgentDelivery.ts';
import { buildLegacyPhoneAgentEnrichmentPayload } from '../_shared/phoneAgent.ts';
import { createServiceAgentRunPersistence } from '../_shared/serviceAgentRunPersistence.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function requiredString(row: Record<string, unknown>, camel: string, snake: string): string {
  const value = row[camel] ?? row[snake];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function requireCronSecret(req: Request): boolean {
  const expected = (Deno.env.get('PHONE_AGENT_CRON_SECRET') ?? '').trim();
  const match = /^bearer\s+(.+)$/i.exec((req.headers.get('authorization') ?? '').trim());
  return Boolean(expected && match?.[1] === expected);
}

serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (!requireCronSecret(req)) return json(401, { ok: false, error: 'unauthorized' });

  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const anonKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim();
  const serviceRole = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  const twilioAccountSid = (Deno.env.get('TWILIO_ACCOUNT_SID') ?? '').trim();
  const twilioAuthToken = (Deno.env.get('TWILIO_AUTH_TOKEN') ?? '').trim();
  const twilioFrom = (Deno.env.get('TWILIO_FROM_NUMBER') ?? '').trim();
  if (!url || !anonKey || !serviceRole) return json(503, { ok: false, error: 'service_not_configured' });

  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const requestedLimit = Number(new URL(req.url).searchParams.get('limit') ?? 10);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 25)) : 10;
  const { data: claimed, error: claimError } = await admin.rpc('claim_kwilt_agent_channel_jobs', { p_limit: limit });
  if (claimError) return json(503, { ok: false, error: 'channel_job_claim_failed' });

  const outcomes: Array<{ id: string; state: string; reason?: string }> = [];
  for (const rawJob of Array.isArray(claimed) ? claimed : []) {
    const raw = record(rawJob);
    const jobId = typeof raw.id === 'string' ? raw.id : 'invalid';
    let outcome: { state: string; reason?: string };
    try {
      outcome = await processAgentChannelJob(rawJob, {
      loadContext: async (job) => {
        const { data: link, error: linkError } = await admin.from('kwilt_phone_agent_links')
          .select('phone_e164,status,opted_out_at,permissions,timezone')
          .eq('id', job.phoneLinkId).eq('user_id', job.userId).maybeSingle();
        if (linkError || !link) throw new Error('phone_link_not_found');
        const { data: binding, error: bindingError } = await admin.from('kwilt_agent_channel_bindings')
          .select('thread_id').eq('channel', job.channel).eq('phone_link_id', job.phoneLinkId)
          .eq('user_id', job.userId).maybeSingle();
        if (bindingError) throw new Error('channel_binding_read_failed');
        return {
          phoneE164: String(link.phone_e164 ?? ''),
          status: String(link.status ?? ''),
          optedOutAt: typeof link.opted_out_at === 'string' ? link.opted_out_at : null,
          permissions: link.permissions && typeof link.permissions === 'object'
            ? link.permissions as Record<string, boolean>
            : {},
          threadId: binding && typeof binding.thread_id === 'string' ? binding.thread_id : null,
          timeZone: typeof link.timezone === 'string' ? link.timezone : 'UTC',
        };
      },
      execute: async (input) => {
        const request = normalizeAgentRunRequest({
          channel: input.channel, requestId: input.requestId, prompt: input.prompt, threadId: input.threadId,
          channelContext: {
            phoneLinkId: input.phoneLinkId,
            externalMessageId: input.externalMessageId,
            timeZone: input.timeZone,
          },
        });
        const isPro = await resolveServerProEntitlement(admin, input.userId);
        const result = await executeCanonicalAgentRun({
          request,
          userId: input.userId,
          persistence: createServiceAgentRunPersistence({ admin, userId: input.userId }),
          dataClient: admin,
          modelStep: ({ messages }) => requestServerAgentModel({
            supabaseUrl: url, anonKey, token: serviceRole, quotaIdentity: input.userId,
            isPro, messages, tools: SERVER_AGENT_TOOL_CATALOG,
          }),
          authorizeTool: (tool) => (
            (tool.id !== 'activities.capture' || input.permissions.create_activities === true)
            && (!['relationships.remember', 'relationships.correct', 'relationships.forget'].includes(tool.id)
              || input.permissions.remember_relationships === true)
          ),
        });
        if (!('answer' in result)) throw new Error(`channel_run_replayed_without_answer:${result.state}`);
        const run = record(result.run);
        const runId = requiredString(run, 'runId', 'run_id');
        const threadId = requiredString(run, 'threadId', 'thread_id');
        if (!runId || !threadId) throw new Error('channel_run_result_malformed');
        return { answer: result.answer, runId, threadId };
      },
      bindThread: async (userId, channel, phoneLinkId, threadId) => {
        const { error } = await admin.rpc('bind_kwilt_agent_channel_thread', {
          p_user_id: userId, p_channel: channel, p_phone_link_id: phoneLinkId, p_thread_id: threadId,
        });
        if (error) throw new Error('channel_binding_write_failed');
      },
      checkpointResponse: async (id, runId, answer) => {
        const { error } = await admin.rpc('checkpoint_kwilt_agent_channel_response', {
          p_job_id: id, p_run_id: runId, p_response_body: answer,
        });
        if (error) throw new Error('channel_response_checkpoint_failed');
      },
      enrichLegacyContext: async (id, prompt, permissions) => {
        const { error } = await admin.rpc('enrich_kwilt_agent_channel_activity', {
          p_job_id: id,
          p_facts: permissions.remember_relationships === true
            ? buildLegacyPhoneAgentEnrichmentPayload(prompt)
            : { people: [], memoryItems: [], events: [], cadences: [] },
          p_send_followups: permissions.send_followups === true,
        });
        if (error) throw new Error('channel_legacy_enrichment_failed');
      },
      sendSms: (to, body) => sendPhoneAgentSms({
        to, body, accountSid: twilioAccountSid, authToken: twilioAuthToken, from: twilioFrom,
      }),
      recordDeliveryPart: async (id, expectedPart, sid) => {
        const { error } = await admin.rpc('record_kwilt_agent_channel_delivery_part', {
          p_job_id: id, p_expected_part: expectedPart, p_outbound_message_id: sid,
        });
        if (error) throw new Error('channel_delivery_checkpoint_failed');
      },
      complete: async (id, runId, answer, outboundMessageIds) => {
        const { error } = await admin.rpc('finish_kwilt_agent_channel_job', {
          p_job_id: id, p_state: 'completed', p_run_id: runId, p_response_body: answer,
          p_error_code: null, p_error_message: null, p_outbound_message_ids: outboundMessageIds,
        });
        if (error) throw new Error('channel_job_completion_failed');
        await admin.from('kwilt_phone_agent_action_log').insert({
          user_id: raw.user_id,
          phone_link_id: raw.phone_link_id,
          channel: raw.channel === 'phone' ? 'voice' : 'sms',
          action_type: 'complete_agent_turn',
          twilio_message_sid: outboundMessageIds.at(-1) ?? null,
          input_summary: String(raw.external_message_id ?? ''),
          output_summary: `completed:${outboundMessageIds.length}`,
          permission_used: null,
        });
      },
      retry: async (id, delaySeconds, code) => {
        const { error } = await admin.rpc('retry_kwilt_agent_channel_job', {
          p_job_id: id, p_delay_seconds: delaySeconds, p_error_code: code,
          p_error_message: 'Kwilt will retry this response.',
        });
        if (error) throw new Error('channel_job_retry_failed');
      },
      fail: async (id, code) => {
        const { error } = await admin.rpc('finish_kwilt_agent_channel_job', {
          p_job_id: id, p_state: 'failed', p_run_id: null, p_response_body: null,
          p_error_code: code, p_error_message: 'Kwilt could not finish this response.', p_outbound_message_ids: [],
        });
        if (error) throw new Error('channel_job_failure_record_failed');
      },
      cancel: async (id, code) => {
        const { error } = await admin.rpc('finish_kwilt_agent_channel_job', {
          p_job_id: id, p_state: 'cancelled', p_run_id: null, p_response_body: null,
          p_error_code: code, p_error_message: 'This channel is no longer active.', p_outbound_message_ids: [],
        });
        if (error) throw new Error('channel_job_cancellation_failed');
      },
      });
    } catch {
      outcome = { state: 'failed', reason: 'worker_persistence_failed' };
    }
    outcomes.push({ id: jobId, state: outcome.state, ...('reason' in outcome ? { reason: outcome.reason } : {}) });
  }

  return json(200, {
    ok: true,
    claimed: outcomes.length,
    completed: outcomes.filter((item) => item.state === 'completed').length,
    queued: outcomes.filter((item) => item.state === 'queued').length,
    failed: outcomes.filter((item) => item.state === 'failed').length,
    cancelled: outcomes.filter((item) => item.state === 'cancelled').length,
    outcomes,
  });
});
