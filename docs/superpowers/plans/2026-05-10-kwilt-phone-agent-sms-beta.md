# Kwilt Phone Agent SMS Follow-Through Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 SMS Follow-Through Beta for Kwilt Phone Agent: authenticated phone linking, Twilio inbound SMS capture, lightweight relational memory, Activity creation, follow-up scheduling, loop closure replies, and app-canvas governance.

**Architecture:** Keep the first slice SMS-first and Kwilt-native. Supabase Edge Functions own phone linking, Twilio webhooks, deterministic rule-based extraction, prompt scheduling, and action logging; the mobile app exposes Settings -> Phone Agent for linking, permissions, and audit. Concrete follow-through becomes mobile-compatible `kwilt_activities` rows; relational context, follow-up, and audit metadata live in dedicated phone-agent tables.

**Tech Stack:** Expo React Native, Supabase Postgres/RLS, Supabase Edge Functions (Deno TypeScript), Twilio Programmable Messaging, Jest for pure shared helper tests, `npm run product:lint`, `npm run lint`, and targeted Jest commands.

---

## Scope Boundary

This plan implements SMS only. Voice calls, group threads, household members, user-facing People/Memory surfaces, and outbound voice are deliberately excluded. Internal Person/Memory/Event/Cadence records are included because the beta's relational follow-through loops depend on them. The beta still designs the database so voice can reuse the same action log, relational context, and prompt state in a later plan.

## File Structure

- Create `supabase/functions/_shared/phoneAgent.ts` for pure helpers shared by phone-agent Edge Functions.
- Create `supabase/functions/_shared/__tests__/phoneAgent.test.ts` for helper behavior.
- Create a Supabase migration with `npx supabase migration new kwilt_phone_agent_sms_beta`, then edit the generated SQL file for phone links, people, aliases, memory items, events, cadences, prompts, and action logs.
- Create `supabase/functions/phone-agent-link/index.ts` for authenticated phone linking, verification, settings, and revoke.
- Create `supabase/functions/phone-agent-sms/index.ts` for Twilio inbound SMS and status callbacks.
- Create `supabase/functions/phone-agent-tick/index.ts` for scheduled due-prompt sending.
- Create `src/services/phoneAgent.ts` for app-side Edge Function calls.
- Create `src/features/account/PhoneAgentSettingsScreen.tsx` for app canvas governance.
- Modify `src/navigation/RootNavigator.tsx` to register `SettingsPhoneAgent`.
- Modify `src/features/account/SettingsHomeScreen.tsx` to add a Phone Agent settings row.
- Modify `docs/feature-briefs/kwilt-phone-agent.md` only if implementation decisions materially differ from the brief.

---

### Task 1: Shared Phone-Agent Helpers

**Files:**
- Create: `supabase/functions/_shared/phoneAgent.ts`
- Create: `supabase/functions/_shared/__tests__/phoneAgent.test.ts`

- [ ] **Step 1: Write failing tests for normalization, Twilio signature validation, SMS commands, birthday prompt dates, and activity data**

Create `supabase/functions/_shared/__tests__/phoneAgent.test.ts`:

```ts
import { webcrypto, createHmac } from 'node:crypto';

declare const globalThis: {
  crypto?: typeof webcrypto;
};

beforeAll(() => {
  if (!globalThis.crypto) {
    (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
  }
});

function loadModule() {
  jest.resetModules();
  return require('../phoneAgent') as typeof import('../phoneAgent');
}

function signTwilio(url: string, params: Record<string, string>, token: string) {
  const data = url + Object.keys(params).sort().map((key) => `${key}${params[key]}`).join('');
  return createHmac('sha1', token).update(data).digest('base64');
}

describe('phoneAgent shared helpers', () => {
  test('normalizes E.164 phone numbers and rejects unsafe input', () => {
    const mod = loadModule();
    expect(mod.normalizeE164('+1 (415) 555-1212')).toBe('+14155551212');
    expect(mod.normalizeE164('4155551212')).toBe('+14155551212');
    expect(mod.normalizeE164('+442071838750')).toBe('+442071838750');
    expect(mod.normalizeE164('abc')).toBeNull();
    expect(mod.normalizeE164('+123')).toBeNull();
  });

  test('parses loop closure commands without treating normal capture as commands', () => {
    const mod = loadModule();
    expect(mod.parseSmsCommand('done')).toEqual({ kind: 'done' });
    expect(mod.parseSmsCommand('snooze 2d')).toEqual({ kind: 'snooze', durationDays: 2 });
    expect(mod.parseSmsCommand('pause')).toEqual({ kind: 'pause' });
    expect(mod.parseSmsCommand('not relevant')).toEqual({ kind: 'not_relevant' });
    expect(mod.parseSmsCommand('STOP')).toEqual({ kind: 'stop' });
    expect(mod.parseSmsCommand('START')).toEqual({ kind: 'start' });
    expect(mod.parseSmsCommand('help')).toEqual({ kind: 'help' });
    expect(mod.parseSmsCommand('Call Dad this weekend')).toEqual({ kind: 'capture' });
  });

  test('validates Twilio signatures with sorted form params', async () => {
    const mod = loadModule();
    const url = 'https://auth.kwilt.app/functions/v1/phone-agent-sms';
    const params = {
      Body: 'Call Dad this weekend',
      From: '+14155551212',
      MessageSid: 'SM123',
      To: '+18885550100',
    };
    const token = 'twilio-token';
    const signature = signTwilio(url, params, token);
    await expect(mod.verifyTwilioSignature({ url, params, signature, authToken: token })).resolves.toBe(true);
    await expect(mod.verifyTwilioSignature({ url, params, signature: 'bad', authToken: token })).resolves.toBe(false);
  });

  test('builds mobile-compatible phone-origin Activity data', () => {
    const mod = loadModule();
    const data = mod.buildPhoneActivityData({
      id: 'activity-phone-SM123',
      title: 'Call Dad this weekend',
      nowIso: '2026-05-10T19:30:00.000Z',
      source: {
        channel: 'sms',
        twilioMessageSid: 'SM123',
        fromPhone: '+14155551212',
      },
    });
    expect(data.id).toBe('activity-phone-SM123');
    expect(data.title).toBe('Call Dad this weekend');
    expect(data.goalId).toBeNull();
    expect(data.status).toBe('planned');
    expect(data.creationSource).toBe('phone_agent');
    expect(data.phoneAgent?.channel).toBe('sms');
    expect(data.phoneAgent?.twilioMessageSid).toBe('SM123');
  });

  test('builds birthday prompt offsets for the next occurrence', () => {
    const mod = loadModule();
    expect(mod.buildBirthdayPromptSchedule({
      dateText: 'Oct 12',
      nowIso: '2026-05-10T12:00:00.000Z',
    })).toEqual([
      { kind: 'birthday', dueDateText: '2026-10-02', offsetDays: 10 },
      { kind: 'birthday', dueDateText: '2026-10-11', offsetDays: 1 },
    ]);
  });

  test('extracts simple relationship memory from birthday and cadence messages', () => {
    const mod = loadModule();
    expect(mod.extractPhoneAgentFacts("Lily's birthday is Oct 12. She likes dragons.")).toEqual({
      people: [{ displayName: 'Lily', aliases: ['Lily'] }],
      memoryItems: [{ personName: 'Lily', kind: 'preference', text: 'likes dragons' }],
      events: [{ personName: 'Lily', kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12' }],
      cadences: [],
    });
    expect(mod.extractPhoneAgentFacts("Remind me if I haven't called Dad in 3 weeks.")).toEqual({
      people: [{ displayName: 'Dad', aliases: ['Dad'] }],
      memoryItems: [],
      events: [],
      cadences: [{ personName: 'Dad', kind: 'drift', intervalDays: 21 }],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- supabase/functions/_shared/__tests__/phoneAgent.test.ts --runInBand`

Expected: FAIL because `../phoneAgent` does not exist.

- [ ] **Step 3: Implement the shared helper module**

Create `supabase/functions/_shared/phoneAgent.ts`:

```ts
export type SmsCommand =
  | { kind: 'capture' }
  | { kind: 'done' }
  | { kind: 'snooze'; durationDays: number }
  | { kind: 'pause' }
  | { kind: 'not_relevant' }
  | { kind: 'stop' }
  | { kind: 'start' }
  | { kind: 'help' }
  | { kind: 'change_time' };

export function normalizeE164(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  const normalized = plus ? `+${digits}` : digits.length === 10 ? `+1${digits}` : `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function normalizeSmsBody(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
}

export function parseSmsCommand(raw: unknown): SmsCommand {
  const body = normalizeSmsBody(raw).toLowerCase();
  if (body === 'done') return { kind: 'done' };
  if (body === 'pause') return { kind: 'pause' };
  if (body === 'not relevant' || body === 'not_relevant') return { kind: 'not_relevant' };
  if (body === 'stop' || body === 'unsubscribe' || body === 'cancel') return { kind: 'stop' };
  if (body === 'start' || body === 'unstop') return { kind: 'start' };
  if (body === 'help' || body === 'info') return { kind: 'help' };
  if (body === 'change time' || body === 'change_time') return { kind: 'change_time' };
  const snooze = /^snooze\s+(\d{1,2})d$/.exec(body);
  if (snooze) return { kind: 'snooze', durationDays: Math.max(1, Math.min(30, Number(snooze[1]))) };
  return { kind: 'capture' };
}

export async function verifyTwilioSignature(params: {
  url: string;
  params: Record<string, string>;
  signature: string | null;
  authToken: string | null;
}): Promise<boolean> {
  if (!params.signature || !params.authToken) return false;
  const signed = params.url + Object.keys(params.params).sort().map((key) => `${key}${params.params[key]}`).join('');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(params.authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return expected === params.signature;
}

export function buildTwimlMessage(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

export function buildPhoneActivityData(params: {
  id: string;
  title: string;
  nowIso: string;
  source: {
    channel: 'sms';
    twilioMessageSid: string;
    fromPhone: string;
  };
}) {
  const title = params.title.trim().replace(/\s+/g, ' ').slice(0, 120);
  return {
    id: params.id,
    goalId: null,
    title,
    type: 'task',
    tags: [],
    notes: undefined,
    steps: [],
    reminderAt: null,
    priority: undefined,
    estimateMinutes: null,
    difficulty: undefined,
    creationSource: 'phone_agent',
    planGroupId: null,
    scheduledDate: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    orderIndex: Date.now(),
    phase: null,
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: {},
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
    phoneAgent: params.source,
  };
}

export function buildBirthdayPromptSchedule(params: {
  dateText: string;
  nowIso: string;
}): Array<{ kind: 'birthday'; dueDateText: string; offsetDays: 10 | 1 }> {
  const match = /^([A-Z][a-z]{2,8})\s+(\d{1,2})$/.exec(params.dateText.trim());
  if (!match) return [];
  const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };
  const now = new Date(params.nowIso);
  const month = months[match[1].toLowerCase()];
  const day = Number(match[2]);
  if (month == null || !Number.isInteger(day) || day < 1 || day > 31) return [];
  let eventDate = new Date(Date.UTC(now.getUTCFullYear(), month, day, 9, 0, 0, 0));
  if (eventDate.getTime() <= now.getTime()) {
    eventDate = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day, 9, 0, 0, 0));
  }
  return ([10, 1] as const).map((offsetDays) => {
    const due = new Date(eventDate);
    due.setUTCDate(eventDate.getUTCDate() - offsetDays);
    return {
      kind: 'birthday',
      dueDateText: due.toISOString().slice(0, 10),
      offsetDays,
    };
  });
}

export type ExtractedPhoneAgentFacts = {
  people: Array<{ displayName: string; aliases: string[] }>;
  memoryItems: Array<{ personName: string; kind: 'preference' | 'note'; text: string }>;
  events: Array<{ personName: string; kind: 'birthday' | 'event'; title: string; dateText: string }>;
  cadences: Array<{ personName: string; kind: 'drift'; intervalDays: number }>;
};

export function extractPhoneAgentFacts(raw: unknown): ExtractedPhoneAgentFacts {
  const body = normalizeSmsBody(raw);
  const empty: ExtractedPhoneAgentFacts = { people: [], memoryItems: [], events: [], cadences: [] };
  const birthday = /^([A-Z][A-Za-z' -]{1,40})'s birthday is ([A-Z][a-z]{2,8}\s+\d{1,2})\.?\s*(.*)$/i.exec(body);
  if (birthday) {
    const displayName = birthday[1].trim();
    const remainder = birthday[3].trim().replace(/\.$/, '');
    return {
      people: [{ displayName, aliases: [displayName] }],
      memoryItems: remainder ? [{ personName: displayName, kind: 'preference', text: remainder }] : [],
      events: [{ personName: displayName, kind: 'birthday', title: `${displayName}'s birthday`, dateText: birthday[2].trim() }],
      cadences: [],
    };
  }
  const drift = /haven't\s+called\s+([A-Z][A-Za-z' -]{1,40})\s+in\s+(\d{1,2})\s+weeks?/i.exec(body);
  if (drift) {
    const displayName = drift[1].trim();
    return {
      ...empty,
      people: [{ displayName, aliases: [displayName] }],
      cadences: [{ personName: displayName, kind: 'drift', intervalDays: Number(drift[2]) * 7 }],
    };
  }
  return empty;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- supabase/functions/_shared/__tests__/phoneAgent.test.ts --runInBand`

Expected: PASS.

---

### Task 2: Phone-Agent Database Schema

**Files:**
- Create: `supabase/migrations/<generated>_kwilt_phone_agent_sms_beta.sql`

- [ ] **Step 1: Generate the migration file**

Run: `npx supabase migration new kwilt_phone_agent_sms_beta`

Expected: Supabase CLI creates a new file under `supabase/migrations/` ending in `_kwilt_phone_agent_sms_beta.sql`. Use that generated path for the SQL below; do not invent the timestamp by hand.

- [ ] **Step 2: Add phone linking, relationship primitives, prompt state, and action log tables**

Edit the generated migration file:

```sql
-- Kwilt Phone Agent SMS beta.
-- - Phone links tie verified E.164 numbers to one Kwilt user.
-- - Lightweight relational primitives support people, memory, events, and cadences.
-- - Prompts carry right-time SMS follow-through.
-- - Action logs explain every phone-agent capture, prompt, reply, and correction.

create table if not exists public.kwilt_phone_agent_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_e164 text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'opted_out', 'revoked')),
  verification_code_hash text null,
  verification_expires_at timestamptz null,
  verified_at timestamptz null,
  opted_out_at timestamptz null,
  revoked_at timestamptz null,
  permissions jsonb not null default jsonb_build_object(
    'create_activities', false,
    'send_followups', false,
    'log_done_replies', false,
    'offer_drafts', false,
    'suggest_arc_alignment', false
  ),
  quiet_hours jsonb not null default jsonb_build_object('enabled', false),
  prompt_cap_per_day integer not null default 3 check (prompt_cap_per_day between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone_e164)
);

create index if not exists kwilt_phone_agent_links_user_idx
  on public.kwilt_phone_agent_links(user_id, status);

create table if not exists public.kwilt_phone_agent_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_phone_agent_people_user_name_idx
  on public.kwilt_phone_agent_people(user_id, lower(display_name));

create table if not exists public.kwilt_phone_agent_person_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.kwilt_phone_agent_people(id) on delete cascade,
  alias_text text not null,
  alias_key text generated always as (lower(btrim(alias_text))) stored,
  created_at timestamptz not null default now(),
  unique (user_id, alias_key)
);

create index if not exists kwilt_phone_agent_person_aliases_person_idx
  on public.kwilt_phone_agent_person_aliases(person_id);

create table if not exists public.kwilt_phone_agent_memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid null references public.kwilt_phone_agent_people(id) on delete set null,
  activity_id text null,
  kind text not null check (kind in ('preference', 'constraint', 'note', 'sensitivity', 'milestone')),
  text text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'superseded')),
  source_channel text not null default 'sms' check (source_channel in ('sms', 'voice', 'app')),
  source_twilio_message_sid text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_phone_agent_memory_user_idx
  on public.kwilt_phone_agent_memory_items(user_id, created_at desc);
create index if not exists kwilt_phone_agent_memory_person_idx
  on public.kwilt_phone_agent_memory_items(person_id, created_at desc);

create table if not exists public.kwilt_phone_agent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid null references public.kwilt_phone_agent_people(id) on delete set null,
  activity_id text null,
  kind text not null check (kind in ('birthday', 'gathering', 'deadline', 'post_event', 'other')),
  title text not null,
  starts_at timestamptz null,
  date_text text null,
  timezone text null,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_phone_agent_events_user_time_idx
  on public.kwilt_phone_agent_events(user_id, starts_at);
create index if not exists kwilt_phone_agent_events_person_idx
  on public.kwilt_phone_agent_events(person_id, starts_at);

create table if not exists public.kwilt_phone_agent_cadences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid null references public.kwilt_phone_agent_people(id) on delete set null,
  activity_id text null,
  kind text not null check (kind in ('drift', 'recurring_followup', 'other')),
  interval_days integer not null check (interval_days between 1 and 730),
  next_due_at timestamptz null,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_phone_agent_cadences_due_idx
  on public.kwilt_phone_agent_cadences(user_id, status, next_due_at);
create index if not exists kwilt_phone_agent_cadences_person_idx
  on public.kwilt_phone_agent_cadences(person_id, status);

create table if not exists public.kwilt_phone_agent_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_link_id uuid not null references public.kwilt_phone_agent_links(id) on delete cascade,
  activity_id text null,
  person_id uuid null references public.kwilt_phone_agent_people(id) on delete set null,
  memory_item_id uuid null references public.kwilt_phone_agent_memory_items(id) on delete set null,
  event_id uuid null references public.kwilt_phone_agent_events(id) on delete set null,
  cadence_id uuid null references public.kwilt_phone_agent_cadences(id) on delete set null,
  source_kind text not null check (source_kind in ('activity', 'memory_item', 'event', 'cadence', 'manual')),
  prompt_kind text not null check (prompt_kind in ('followup', 'birthday', 'drift', 'post_event', 'draft_offer')),
  state text not null default 'pending' check (state in ('pending', 'sent', 'done', 'snoozed', 'paused', 'cancelled', 'not_relevant')),
  due_at timestamptz not null,
  sent_at timestamptz null,
  closed_at timestamptz null,
  last_twilio_message_sid text null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_phone_agent_prompts_due_idx
  on public.kwilt_phone_agent_prompts(state, due_at);
create index if not exists kwilt_phone_agent_prompts_user_idx
  on public.kwilt_phone_agent_prompts(user_id, created_at desc);

create table if not exists public.kwilt_phone_agent_action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_link_id uuid null references public.kwilt_phone_agent_links(id) on delete set null,
  channel text not null check (channel in ('sms', 'voice', 'app')),
  action_type text not null,
  activity_id text null,
  person_id uuid null references public.kwilt_phone_agent_people(id) on delete set null,
  memory_item_id uuid null references public.kwilt_phone_agent_memory_items(id) on delete set null,
  event_id uuid null references public.kwilt_phone_agent_events(id) on delete set null,
  cadence_id uuid null references public.kwilt_phone_agent_cadences(id) on delete set null,
  prompt_id uuid null references public.kwilt_phone_agent_prompts(id) on delete set null,
  twilio_message_sid text null,
  input_summary text null,
  output_summary text null,
  permission_used text null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_phone_agent_action_log_user_idx
  on public.kwilt_phone_agent_action_log(user_id, created_at desc);

alter table public.kwilt_phone_agent_links enable row level security;
alter table public.kwilt_phone_agent_people enable row level security;
alter table public.kwilt_phone_agent_person_aliases enable row level security;
alter table public.kwilt_phone_agent_memory_items enable row level security;
alter table public.kwilt_phone_agent_events enable row level security;
alter table public.kwilt_phone_agent_cadences enable row level security;
alter table public.kwilt_phone_agent_prompts enable row level security;
alter table public.kwilt_phone_agent_action_log enable row level security;

drop policy if exists "kwilt_phone_agent_links_owner_only" on public.kwilt_phone_agent_links;
create policy "kwilt_phone_agent_links_owner_only"
  on public.kwilt_phone_agent_links
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_phone_agent_people_owner_only" on public.kwilt_phone_agent_people;
create policy "kwilt_phone_agent_people_owner_only"
  on public.kwilt_phone_agent_people
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_phone_agent_person_aliases_owner_only" on public.kwilt_phone_agent_person_aliases;
create policy "kwilt_phone_agent_person_aliases_owner_only"
  on public.kwilt_phone_agent_person_aliases
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_phone_agent_memory_items_owner_only" on public.kwilt_phone_agent_memory_items;
create policy "kwilt_phone_agent_memory_items_owner_only"
  on public.kwilt_phone_agent_memory_items
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_phone_agent_events_owner_only" on public.kwilt_phone_agent_events;
create policy "kwilt_phone_agent_events_owner_only"
  on public.kwilt_phone_agent_events
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_phone_agent_cadences_owner_only" on public.kwilt_phone_agent_cadences;
create policy "kwilt_phone_agent_cadences_owner_only"
  on public.kwilt_phone_agent_cadences
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_phone_agent_prompts_owner_only" on public.kwilt_phone_agent_prompts;
create policy "kwilt_phone_agent_prompts_owner_only"
  on public.kwilt_phone_agent_prompts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_phone_agent_action_log_owner_only" on public.kwilt_phone_agent_action_log;
create policy "kwilt_phone_agent_action_log_owner_only"
  on public.kwilt_phone_agent_action_log
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

- [ ] **Step 3: Validate migration through the remote Supabase workflow**

Run a dry run against the linked project:

```bash
npx supabase db push --dry-run --linked
```

Expected: the generated `kwilt_phone_agent_sms_beta` migration is listed as pending and the SQL parses. This repo does not assume Docker/local Supabase for verification. If the CLI asks for database auth, set `SUPABASE_DB_PASSWORD` for the linked project before rerunning.

When ready to apply:

```bash
npx supabase db push --linked
```

---

### Task 3: Authenticated Phone Linking Edge Function

**Files:**
- Create: `supabase/functions/phone-agent-link/index.ts`
- Modify: `app.config.ts` if new public env vars are required for local beta visibility.

- [ ] **Step 1: Implement `phone-agent-link` request surface**

Create `supabase/functions/phone-agent-link/index.ts` with these actions:

```ts
type LinkAction =
  | { action: 'request_code'; phone: string }
  | { action: 'verify_code'; phone: string; code: string }
  | { action: 'update_settings'; phone: string; permissions: Record<string, boolean>; promptCapPerDay: number }
  | { action: 'revoke'; phone: string }
  | { action: 'status' };
```

Implementation requirements:

- Use the authenticated user's JWT exactly like `supabase/functions/create-activity/index.ts`.
- Normalize phone numbers with `normalizeE164`.
- Store verification codes as SHA-256 hashes, not plaintext.
- Verification codes expire after 10 minutes.
- Send the verification code with Twilio only from `request_code`.
- Never log the raw code.
- Return only the current user's links, settings, memory summary, and recent action log rows.
- Exclude raw SMS body text from the action log response.

Core response shapes:

```ts
type PhoneAgentLinkResponse =
  | { ok: true; status: 'code_sent'; phone: string }
  | { ok: true; status: 'verified'; phone: string }
  | { ok: true; status: 'revoked'; phone: string }
  | {
      ok: true;
      links: Array<{ phone: string; status: string; permissions: Record<string, boolean>; promptCapPerDay: number; optedOutAt: string | null }>;
      memorySummary: { peopleCount: number; activeEventsCount: number; activeCadencesCount: number };
      recentActions: Array<{ id: string; actionType: string; createdAt: string; activityId: string | null; promptId: string | null }>;
    }
  | { ok: false; error: 'missing_authorization' | 'invalid_user' | 'invalid_phone' | 'invalid_code' | 'twilio_send_failed' };
```

- [ ] **Step 2: Manual curl verification**

Run this with a real local auth token:

```bash
curl -X POST "$SUPABASE_FUNCTIONS_URL/phone-agent-link" \
  -H "Authorization: Bearer $KWILT_TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  --data '{"action":"status"}'
```

Expected: `{"ok":true,"links":[],"memorySummary":{"peopleCount":0,"activeEventsCount":0,"activeCadencesCount":0},"recentActions":[]}` for a user with no linked phone.

---

### Task 4: Twilio Inbound SMS Edge Function

**Files:**
- Create: `supabase/functions/phone-agent-sms/index.ts`

- [ ] **Step 1: Implement Twilio webhook validation and linked-user resolution**

Create `supabase/functions/phone-agent-sms/index.ts`:

- Accept `POST` with `application/x-www-form-urlencoded`.
- Build a form-param object from the request body.
- Validate `X-Twilio-Signature` using `verifyTwilioSignature`.
- Pass `PHONE_AGENT_TWILIO_WEBHOOK_URL` as the signature URL. This must exactly match the public Twilio webhook URL, including scheme, host, path, and any query string. Do not reconstruct it from `req.url` in local tunnels or preview deploys.
- Resolve `From` against `kwilt_phone_agent_links.phone_e164`.
- Treat only links with `status = 'verified'` and `opted_out_at is null` as active for capture and follow-up commands.
- Return TwiML with `Content-Type: text/xml`.

Required Supabase secrets:

- `TWILIO_AUTH_TOKEN`
- `PHONE_AGENT_TWILIO_WEBHOOK_URL`

Unlinked number response:

```xml
<?xml version="1.0" encoding="UTF-8"?><Response><Message>Kwilt does not know this number yet. Open Kwilt -> Settings -> Phone Agent to link it.</Message></Response>
```

- [ ] **Step 2: Implement SMS compliance commands**

Handle compliance commands before capture:

- `help`: return `Kwilt Phone Agent saves messages into Kwilt and can send follow-ups you control in Settings. Reply STOP to opt out.`
- `stop`: if the phone is linked, set `status = 'opted_out'`, set `opted_out_at = now()`, disable outbound-facing permissions, and return `You are opted out of Kwilt Phone Agent texts. Reply START to re-enable.`
- `start`: if the phone is linked and opted out, set `status = 'verified'`, clear `opted_out_at`, leave outbound-facing permissions disabled until the user changes them in Settings, and return `Kwilt Phone Agent is re-enabled. Open Kwilt Settings to choose follow-up permissions.`
- For unlinked `help`, `stop`, or `start`, return a generic TwiML response without creating user data.
- Never create Activities, prompts, relationship records, or action logs for unlinked numbers.

- [ ] **Step 3: Implement capture path**

For non-command messages:

- Build `activityId = activity-phone-${MessageSid}`.
- Run `extractPhoneAgentFacts(Body)` and upsert any extracted people/aliases before writing related memory/event/cadence records.
- When upserting aliases, rely on `(user_id, alias_key)` for conflict handling so `Dad`, `dad`, and ` dad ` resolve to the same alias.
- For birthday-style captures, create a `kwilt_phone_agent_events` row and a `kwilt_phone_agent_memory_items` row for preferences like "likes dragons."
- For drift captures, create a `kwilt_phone_agent_cadences` row with `kind = 'drift'` and `interval_days` from the parsed message.
- Create a `kwilt_activities` row with `buildPhoneActivityData`.
- Insert a `kwilt_phone_agent_action_log` row with `action_type = 'capture_activity'`, linking any `person_id`, `memory_item_id`, `event_id`, or `cadence_id` that was created.
- If extracted facts include a birthday event, create pending birthday prompts using `buildBirthdayPromptSchedule` offsets of 10 days and 1 day before the next birthday occurrence.
- If the user has `send_followups = true`, create one pending follow-up prompt with a conservative default `due_at` of the next local morning at 9am for actionable captures that do not already have a more specific event/cadence schedule. If timezone is unknown, use `now() + interval '1 day'`.
- Return:

```text
Saved. I can remind you tomorrow morning. Reply `change time` if that is wrong.
```

If `send_followups` is false, return:

```text
Saved. You can manage Phone Agent follow-ups in Kwilt settings.
```

- [ ] **Step 4: Implement loop-closure replies**

For commands:

- `done`: close the most recent `sent` prompt for this phone link, update the linked Activity with `status = 'done'`, `completedAt = nowIso`, and merged `data.phoneAgent.doneReply = { channel: 'sms', twilioMessageSid: MessageSid, repliedAt: nowIso }`, then log `action_type = 'log_done_reply'`.
- `snooze 2d`: set the most recent `sent` prompt to `snoozed` and `due_at = now() + interval '2 days'`; log `action_type = 'snooze_followup'`.
- `pause`: set the most recent `sent` prompt to `paused`; log `action_type = 'pause_followup'`.
- `not relevant`: set the most recent `sent` prompt to `not_relevant`; log `action_type = 'not_relevant'`.
- If no sent prompt is found, reply:

```text
I do not have an open follow-up for this number. Text me what you want to save.
```

- [ ] **Step 5: Manual Twilio tunnel verification**

Run the Supabase function locally, expose it through a tunnel, and point Twilio's messaging webhook to:

```text
POST https://<tunnel-host>/functions/v1/phone-agent-sms
```

Set `PHONE_AGENT_TWILIO_WEBHOOK_URL` to exactly that full URL before testing signature validation.

Expected:

- Unlinked phone receives the link-in-settings message.
- Linked phone texting `HELP` receives the help text and creates no Activity.
- Linked phone texting `STOP` opts the link out and prevents future prompt sends.
- Linked phone texting `START` re-enables the link but keeps outbound permissions off until changed in Settings.
- Linked phone texting `Call Dad this weekend` creates one `kwilt_activities` row and one action log row.
- Linked phone texting `Lily's birthday is Oct 12. She likes dragons.` creates one `kwilt_phone_agent_people` row, one alias row, one event row, one memory item row, and one action log row. It may also create an Activity if the implementation treats the message as actionable.
- The Lily birthday capture creates follow-up prompts due 10 days and 1 day before the next Oct 12 occurrence, not one day after capture.
- Linked phone texting `Remind me if I haven't called Dad in 3 weeks.` creates or reuses a `Dad` person row and creates one drift cadence row.
- Replying `done` closes the latest prompt or returns the no-open-follow-up message.

---

### Task 5: Scheduled Prompt Sender

**Files:**
- Create: `supabase/functions/phone-agent-tick/index.ts`

- [ ] **Step 1: Implement due-prompt scan**

Create `phone-agent-tick`:

- Require a bearer token matching `PHONE_AGENT_CRON_SECRET`.
- Use service role client.
- Select up to 50 prompts where `state = 'pending'` and `due_at <= now()`.
- Join the linked phone number where the link still has `status = 'verified'`, `opted_out_at is null`, and `permissions->>'send_followups' = 'true'`.
- Cancel or skip prompts for opted-out/revoked links; never send them.
- Send each prompt body through Twilio SMS.
- Mark sent prompts with `state = 'sent'`, `sent_at`, and `last_twilio_message_sid`.
- Insert `kwilt_phone_agent_action_log` rows with `action_type = 'send_followup'`.

Response shape:

```json
{
  "ok": true,
  "sent": 3,
  "failed": 0
}
```

- [ ] **Step 2: Verify auth fails closed**

Run:

```bash
curl -X POST "$SUPABASE_FUNCTIONS_URL/phone-agent-tick"
```

Expected: `401` with `{"ok":false,"error":"unauthorized"}`.

- [ ] **Step 3: Verify due prompts send in local beta**

Seed one verified link and one prompt due in the past, then run:

```bash
curl -X POST "$SUPABASE_FUNCTIONS_URL/phone-agent-tick" \
  -H "Authorization: Bearer $PHONE_AGENT_CRON_SECRET"
```

Expected: response `sent` is `1`; prompt state changes to `sent`; the linked test phone receives the SMS.

Also seed one opted-out link with a due prompt. Expected: no SMS is sent to that phone and the prompt remains unsent or is marked cancelled according to the implementation's chosen skip policy.

---

### Task 6: App-Side Phone Agent Service

**Files:**
- Create: `src/services/phoneAgent.ts`
- Test: `src/services/phoneAgent.test.ts`

- [ ] **Step 1: Write failing tests for service request shapes**

Create `src/services/phoneAgent.test.ts` with fetch mocked:

```ts
import {
  buildPhoneAgentLinkRequest,
  normalizePhoneAgentLink,
  normalizePhoneAgentStatus,
} from './phoneAgent';

describe('phoneAgent service helpers', () => {
  test('builds request_code payload', () => {
    expect(buildPhoneAgentLinkRequest({ action: 'request_code', phone: '+1 415 555 1212' })).toEqual({
      action: 'request_code',
      phone: '+1 415 555 1212',
    });
  });

  test('normalizes link rows for Settings display', () => {
    expect(normalizePhoneAgentLink({
      phone: '+14155551212',
      status: 'verified',
      permissions: { create_activities: true },
      promptCapPerDay: 3,
      optedOutAt: null,
    })).toEqual({
      phone: '+14155551212',
      status: 'verified',
      permissions: { create_activities: true },
      promptCapPerDay: 3,
      optedOutAt: null,
    });
  });

  test('normalizes status metadata for Settings display', () => {
    expect(normalizePhoneAgentStatus({
      ok: true,
      links: [],
      memorySummary: { peopleCount: 2, activeEventsCount: 1, activeCadencesCount: 1 },
      recentActions: [{ id: 'log-1', actionType: 'capture_activity', createdAt: '2026-05-10T12:00:00.000Z', activityId: 'act-1', promptId: null }],
    })).toEqual({
      links: [],
      memorySummary: { peopleCount: 2, activeEventsCount: 1, activeCadencesCount: 1 },
      recentActions: [{ id: 'log-1', actionType: 'capture_activity', createdAt: '2026-05-10T12:00:00.000Z', activityId: 'act-1', promptId: null }],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/services/phoneAgent.test.ts --runInBand`

Expected: FAIL because `src/services/phoneAgent.ts` does not exist.

- [ ] **Step 3: Implement app-side service**

Create `src/services/phoneAgent.ts`:

- Use `getEdgeFunctionUrlCandidates('phone-agent-link')`.
- Use the active Supabase session to set `Authorization`.
- Export `requestPhoneAgentCode`, `verifyPhoneAgentCode`, `updatePhoneAgentSettings`, `revokePhoneAgentLink`, and `getPhoneAgentStatus`.
- Export pure `buildPhoneAgentLinkRequest`, `normalizePhoneAgentLink`, and `normalizePhoneAgentStatus` for tests.
- Preserve `memorySummary` and sanitized `recentActions` from the Edge Function response for the Settings canvas.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/services/phoneAgent.test.ts --runInBand`

Expected: PASS.

---

### Task 7: Settings -> Phone Agent App Canvas

**Files:**
- Create: `src/features/account/PhoneAgentSettingsScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/features/account/SettingsHomeScreen.tsx`

- [ ] **Step 1: Add navigation route**

In `src/navigation/RootNavigator.tsx`:

```ts
export type SettingsStackParamList = {
  SettingsHome: undefined;
  SettingsAppearance: undefined;
  SettingsProfile: undefined;
  SettingsAiModel: undefined;
  SettingsNotifications: undefined;
  SettingsPhoneAgent: undefined;
  // existing routes...
};
```

Add a screen in `SettingsStackNavigator`:

```tsx
<SettingsStack.Screen
  name="SettingsPhoneAgent"
  component={PhoneAgentSettingsScreen}
/>
```

- [ ] **Step 2: Add Settings home row**

In `src/features/account/SettingsHomeScreen.tsx`, add a personalization/integrations item:

```ts
{
  id: 'phone_agent',
  title: 'Phone Agent',
  description: 'Text Kwilt to capture, follow up, and close loops.',
  icon: 'activities',
  route: 'SettingsPhoneAgent',
  status: 'new',
  tags: ['phone', 'sms', 'follow-through'],
}
```

- [ ] **Step 3: Build the screen inside the normal app canvas**

Create `src/features/account/PhoneAgentSettingsScreen.tsx` using `AppShell`, `PageHeader`, and existing primitives. The screen must include:

- Linked phone status.
- Internal relationship memory summary: count of remembered people, active events, and active cadences. Do not add a People list/detail surface in this beta.
- Request code input.
- Verification code input.
- Permission toggles for Activity creation, follow-ups, `done` replies, drafts, and Arc suggestions.
- Prompt cap display/edit.
- Pause all / revoke link action.
- Recent action log list.

Copy rules:

- Use "Phone Agent" in app UI for clarity.
- Use "Text Kwilt" in explanatory copy.
- Avoid "assistant cares", "crush", "optimize", and guilt language.

- [ ] **Step 4: Manual app verification**

Run: `npm run lint`

Expected: TypeScript passes.

Run on device/simulator after Edge Functions are served:

- Open Settings -> Phone Agent.
- Request a code for a test phone.
- Verify the code.
- Toggle follow-up permission.
- Revoke the link.

---

### Task 8: Analytics, Docs, and Final Verification

**Files:**
- Modify: `docs/feature-briefs/kwilt-phone-agent.md`
- Modify: `docs/latest-build-test-checklist.md`
- Modify analytics event definitions if a central enum exists for the chosen events.

- [ ] **Step 1: Add beta events**

Add events where the current analytics layer expects them:

- `PhoneAgentLinkCodeRequested`
- `PhoneAgentLinked`
- `PhoneAgentSmsCaptured`
- `PhoneAgentPersonRemembered`
- `PhoneAgentMemorySaved`
- `PhoneAgentEventSaved`
- `PhoneAgentCadenceSaved`
- `PhoneAgentFollowupSent`
- `PhoneAgentLoopClosed`
- `PhoneAgentPromptSnoozed`
- `PhoneAgentPromptPaused`
- `PhoneAgentRevoked`

Each event should include only safe metadata: channel, action type, prompt kind, extracted object kind, and booleans. Do not send phone numbers, person names, message bodies, memory text, verification codes, or raw Twilio payloads.

- [ ] **Step 2: Update docs with final beta contract**

Update `docs/feature-briefs/kwilt-phone-agent.md` if the implementation changed any of these:

- Function names.
- Table names.
- Permission names.
- Beta stack details.
- Success metrics.

Add a short test entry to `docs/latest-build-test-checklist.md`:

```md
### Phone Agent SMS beta

- Link a test phone in Settings -> Phone Agent.
- Text "Call Dad this weekend" to the Kwilt number.
- Expected: Activity appears with phone-agent source metadata and a calm SMS receipt.
- Text "Lily's birthday is Oct 12. She likes dragons."
- Expected: internal person/event/memory rows are created, no People/CRM app surface appears, and analytics does not include Lily's name or the memory text.
- Send a due follow-up with `phone-agent-tick`.
- Reply `done`.
- Expected: prompt closes, action log records loop closure, and no private message body appears in analytics.
```

- [ ] **Step 3: Run verification commands**

Run:

```bash
npm run product:lint
npm run lint
npm test -- supabase/functions/_shared/__tests__/phoneAgent.test.ts src/services/phoneAgent.test.ts --runInBand
npm test -- --runInBand --testPathIgnorePatterns "/.worktrees/" --modulePathIgnorePatterns "/.worktrees/"
deno check --no-lock --config "supabase/functions/tsconfig.json" "supabase/functions/_shared/phoneAgent.ts" "supabase/functions/phone-agent-link/index.ts" "supabase/functions/phone-agent-sms/index.ts" "supabase/functions/phone-agent-tick/index.ts"
```

Expected:

- Product lint: 0 errors.
- TypeScript: passes.
- Targeted tests: pass.
- Full Jest excluding `.worktrees`: pass. The `.worktrees` ignore is required in this checkout because the existing `.worktrees/mcp-connector` directory causes duplicate Haste package discovery.
- Deno check: new Edge Functions typecheck.

---

## Implementation Order

1. Task 1: shared helpers and tests.
2. Task 2: schema.
3. Task 3: phone linking.
4. Task 4: inbound SMS.
5. Task 5: due prompt sender.
6. Task 6: app service.
7. Task 7: app Settings canvas.
8. Task 8: analytics, docs, and verification.

This order keeps TDD-required pure logic first, then backend tables/functions, then app UI. It also lets a backend-only beta work before the Settings screen is polished.

## Self-Review

- Spec coverage: Covers phone linking, SMS capture, internal People/Memory/Event/Cadence primitives, Activity creation, follow-up scheduling, loop closure, app-canvas governance, Twilio-first stack, audit logs, and success-verification hooks from `docs/feature-briefs/kwilt-phone-agent.md`.
- Placeholder scan: No unfinished-marker text, deferred-implementation language, or open-ended "add appropriate" steps.
- Type consistency: Uses `Phone Agent`, `kwilt_phone_agent_links`, `kwilt_phone_agent_people`, `kwilt_phone_agent_memory_items`, `kwilt_phone_agent_events`, `kwilt_phone_agent_cadences`, `kwilt_phone_agent_prompts`, `kwilt_phone_agent_action_log`, `phone-agent-link`, `phone-agent-sms`, and `phone-agent-tick` consistently.
