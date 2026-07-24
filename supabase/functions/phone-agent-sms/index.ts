/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  buildTwimlMessage,
  normalizeE164,
  normalizeSmsBody,
  parseSmsCommand,
  verifyTwilioSignature,
} from '../_shared/phoneAgent.ts';
import { buildAgentChannelJobInsert } from '../_shared/agentChannelJobs.ts';

type LinkRow = {
  id: string;
  user_id: string;
  phone_e164: string;
  status: string;
  opted_out_at: string | null;
  permissions: Record<string, boolean>;
  prompt_cap_per_day: number;
};

type PromptRow = {
  id: string;
  user_id: string;
  phone_link_id: string;
  activity_id: string | null;
};

const twimlHeaders = {
  'Content-Type': 'text/xml',
};

function twiml(message: string, status = 200) {
  return new Response(buildTwimlMessage(message), { status, headers: twimlHeaders });
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formRecord(form: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = value;
  }
  return params;
}

function safePermission(link: LinkRow, key: string): boolean {
  return link.permissions?.[key] === true;
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function insertActionLog(admin: SupabaseClient, values: Record<string, unknown>) {
  await admin.from('kwilt_phone_agent_action_log').insert({
    channel: 'sms',
    ...values,
  });
}

async function closePrompt(admin: SupabaseClient, link: LinkRow, messageSid: string, command: 'done' | 'snooze' | 'pause' | 'not_relevant', snoozeDays?: number) {
  const { data: prompt } = await admin
    .from('kwilt_phone_agent_prompts')
    .select('id, user_id, phone_link_id, activity_id')
    .eq('phone_link_id', link.id)
    .eq('state', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prompt) {
    return twiml('I do not have an open follow-up for this number. Text me what you want to save.');
  }

  const promptRow = prompt as PromptRow;
  const nowIso = new Date().toISOString();
  const nextState = command === 'done' ? 'done' : command === 'snooze' ? 'snoozed' : command === 'pause' ? 'paused' : 'not_relevant';
  const actionType = command === 'done' ? 'log_done_reply' : command === 'snooze' ? 'snooze_followup' : command === 'pause' ? 'pause_followup' : 'not_relevant';

  await admin
    .from('kwilt_phone_agent_prompts')
    .update({
      state: nextState,
      due_at: command === 'snooze' ? addDaysIso(snoozeDays ?? 2) : undefined,
      closed_at: command === 'snooze' ? null : nowIso,
      updated_at: nowIso,
    })
    .eq('id', promptRow.id);

  if (command === 'done' && promptRow.activity_id) {
    const { data: activity } = await admin
      .from('kwilt_activities')
      .select('data')
      .eq('user_id', link.user_id)
      .eq('id', promptRow.activity_id)
      .maybeSingle();
    const existingData = ((activity as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;
    const phoneAgent = (existingData.phoneAgent && typeof existingData.phoneAgent === 'object' ? existingData.phoneAgent : {}) as Record<string, unknown>;
    await admin
      .from('kwilt_activities')
      .update({
        data: {
          ...existingData,
          status: 'done',
          completedAt: nowIso,
          updatedAt: nowIso,
          phoneAgent: {
            ...phoneAgent,
            doneReply: {
              channel: 'sms',
              twilioMessageSid: messageSid,
              repliedAt: nowIso,
            },
          },
        },
        updated_at: nowIso,
      })
      .eq('user_id', link.user_id)
      .eq('id', promptRow.activity_id);
  }

  await insertActionLog(admin, {
    user_id: link.user_id,
    phone_link_id: link.id,
    action_type: actionType,
    activity_id: promptRow.activity_id,
    prompt_id: promptRow.id,
    twilio_message_sid: messageSid,
    input_summary: command,
    output_summary: nextState,
    permission_used: command === 'done' ? 'log_done_replies' : 'send_followups',
  });

  if (command === 'done') return twiml('Done. I closed that follow-up in Kwilt.');
  if (command === 'snooze') return twiml(`Snoozed for ${snoozeDays ?? 2} days.`);
  if (command === 'pause') return twiml('Paused. You can manage Phone Agent follow-ups in Kwilt settings.');
  return twiml('Got it. I marked that follow-up as not relevant.');
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return twiml('Method not allowed.', 405);
  }

  const admin = getSupabaseAdmin();
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const webhookUrl = Deno.env.get('PHONE_AGENT_TWILIO_WEBHOOK_URL');
  if (!admin || !authToken || !webhookUrl) {
    return twiml('Kwilt Phone Agent is not configured yet.', 503);
  }

  const form = new URLSearchParams(await req.text());
  const params = formRecord(form);
  const validSignature = await verifyTwilioSignature({
    url: webhookUrl,
    params,
    signature: req.headers.get('X-Twilio-Signature'),
    authToken,
  });
  if (!validSignature) {
    return twiml('Invalid signature.', 403);
  }

  const fromPhone = normalizeE164(params.From);
  const body = normalizeSmsBody(params.Body);
  const messageSid = params.MessageSid || params.SmsMessageSid || crypto.randomUUID();
  const command = parseSmsCommand(body);

  if (!fromPhone) {
    return twiml('Kwilt does not know this number yet. Open Kwilt -> Settings -> Phone Agent to link it.');
  }
  if (!body) return twiml('Text me what you want help with, and I’ll take it from there.');

  const { data: linkData } = await admin
    .from('kwilt_phone_agent_links')
    .select('id, user_id, phone_e164, status, opted_out_at, permissions, prompt_cap_per_day')
    .eq('phone_e164', fromPhone)
    .maybeSingle();
  const link = linkData as LinkRow | null;

  if (!link) {
    if (command.kind === 'help') {
      return twiml('Kwilt Phone Agent saves messages into Kwilt after you link your number in Settings. Reply STOP to opt out.');
    }
    if (command.kind === 'stop') {
      return twiml('You are opted out of Kwilt Phone Agent texts.');
    }
    if (command.kind === 'start') {
      return twiml('Open Kwilt Settings to link this number before using Phone Agent.');
    }
    return twiml('Kwilt does not know this number yet. Open Kwilt -> Settings -> Phone Agent to link it.');
  }

  if (command.kind === 'help') {
    return twiml('Kwilt Phone Agent saves messages into Kwilt and can send follow-ups you control in Settings. Reply STOP to opt out.');
  }

  if (command.kind === 'stop') {
    await admin
      .from('kwilt_phone_agent_links')
      .update({
        status: 'opted_out',
        opted_out_at: new Date().toISOString(),
        permissions: {
          ...link.permissions,
          send_followups: false,
          log_done_replies: false,
          offer_drafts: false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id);
    return twiml('You are opted out of Kwilt Phone Agent texts. Reply START to re-enable.');
  }

  if (command.kind === 'start') {
    if (link.status === 'verified' && !link.opted_out_at) {
      return twiml('Kwilt Phone Agent is already enabled for this number.');
    }
    if (link.status !== 'opted_out') {
      return twiml('Open Kwilt Settings to verify this number before using Phone Agent.');
    }
    await admin
      .from('kwilt_phone_agent_links')
      .update({
        status: 'verified',
        opted_out_at: null,
        permissions: {
          ...link.permissions,
          send_followups: false,
          log_done_replies: false,
          offer_drafts: false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id);
    return twiml('Kwilt Phone Agent is re-enabled. Open Kwilt Settings to choose follow-up permissions.');
  }

  if (link.status !== 'verified' || link.opted_out_at) {
    return twiml('Kwilt Phone Agent texts are paused for this number. Reply START to re-enable.');
  }

  const { data: previouslyHandled } = await admin
    .from('kwilt_phone_agent_action_log')
    .select('id, action_type')
    .eq('phone_link_id', link.id)
    .eq('twilio_message_sid', messageSid)
    .maybeSingle();
  if (previouslyHandled) {
    return twiml('Already handled. Text me anything new you want to save.');
  }

  if (command.kind === 'done') {
    if (!safePermission(link, 'log_done_replies')) {
      return twiml('Done replies are off for this number. You can change that in Kwilt settings.');
    }
    return closePrompt(admin, link, messageSid, 'done');
  }
  if (command.kind === 'snooze') return closePrompt(admin, link, messageSid, 'snooze', command.durationDays);
  if (command.kind === 'pause') return closePrompt(admin, link, messageSid, 'pause');
  if (command.kind === 'not_relevant') return closePrompt(admin, link, messageSid, 'not_relevant');
  if (command.kind === 'change_time') {
    return twiml('Got it. Open Kwilt settings to adjust Phone Agent timing for now.');
  }

  const queued = buildAgentChannelJobInsert({
    userId: link.user_id,
    phoneLinkId: link.id,
    externalMessageId: messageSid,
    prompt: body,
  });
  const { error: queueError } = await admin.from('kwilt_agent_channel_jobs').upsert(queued, {
    onConflict: 'channel,phone_link_id,external_message_id',
    ignoreDuplicates: true,
  });
  if (queueError) return twiml('Kwilt could not queue that yet. Please try again.', 503);

  await insertActionLog(admin, {
    user_id: link.user_id,
    phone_link_id: link.id,
    action_type: 'queue_agent_turn',
    twilio_message_sid: messageSid,
    input_summary: 'sms_agent_request',
    output_summary: 'queued',
    permission_used: null,
  });
  return twiml('Got it. I’m working on that and will text back shortly.');
});
