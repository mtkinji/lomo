-- Push notification support for MCP-created items
-- Enables digest notifications when activities/goals are created via external MCP clients

-- Store Expo push tokens per user
create table if not exists public.kwilt_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text, -- 'ios' | 'android'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(user_id, token)
);

alter table public.kwilt_push_tokens enable row level security;

-- Users can only see/manage their own tokens
create policy "kwilt_push_tokens_owner_only"
  on public.kwilt_push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for quick lookup by user
create index if not exists kwilt_push_tokens_user_id_idx
  on public.kwilt_push_tokens(user_id);

-- Track pending MCP notifications (for batching/digest)
create table if not exists public.kwilt_mcp_notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null, -- 'activity' | 'goal'
  item_id text not null,
  item_title text,
  created_at timestamptz not null default now()
);

alter table public.kwilt_mcp_notification_queue enable row level security;

-- Service role only (MCP server writes, no direct user access)
create policy "kwilt_mcp_notification_queue_service_only"
  on public.kwilt_mcp_notification_queue
  for all
  using (false)
  with check (false);

-- Index for efficient queue processing
create index if not exists kwilt_mcp_notification_queue_user_created_idx
  on public.kwilt_mcp_notification_queue(user_id, created_at);

-- Track last notification sent per user (for throttling)
create table if not exists public.kwilt_mcp_notification_log (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_sent_at timestamptz not null default now(),
  last_count int not null default 0
);

alter table public.kwilt_mcp_notification_log enable row level security;

-- Service role only
create policy "kwilt_mcp_notification_log_service_only"
  on public.kwilt_mcp_notification_log
  for all
  using (false)
  with check (false);




