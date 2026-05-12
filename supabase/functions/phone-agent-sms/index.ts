/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  buildBirthdayPromptSchedule,
  buildPhoneActivityData,
  buildTwimlMessage,
  extractPhoneAgentFacts,
  normalizeE164,
  normalizeSmsBody,
  parseSmsCommand,
  verifyTwilioSignature,
} from '../_shared/phoneAgent.ts';

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

function nextMorningIso(): string {
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
  due.setUTCHours(9, 0, 0, 0);
  return due.toISOString();
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function dateTextToDueIso(dateText: string): string {
  return `${dateText}T09:00:00.000Z`;
}

async function insertActionLog(admin: SupabaseClient, values: Record<string, unknown>) {
  await admin.from('kwilt_phone_agent_action_log').insert({
    channel: 'sms',
    ...values,
  });
}

async function findOrCreatePerson(admin: SupabaseClient, userId: string, displayName: string) {
  const aliasKey = displayName.trim().toLowerCase();
  const { data: existingAlias } = await admin
    .from('kwilt_phone_agent_person_aliases')
    .select('person_id')
    .eq('user_id', userId)
    .eq('alias_key', aliasKey)
    .maybeSingle();

  const existingPersonId = (existingAlias as { person_id?: string } | null)?.person_id;
  if (existingPersonId) return existingPersonId;

  const { data: person, error } = await admin
    .from('kwilt_phone_agent_people')
    .insert({
      user_id: userId,
      display_name: displayName,
    })
    .select('id')
    .single();

  if (error || !person) return null;
  const personId = (person as { id: string }).id;
  await admin.from('kwilt_phone_agent_person_aliases').upsert(
    {
      user_id: userId,
      person_id: personId,
      alias_text: displayName,
    },
    { onConflict: 'user_id,alias_key' },
  );
  return personId;
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

  if (!safePermission(link, 'create_activities')) {
    return twiml('Phone Agent is linked, but Activity creation is off. Turn it on in Kwilt settings to save texts into Kwilt.');
  }

  const nowIso = new Date().toISOString();
  const activityId = `activity-phone-${messageSid}`;
  const facts = extractPhoneAgentFacts(body);
  const peopleByName = new Map<string, string>();

  for (const person of facts.people) {
    const personId = await findOrCreatePerson(admin, link.user_id, person.displayName);
    if (!personId) continue;
    peopleByName.set(person.displayName, personId);
    for (const alias of person.aliases) {
      await admin.from('kwilt_phone_agent_person_aliases').upsert(
        {
          user_id: link.user_id,
          person_id: personId,
          alias_text: alias,
        },
        { onConflict: 'user_id,alias_key' },
      );
    }
  }

  const { data: existingActivity } = await admin
    .from('kwilt_activities')
    .select('id')
    .eq('user_id', link.user_id)
    .eq('id', activityId)
    .maybeSingle();

  if (!existingActivity) {
    const activityData = buildPhoneActivityData({
      id: activityId,
      title: body,
      nowIso,
      source: {
        channel: 'sms',
        twilioMessageSid: messageSid,
        fromPhone,
      },
    });
    await admin.from('kwilt_activities').insert({
      user_id: link.user_id,
      id: activityId,
      data: activityData,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }

  const linkedIds: {
    person_id?: string;
    memory_item_id?: string;
    event_id?: string;
    cadence_id?: string;
  } = {};

  for (const item of facts.memoryItems) {
    const personId = peopleByName.get(item.personName) ?? null;
    const { data } = await admin
      .from('kwilt_phone_agent_memory_items')
      .insert({
        user_id: link.user_id,
        person_id: personId,
        activity_id: activityId,
        kind: item.kind,
        text: item.text,
        source_channel: 'sms',
        source_twilio_message_sid: messageSid,
      })
      .select('id')
      .single();
    if ((data as { id?: string } | null)?.id) linkedIds.memory_item_id = (data as { id: string }).id;
    if (personId) linkedIds.person_id = personId;
  }

  for (const event of facts.events) {
    const personId = peopleByName.get(event.personName) ?? null;
    const { data } = await admin
      .from('kwilt_phone_agent_events')
      .insert({
        user_id: link.user_id,
        person_id: personId,
        activity_id: activityId,
        kind: event.kind,
        title: event.title,
        date_text: event.dateText,
      })
      .select('id')
      .single();
    const eventId = (data as { id?: string } | null)?.id ?? null;
    if (eventId) linkedIds.event_id = eventId;
    if (personId) linkedIds.person_id = personId;

    if (event.kind === 'birthday' && eventId) {
      for (const schedule of buildBirthdayPromptSchedule({ dateText: event.dateText, nowIso })) {
        await admin.from('kwilt_phone_agent_prompts').insert({
          user_id: link.user_id,
          phone_link_id: link.id,
          activity_id: activityId,
          person_id: personId,
          event_id: eventId,
          source_kind: 'event',
          prompt_kind: 'birthday',
          due_at: dateTextToDueIso(schedule.dueDateText),
          body: schedule.offsetDays === 10
            ? `${event.title} is in 10 days. Want to plan something small?`
            : `${event.title} is tomorrow. Want to send a note?`,
          payload: { offsetDays: schedule.offsetDays },
        });
      }
    }
  }

  for (const cadence of facts.cadences) {
    const personId = peopleByName.get(cadence.personName) ?? null;
    const { data } = await admin
      .from('kwilt_phone_agent_cadences')
      .insert({
        user_id: link.user_id,
        person_id: personId,
        activity_id: activityId,
        kind: cadence.kind,
        interval_days: cadence.intervalDays,
        next_due_at: addDaysIso(cadence.intervalDays),
      })
      .select('id')
      .single();
    const cadenceId = (data as { id?: string } | null)?.id ?? null;
    if (cadenceId) linkedIds.cadence_id = cadenceId;
    if (personId) linkedIds.person_id = personId;
  }

  const hasSpecificSchedule = facts.events.some((event) => event.kind === 'birthday') || facts.cadences.length > 0;
  if (safePermission(link, 'send_followups') && !hasSpecificSchedule) {
    await admin.from('kwilt_phone_agent_prompts').insert({
      user_id: link.user_id,
      phone_link_id: link.id,
      activity_id: activityId,
      source_kind: 'activity',
      prompt_kind: 'followup',
      due_at: nextMorningIso(),
      body: `Did you make progress on "${body.slice(0, 80)}"? Reply done, snooze 2d, pause, or not relevant.`,
    });
  }

  await insertActionLog(admin, {
    user_id: link.user_id,
    phone_link_id: link.id,
    action_type: 'capture_activity',
    activity_id: activityId,
    twilio_message_sid: messageSid,
    input_summary: 'sms_capture',
    output_summary: 'activity_saved',
    permission_used: 'create_activities',
    ...linkedIds,
  });

  if (safePermission(link, 'send_followups')) {
    return twiml('Saved. I can remind you tomorrow morning. Reply `change time` if that is wrong.');
  }
  return twiml('Saved. You can manage Phone Agent follow-ups in Kwilt settings.');
});
