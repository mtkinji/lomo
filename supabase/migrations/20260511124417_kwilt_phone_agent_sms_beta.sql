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
create unique index if not exists kwilt_phone_agent_action_log_twilio_sid_idx
  on public.kwilt_phone_agent_action_log(twilio_message_sid)
  where twilio_message_sid is not null;

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
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.kwilt_phone_agent_people people
      where people.id = public.kwilt_phone_agent_person_aliases.person_id
        and people.user_id = auth.uid()
    )
  );

drop policy if exists "kwilt_phone_agent_memory_items_owner_only" on public.kwilt_phone_agent_memory_items;
create policy "kwilt_phone_agent_memory_items_owner_only"
  on public.kwilt_phone_agent_memory_items
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      person_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_people people
        where people.id = public.kwilt_phone_agent_memory_items.person_id
          and people.user_id = auth.uid()
      )
    )
  );

drop policy if exists "kwilt_phone_agent_events_owner_only" on public.kwilt_phone_agent_events;
create policy "kwilt_phone_agent_events_owner_only"
  on public.kwilt_phone_agent_events
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      person_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_people people
        where people.id = public.kwilt_phone_agent_events.person_id
          and people.user_id = auth.uid()
      )
    )
  );

drop policy if exists "kwilt_phone_agent_cadences_owner_only" on public.kwilt_phone_agent_cadences;
create policy "kwilt_phone_agent_cadences_owner_only"
  on public.kwilt_phone_agent_cadences
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      person_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_people people
        where people.id = public.kwilt_phone_agent_cadences.person_id
          and people.user_id = auth.uid()
      )
    )
  );

drop policy if exists "kwilt_phone_agent_prompts_owner_only" on public.kwilt_phone_agent_prompts;
create policy "kwilt_phone_agent_prompts_owner_only"
  on public.kwilt_phone_agent_prompts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.kwilt_phone_agent_links links
      where links.id = public.kwilt_phone_agent_prompts.phone_link_id
        and links.user_id = auth.uid()
    )
    and (
      person_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_people people
        where people.id = public.kwilt_phone_agent_prompts.person_id
          and people.user_id = auth.uid()
      )
    )
    and (
      memory_item_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_memory_items memory
        where memory.id = public.kwilt_phone_agent_prompts.memory_item_id
          and memory.user_id = auth.uid()
      )
    )
    and (
      event_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_events events
        where events.id = public.kwilt_phone_agent_prompts.event_id
          and events.user_id = auth.uid()
      )
    )
    and (
      cadence_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_cadences cadences
        where cadences.id = public.kwilt_phone_agent_prompts.cadence_id
          and cadences.user_id = auth.uid()
      )
    )
  );

drop policy if exists "kwilt_phone_agent_action_log_owner_only" on public.kwilt_phone_agent_action_log;
create policy "kwilt_phone_agent_action_log_owner_only"
  on public.kwilt_phone_agent_action_log
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      phone_link_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_links links
        where links.id = public.kwilt_phone_agent_action_log.phone_link_id
          and links.user_id = auth.uid()
      )
    )
    and (
      person_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_people people
        where people.id = public.kwilt_phone_agent_action_log.person_id
          and people.user_id = auth.uid()
      )
    )
    and (
      memory_item_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_memory_items memory
        where memory.id = public.kwilt_phone_agent_action_log.memory_item_id
          and memory.user_id = auth.uid()
      )
    )
    and (
      event_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_events events
        where events.id = public.kwilt_phone_agent_action_log.event_id
          and events.user_id = auth.uid()
      )
    )
    and (
      cadence_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_cadences cadences
        where cadences.id = public.kwilt_phone_agent_action_log.cadence_id
          and cadences.user_id = auth.uid()
      )
    )
    and (
      prompt_id is null
      or exists (
        select 1
        from public.kwilt_phone_agent_prompts prompts
        where prompts.id = public.kwilt_phone_agent_action_log.prompt_id
          and prompts.user_id = auth.uid()
      )
    )
  );
