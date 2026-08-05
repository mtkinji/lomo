# Shared Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a gated Shared Home that durably receives targeted Goal invitations and remote Pass the Pattern handoffs, opens the exact owning capability, and remains separate from Unified Chat.

**Architecture:** Add a server-owned `kwilt_shared_deliveries` projection with recipient-only RLS, then let Goal and Games server paths emit and settle typed deliveries through shared Deno helpers. The React Native client reads a user-scoped stale-while-refresh snapshot, renders `Needs you` and `Recent`, and exposes Home beside Ask in the capability-menu footer. Push data carries only a delivery id and routes to the same Home record.

**Tech Stack:** Expo SDK 55, React Native 0.83, React Navigation 7, Zustand auth identity, AsyncStorage, Supabase Postgres/RLS/Realtime, Supabase Edge Functions with Deno, Expo Notifications, Jest/RNTL, PostHog feature flags and analytics.

---

## Scope and file map

Create:

- `supabase/migrations/20260805230000_shared_home_deliveries.sql` — additive table, indexes, RLS, invite lifecycle triggers, and Realtime registration.
- `supabase/tests/shared_home_deliveries.sql` — executable recipient/wrong-recipient/client-write RLS checks.
- `supabase/functions/_shared/sharedHomeDelivery.ts` — typed builders, allowlist policy, idempotent insert, and source settlement.
- `supabase/functions/_shared/expoPush.ts` — Expo message creation, send results, and invalid-token retirement.
- `supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts` — deterministic builder, eligibility, idempotency-shape, and push-copy tests.
- `src/features/shared-home/sharedHomeTypes.ts` — client row and destination contract.
- `src/features/shared-home/sharedHomePresentation.ts` — validation, effective lifecycle, grouping, and card copy.
- `src/features/shared-home/sharedHomePresentation.test.ts` — pure presentation tests.
- `src/features/shared-home/sharedHomeCache.ts` — user-keyed AsyncStorage snapshot.
- `src/features/shared-home/sharedHomeCache.test.ts` — account-isolation and malformed-cache tests.
- `src/features/shared-home/sharedHomeRepository.ts` — Supabase select and recipient Realtime invalidation.
- `src/features/shared-home/sharedHomeRepository.test.ts` — query and subscription contract tests.
- `src/features/shared-home/sharedHomeNavigation.ts` — typed capability destination resolver.
- `src/features/shared-home/sharedHomeNavigation.test.ts` — Goal/Game/unavailable routing tests.
- `src/features/shared-home/SharedHomeScreen.tsx` — finite Home surface.
- `src/features/shared-home/SharedHomeScreen.test.tsx` — loading, stale, empty, grouping, highlighted item, and action tests.

Modify:

- `supabase/functions/invite-create/index.ts` — emit a targeted Goal delivery after the existing recipient-bound RPC succeeds.
- `supabase/functions/remote-pass-pattern-command/index.ts` — settle the previous turn and emit the next permanent-account handoff after a nonduplicate `next_player` commit.
- `src/navigation/RootNavigator.tsx` — register `SharedHome`, gate the footer entry, and preserve contextual Ask behavior.
- `src/navigation/CapabilityMenu.tsx` — render the gated `Home | Ask` split control.
- `src/navigation/CapabilityMenu.test.tsx` — prove flagged and fallback footer behavior.
- `src/navigation/linkingConfig.ts` and `src/navigation/linkingConfig.test.ts` — add `kwilt://home/:deliveryId?`.
- `src/services/NotificationService.ts` and `src/services/NotificationService.test.ts` — recognize `sharedDelivery` push data and open the exact Home item.
- `src/services/analytics/events.ts` — add safe Shared Home lifecycle event names.
- `src/features/shared-home/FEATURE.md` — replace planned-surface wording with current ownership after implementation.
- `docs/feature-briefs/shared-home.md` — record proof without widening the accepted scope.
- `docs/job-flows/maya-move-family-life-forward.md` — update delivery evidence only after real device proof justifies it.

Leave unchanged:

- `src/features/home/TodayScreen.tsx` and `src/features/home/FEATURE.md`.
- `kwilt_feed_events` access semantics and Goal-detail feed rendering.
- Existing Chat thread/message schema.
- Generic Game invitation links and Bank roll behavior.

## Pragmatic TDD posture

Tests must be written first for the migration contract, RLS, delivery builders,
allowlist, idempotency, push message construction, Goal/Game emission decisions,
row validation, grouping, caching, repository queries, routing, notification
handling, and feature-flag branching. `SharedHomeScreen` layout and styling may be
implemented directly, but its user-visible states and actions still receive
component coverage.

---

### Task 1: Add the recipient-owned delivery schema

**Files:**

- Create: `supabase/migrations/20260805230000_shared_home_deliveries.sql`
- Create: `supabase/tests/shared_home_deliveries.sql`
- Create: `src/features/shared-home/sharedHomeMigration.test.ts`

- [ ] **Step 1: Write the migration contract test**

Create `sharedHomeMigration.test.ts` with exact structural assertions:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260805230000_shared_home_deliveries.sql'), 'utf8').toLowerCase();

describe('Shared Home delivery migration', () => {
  it('creates a recipient projection instead of widening kwilt_feed_events', () => {
    expect(sql).toContain('create table public.kwilt_shared_deliveries');
    expect(sql).toContain('recipient_user_id uuid not null');
    expect(sql).toContain('unique (idempotency_key)');
    expect(sql).not.toContain('alter table public.kwilt_feed_events');
  });

  it('permits recipient reads and no authenticated writes', () => {
    expect(sql).toContain('recipient_user_id = auth.uid()');
    expect(sql).toContain('revoke insert, update, delete on public.kwilt_shared_deliveries from authenticated');
  });

  it('settles targeted invitations from source lifecycle truth', () => {
    expect(sql).toContain('create function public.sync_goal_invite_shared_delivery()');
    expect(sql).toContain("new.recipient_state in ('accepted', 'declined', 'revoked')");
  });
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```bash
npx jest src/features/shared-home/sharedHomeMigration.test.ts --runInBand
```

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Create the additive migration**

Use this closed contract in `20260805230000_shared_home_deliveries.sql`:

```sql
create table public.kwilt_shared_deliveries (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_kind text not null check (event_kind in ('goal_invitation', 'game_turn')),
  source_capability text not null check (source_capability in ('goals', 'games')),
  source_entity_type text not null check (source_entity_type in ('goal_invite', 'game_session')),
  source_entity_id text not null,
  actor_display_name text,
  title text not null,
  body text not null,
  destination jsonb not null check (jsonb_typeof(destination) = 'object'),
  state text not null default 'pending' check (state in ('pending', 'settled', 'expired', 'unavailable')),
  settled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  expires_at timestamptz,
  retain_until timestamptz not null default (now() + interval '30 days'),
  constraint kwilt_shared_deliveries_idempotency unique (idempotency_key)
);

create index kwilt_shared_deliveries_recipient_state_created_idx
  on public.kwilt_shared_deliveries(recipient_user_id, state, created_at desc);
create index kwilt_shared_deliveries_source_idx
  on public.kwilt_shared_deliveries(source_capability, source_entity_type, source_entity_id);
create index kwilt_shared_deliveries_retention_idx
  on public.kwilt_shared_deliveries(retain_until);

alter table public.kwilt_shared_deliveries enable row level security;
create policy "Recipients read own shared deliveries"
  on public.kwilt_shared_deliveries for select to authenticated
  using (recipient_user_id = auth.uid());
grant select on public.kwilt_shared_deliveries to authenticated;
revoke insert, update, delete on public.kwilt_shared_deliveries from authenticated;

create function public.sync_goal_invite_shared_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.kwilt_shared_deliveries
       set state = 'unavailable', settled_reason = 'source_deleted', settled_at = now(), updated_at = now(),
           actor_display_name = null, title = 'Invitation unavailable', body = 'This invitation is no longer available.'
     where event_kind = 'goal_invitation' and source_entity_id = old.id::text and state = 'pending';
    return old;
  end if;
  if new.recipient_state in ('accepted', 'declined', 'revoked') then
    update public.kwilt_shared_deliveries
       set state = 'settled', settled_reason = new.recipient_state, settled_at = now(), updated_at = now()
     where event_kind = 'goal_invitation' and source_entity_id = new.id::text and state = 'pending';
  end if;
  return new;
end;
$$;

create trigger sync_goal_invite_shared_delivery_update
after update of recipient_state on public.kwilt_invites
for each row execute function public.sync_goal_invite_shared_delivery();
create trigger sync_goal_invite_shared_delivery_delete
after delete on public.kwilt_invites
for each row execute function public.sync_goal_invite_shared_delivery();
```

Also register the table with `supabase_realtime` inside a guarded `do $$` block that checks `pg_publication_tables` before adding it.

- [ ] **Step 4: Add executable RLS tests**

In `supabase/tests/shared_home_deliveries.sql`, use the rollback-only claim
switching pattern from `unified_chat_trust_contract.sql`. The file should seed
two fixed users as the administrative connection, insert one delivery, then run
these six explicit checks under `role authenticated`: recipient read succeeds;
wrong-recipient read is empty; actor-only read is empty; insert is denied;
update is denied; delete is denied.

Use these exact fixed fixtures and denial blocks:

```sql
begin;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'shared-home-a@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'shared-home-b@example.invalid', '', now(), now());
insert into public.kwilt_shared_deliveries (
  id, idempotency_key, recipient_user_id, actor_user_id, event_kind,
  source_capability, source_entity_type, source_entity_id, title, body, destination
) values (
  '20000000-0000-0000-0000-000000000001', 'shared-home-rls',
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
  'goal_invitation', 'goals', 'goal_invite', 'invite-1',
  'Goal invitation', 'Someone invited you to support a Goal.',
  '{"kind":"goal_invite","inviteCode":"CODE1"}'::jsonb
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  if (select count(*) from public.kwilt_shared_deliveries) <> 1 then raise exception 'recipient read failed'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  if exists (select 1 from public.kwilt_shared_deliveries) then raise exception 'wrong-recipient or actor read succeeded'; end if;
  begin
    insert into public.kwilt_shared_deliveries (idempotency_key, recipient_user_id, event_kind, source_capability, source_entity_type, source_entity_id, title, body, destination)
    values ('forged', '10000000-0000-0000-0000-000000000002', 'goal_invitation', 'goals', 'goal_invite', 'invite-2', 'Forged', 'Forged', '{}'::jsonb);
    raise exception 'authenticated insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.kwilt_shared_deliveries set recipient_user_id = '10000000-0000-0000-0000-000000000002';
    raise exception 'authenticated update succeeded';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.kwilt_shared_deliveries;
    raise exception 'authenticated delete succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
```

- [ ] **Step 5: Run schema tests**

Run:

```bash
npx jest src/features/shared-home/sharedHomeMigration.test.ts --runInBand
supabase test db
```

Expected: Jest PASS; pgTAP PASS with six assertions when the local Supabase stack is available. If the local stack is unavailable, record that exact blocker and run the migration against an isolated branch database before production.

- [ ] **Step 6: Commit only schema files**

```bash
git add supabase/migrations/20260805230000_shared_home_deliveries.sql supabase/tests/shared_home_deliveries.sql src/features/shared-home/sharedHomeMigration.test.ts
git commit -m "feat: add recipient-scoped shared deliveries"
```

---

### Task 2: Build tested server delivery and Expo push helpers

**Files:**

- Create: `supabase/functions/_shared/sharedHomeDelivery.ts`
- Create: `supabase/functions/_shared/expoPush.ts`
- Create: `supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts`

- [ ] **Step 1: Write failing policy and builder tests**

Cover these exact cases:

```ts
Deno.test('allowlist accepts only an exact permanent recipient id', () => {
  assertEquals(sharedHomeRecipientEnabled('user-2', 'user-1,user-2'), true);
  assertEquals(sharedHomeRecipientEnabled('user-20', 'user-1,user-2'), false);
  assertEquals(sharedHomeRecipientEnabled('user-2', ''), false);
});

Deno.test('goal invitation destination contains only the invite code', () => {
  assertEquals(buildGoalInvitationDelivery({
    inviteId: 'invite-1', inviteCode: 'CODE1', recipientUserId: 'user-2', actorUserId: 'user-1',
    actorDisplayName: 'David', goalTitle: 'Run together', expiresAt: '2026-08-19T00:00:00.000Z',
  }).destination, { kind: 'goal_invite', inviteCode: 'CODE1' });
});

Deno.test('game handoff is emitted only for a changed permanent-account player', () => {
  assertEquals(shouldEmitGameTurn({ duplicate: false, actionType: 'next_player', previousPlayerIndex: 0, nextPlayerIndex: 1, recipientIsAnonymous: false }), true);
  assertEquals(shouldEmitGameTurn({ duplicate: false, actionType: 'submit_beat', previousPlayerIndex: 0, nextPlayerIndex: 0, recipientIsAnonymous: false }), false);
  assertEquals(shouldEmitGameTurn({ duplicate: false, actionType: 'next_player', previousPlayerIndex: 0, nextPlayerIndex: 1, recipientIsAnonymous: true }), false);
});

Deno.test('push body never contains the private experience title', () => {
  const messages = buildExpoPushMessages(['ExponentPushToken[token]'], 'delivery-1');
  assertEquals(messages[0].body, 'Something shared in Kwilt is ready for you.');
  assertEquals(messages[0].data, { type: 'sharedDelivery', deliveryId: 'delivery-1' });
});
```

- [ ] **Step 2: Run the Deno test and verify it fails**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
```

Expected: FAIL because the helper modules do not exist.

- [ ] **Step 3: Implement the pure contract**

In `sharedHomeDelivery.ts`, export closed types and pure builders:

```ts
export type SharedDeliveryInsert = {
  idempotency_key: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  event_kind: 'goal_invitation' | 'game_turn';
  source_capability: 'goals' | 'games';
  source_entity_type: 'goal_invite' | 'game_session';
  source_entity_id: string;
  actor_display_name: string | null;
  title: string;
  body: string;
  destination: { kind: 'goal_invite'; inviteCode: string } | { kind: 'game_room'; sessionId: string };
  state: 'pending';
  expires_at: string | null;
  retain_until: string;
};

export function sharedHomeRecipientEnabled(recipientId: string, rawAllowlist = Deno.env.get('SHARED_HOME_RECIPIENT_IDS') ?? '') {
  return new Set(rawAllowlist.split(',').map((value) => value.trim()).filter(Boolean)).has(recipientId.trim());
}
```

Make `buildGoalInvitationDelivery`, `buildGameTurnDelivery`, and `shouldEmitGameTurn` return complete deterministic values. Bound display names to 80 characters and titles/bodies to 180 characters. Use source ids and committed state versions in idempotency keys.

- [ ] **Step 4: Implement idempotent persistence**

Add helpers receiving a Supabase-like admin client so they remain unit-testable:

```ts
export async function insertSharedDelivery(admin: any, row: SharedDeliveryInsert) {
  const inserted = await admin.from('kwilt_shared_deliveries').insert(row).select('id').maybeSingle();
  if (!inserted.error && inserted.data?.id) return { id: inserted.data.id as string, created: true };
  if (inserted.error?.code !== '23505') throw inserted.error;
  const existing = await admin.from('kwilt_shared_deliveries').select('id').eq('idempotency_key', row.idempotency_key).single();
  if (existing.error || !existing.data?.id) throw existing.error ?? new Error('shared_delivery_missing_after_conflict');
  return { id: existing.data.id as string, created: false };
}

export async function settlePendingSourceDeliveries(admin: any, sourceCapability: 'goals' | 'games', sourceEntityId: string, reason: string) {
  const result = await admin.from('kwilt_shared_deliveries').update({ state: 'settled', settled_reason: reason, settled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('source_capability', sourceCapability).eq('source_entity_id', sourceEntityId).eq('state', 'pending');
  if (result.error) throw result.error;
}
```

- [ ] **Step 5: Implement generic Expo push delivery**

In `expoPush.ts`, select `kwilt_push_tokens` for the recipient, POST batches to `https://exp.host/--/api/v2/push/send`, and return `{ attempted, accepted, rejected }`. Delete a token only when its ticket explicitly reports `DeviceNotRegistered`. A network failure returns a failed result but does not change the durable delivery.

- [ ] **Step 6: Run tests and commit**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/sharedHomeDelivery.ts supabase/functions/_shared/expoPush.ts
git add supabase/functions/_shared/sharedHomeDelivery.ts supabase/functions/_shared/expoPush.ts supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
git commit -m "feat: add shared delivery server helpers"
```

Expected: PASS.

---

### Task 3: Emit and settle targeted Goal invitation deliveries

**Files:**

- Modify: `supabase/functions/invite-create/index.ts`
- Modify: `supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts`

- [ ] **Step 1: Add a failing Goal adapter test**

Add a test showing that a reused invite produces the same idempotency key and that an allowlist miss returns no delivery candidate. Test the pure `buildGoalInvitationDelivery` plus `sharedHomeRecipientEnabled`; do not start the Edge runtime in the unit test.

- [ ] **Step 2: Run the test and confirm the new assertion fails**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
```

- [ ] **Step 3: Integrate after the existing targeted invite RPC**

In the `body.recipient != null` branch, after validating `inviteCode`:

```ts
const { data: inviteRow } = await admin.from('kwilt_invites')
  .select('id, intended_recipient_user_id, created_by, expires_at, payload')
  .eq('code', inviteCode).maybeSingle();

if (inviteRow?.intended_recipient_user_id && sharedHomeRecipientEnabled(inviteRow.intended_recipient_user_id)) {
  const delivery = buildGoalInvitationDelivery({
    inviteId: inviteRow.id,
    inviteCode,
    recipientUserId: inviteRow.intended_recipient_user_id,
    actorUserId: userId,
    actorDisplayName: userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name ?? null,
    goalTitle: typeof inviteRow.payload?.goalTitle === 'string' ? inviteRow.payload.goalTitle : null,
    expiresAt: inviteRow.expires_at,
  });
  const saved = await insertSharedDelivery(admin, delivery);
  if (saved.created) await sendSharedDeliveryPush(admin, inviteRow.intended_recipient_user_id, saved.id);
}
```

Push failure must be logged with delivery id and outcome class only; it must not fail invitation creation or log presentation fields.

- [ ] **Step 4: Verify trigger semantics**

Extend `supabase/tests/shared_home_deliveries.sql` to update a seeded `kwilt_invites.recipient_state` through accepted, declined, and revoked fixtures and assert that the matching delivery becomes settled with the correct reason. Delete a seeded invite and assert sensitive presentation is replaced by the generic unavailable copy.

- [ ] **Step 5: Run focused checks and commit**

```bash
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/invite-create/index.ts
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
supabase test db
git add supabase/functions/invite-create/index.ts supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts supabase/tests/shared_home_deliveries.sql
git commit -m "feat: deliver targeted goal invitations to Home"
```

---

### Task 4: Emit meaningful Pass the Pattern handoffs

**Files:**

- Modify: `supabase/functions/remote-pass-pattern-command/index.ts`
- Modify: `supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts`

- [ ] **Step 1: Write failing handoff-decision tests**

Add cases proving no delivery for `ready`, `replay_watch`, `finish_watch`, individual `submit_beat`, duplicate `next_player`, an unchanged player, or an anonymous recipient. Add a positive case only for a committed nonduplicate `next_player` with a changed permanent-account player.

- [ ] **Step 2: Run and observe the failure**

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
```

- [ ] **Step 3: Resolve the next recipient after commit**

After `commit_remote_bank_command` returns, skip emission when `result.duplicate` is true. For a real `next_player` transition:

```ts
await settlePendingSourceDeliveries(admin, 'games', body.sessionId, 'turn_advanced');
const { data: nextParticipant } = await admin.from('game_participants')
  .select('controller_user_id, display_name_snapshot')
  .eq('session_id', body.sessionId)
  .eq('seat_index', nextState.playerIndex)
  .maybeSingle();
const recipient = nextParticipant?.controller_user_id
  ? await admin.auth.admin.getUserById(nextParticipant.controller_user_id)
  : null;
const recipientIsAnonymous = recipient?.data?.user?.is_anonymous !== false;
```

Only when the explicit `shouldEmitGameTurn` decision and the exact-recipient
`sharedHomeRecipientEnabled` allowlist check both return true should the function
insert the complete `buildGameTurnDelivery` result and attempt push. Idempotency
is `game_turn:<sessionId>:<committedStateVersion>:<recipientUserId>`.

- [ ] **Step 4: Keep live Bank out of Home**

Do not modify `remote-bank-command/index.ts`. Add this assertion to the migration/contract test so a future broad search-and-replace is caught:

```ts
expect(readFileSync(resolve(process.cwd(), 'supabase/functions/remote-bank-command/index.ts'), 'utf8'))
  .not.toContain('buildGameTurnDelivery');
```

- [ ] **Step 5: Run checks and commit**

```bash
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/remote-pass-pattern-command/index.ts
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
npx jest src/features/shared-home/sharedHomeMigration.test.ts --runInBand
git add supabase/functions/remote-pass-pattern-command/index.ts supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts src/features/shared-home/sharedHomeMigration.test.ts
git commit -m "feat: deliver pass pattern handoffs to Home"
```

---

### Task 5: Add the client delivery model, cache, and repository

**Files:**

- Create: `src/features/shared-home/sharedHomeTypes.ts`
- Create: `src/features/shared-home/sharedHomePresentation.ts`
- Create: `src/features/shared-home/sharedHomePresentation.test.ts`
- Create: `src/features/shared-home/sharedHomeCache.ts`
- Create: `src/features/shared-home/sharedHomeCache.test.ts`
- Create: `src/features/shared-home/sharedHomeRepository.ts`
- Create: `src/features/shared-home/sharedHomeRepository.test.ts`

- [ ] **Step 1: Write failing presentation tests**

Test valid Goal/Game rows, rejection of unknown event/destination kinds, expiry derived from `expires_at`, unavailable redaction, pending/recent grouping, and newest-first ordering. Use fixed ISO dates and inject `now` into pure functions.

- [ ] **Step 2: Define the closed client types**

```ts
export type SharedHomeDestination =
  | { kind: 'goal_invite'; inviteCode: string }
  | { kind: 'game_room'; sessionId: string };

export type SharedHomeDelivery = {
  id: string;
  eventKind: 'goal_invitation' | 'game_turn';
  sourceCapability: 'goals' | 'games';
  actorDisplayName: string | null;
  title: string;
  body: string;
  destination: SharedHomeDestination;
  state: 'pending' | 'settled' | 'expired' | 'unavailable';
  settledReason: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  retainUntil: string;
};
```

Implement `parseSharedHomeRow`, `effectiveSharedHomeState`, and `groupSharedHomeDeliveries` without accepting arbitrary route names.

- [ ] **Step 3: Run presentation tests**

```bash
npx jest src/features/shared-home/sharedHomePresentation.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 4: Write and implement user-scoped cache tests**

Follow `moneySnapshotCache.ts`: use `kwilt:shared-home:snapshot:v1:<encoded-user-id>`, schema version 1, and validate every row on load. Prove user A never loads user B's key, malformed JSON returns null, invalid rows are rejected, and `remove(userId)` removes only that account.

- [ ] **Step 5: Write and implement repository tests**

The repository must:

```ts
export type SharedHomeRepository = {
  list: (limit?: number) => Promise<SharedHomeDelivery[]>;
  subscribe: (onInvalidate: () => void) => () => void;
};
```

`list(50)` selects only the documented columns, applies `.gt('retain_until', nowIso)`, orders by `created_at` descending, and relies on RLS rather than accepting a recipient id. `subscribe` listens to `postgres_changes` on `public.kwilt_shared_deliveries`; the callback only invalidates and a fresh RLS query supplies truth.

- [ ] **Step 6: Run focused tests and commit**

```bash
npx jest src/features/shared-home/sharedHomePresentation.test.ts src/features/shared-home/sharedHomeCache.test.ts src/features/shared-home/sharedHomeRepository.test.ts --runInBand
git add src/features/shared-home/sharedHomeTypes.ts src/features/shared-home/sharedHomePresentation.ts src/features/shared-home/sharedHomePresentation.test.ts src/features/shared-home/sharedHomeCache.ts src/features/shared-home/sharedHomeCache.test.ts src/features/shared-home/sharedHomeRepository.ts src/features/shared-home/sharedHomeRepository.test.ts
git commit -m "feat: add Shared Home client data layer"
```

---

### Task 6: Resolve capability-owned destinations

**Files:**

- Create: `src/features/shared-home/sharedHomeNavigation.ts`
- Create: `src/features/shared-home/sharedHomeNavigation.test.ts`

- [ ] **Step 1: Write failing resolver tests**

Assert exact outputs:

```ts
expect(resolveSharedHomeDestination({ kind: 'goal_invite', inviteCode: 'A1' })).toEqual({
  name: 'MainTabs', params: { screen: 'GoalsTab', params: { screen: 'JoinSharedGoal', params: { inviteCode: 'A1' } } },
});
expect(resolveSharedHomeDestination({ kind: 'game_room', sessionId: 'room-1' })).toEqual({
  name: 'Games', params: { screen: 'GamesRemote', params: { sessionId: 'room-1' } },
});
```

Blank ids return `null`.

- [ ] **Step 2: Implement the exhaustive resolver**

Use a discriminated switch over `SharedHomeDestination`. Do not deserialize or dispatch an arbitrary navigation object received from Supabase.

- [ ] **Step 3: Run and commit**

```bash
npx jest src/features/shared-home/sharedHomeNavigation.test.ts --runInBand
git add src/features/shared-home/sharedHomeNavigation.ts src/features/shared-home/sharedHomeNavigation.test.ts
git commit -m "feat: route Shared Home items to owning capabilities"
```

---

### Task 7: Build the finite Shared Home screen

**Files:**

- Create: `src/features/shared-home/SharedHomeScreen.tsx`
- Create: `src/features/shared-home/SharedHomeScreen.test.tsx`

- [ ] **Step 1: Write component tests for meaningful states**

Mock repository, cache, navigation, auth identity, and analytics. Cover:

- signed-out state renders no cached family data;
- cached same-user rows appear with “Not current” while refresh runs;
- empty state says family invitations and turns will appear here;
- `Needs you` is absent when no pending item exists;
- pending and recent groups render in deterministic order;
- unavailable rows omit prior actor/title/body;
- a route `deliveryId` highlights/scrolls to the exact item;
- tapping **Review invitation** or **Take your turn** dispatches the resolver result; and
- a failed refresh keeps same-user cache with a stale label.

- [ ] **Step 2: Implement the screen state machine**

Use `authIdentity?.userId`, `useIsFocused`, the repository, and cache:

```ts
type LoadState = 'idle' | 'loading' | 'fresh' | 'stale' | 'error';

async function refresh() {
  if (!userId) { setItems([]); setLoadState('idle'); return; }
  try {
    const fresh = await repository.list(50);
    setItems(fresh);
    setLoadState('fresh');
    await sharedHomeCache.save(userId, fresh);
  } catch {
    setLoadState((current) => current === 'fresh' ? 'fresh' : 'error');
  }
}
```

On user change, clear rendered rows before loading that user's cache. Subscribe while signed in; a Realtime event calls `refresh`, never mutates the list directly.

- [ ] **Step 3: Implement the reductive UI**

Use `AppShell`, `FlatList`, existing theme tokens, `Card`, `Text`, and `Button`. Render one title, optional stale/error note, optional **Needs you**, and **Recent**. Add stable test ids `sharedHome.screen`, `sharedHome.needsYou`, `sharedHome.recent`, and `sharedHome.item.<id>`. Do not add filters, badges with counts, a composer, avatars requiring new image behavior, or manual read controls.

- [ ] **Step 4: Run and commit**

```bash
npx jest src/features/shared-home/SharedHomeScreen.test.tsx --runInBand
git add src/features/shared-home/SharedHomeScreen.tsx src/features/shared-home/SharedHomeScreen.test.tsx
git commit -m "feat: add the Shared Home receiving surface"
```

---

### Task 8: Add the gated Home and Ask doorway

**Files:**

- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/CapabilityMenu.tsx`
- Modify: `src/navigation/CapabilityMenu.test.tsx`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`

- [ ] **Step 1: Write failing footer tests**

Extend the handlers with `onOpenHome`. Prove:

```ts
const enabled = render(
  <CapabilityMenu
    activeCapabilityId="todos"
    displayName="Andy"
    chats={chats}
    sharedHomeEnabled
    {...handlers}
  />,
);
fireEvent.press(enabled.getByLabelText('Open Home'));
fireEvent.press(enabled.getByLabelText('Ask Kwilt'));
expect(handlers.onOpenHome).toHaveBeenCalledTimes(1);
expect(handlers.onOpenChat).toHaveBeenCalledTimes(1);
expect(enabled.queryByLabelText('Open chat')).toBeNull();
```

With `sharedHomeEnabled={false}`, preserve the existing `Open chat` button and exact styling assertion.

- [ ] **Step 2: Write failing deep-link tests**

Add cases for `kwilt://home` and `kwilt://home/delivery-1` resolving to `SharedHome` with the optional `deliveryId`.

- [ ] **Step 3: Register the root route**

Add:

```ts
SharedHome: { deliveryId?: string; source?: 'manual' | 'push' | 'link' } | undefined;
```

Register `SharedHomeScreen` as a hidden drawer screen. Keep the route registered even when the feature flag is off so an already-sent gated push can resolve safely.

- [ ] **Step 4: Gate the footer, not the data contract**

Read `useFeatureFlag('shared-home-v1', false)` in the root host. Pass `sharedHomeEnabled`, `onOpenHome={() => navigate('SharedHome', { source: 'manual' })}`, and the unchanged contextual `onOpenChat`. In `CapabilityMenu`, render one visually joined two-button control labeled **Home** and **Ask** when enabled; otherwise render the current Chat pill unchanged.

- [ ] **Step 5: Add linking**

Configure:

```ts
SharedHome: {
  path: 'home/:deliveryId?',
  parse: { deliveryId: (value: string) => String(value), source: () => 'link' as const },
},
```

Do not add a site universal-link claim in this release; Expo push uses native route data and the `kwilt://` scheme. If a web handoff is later required, update the site allowlist in a separately scoped change.

- [ ] **Step 6: Run and commit**

```bash
npx jest src/navigation/CapabilityMenu.test.tsx src/navigation/linkingConfig.test.ts --runInBand
git add src/navigation/RootNavigator.tsx src/navigation/CapabilityMenu.tsx src/navigation/CapabilityMenu.test.tsx src/navigation/linkingConfig.ts src/navigation/linkingConfig.test.ts
git commit -m "feat: add gated Home and Ask navigation"
```

---

### Task 9: Route server pushes to the exact Home delivery

**Files:**

- Modify: `src/services/NotificationService.ts`
- Modify: `src/services/NotificationService.test.ts`
- Modify: `src/services/analytics/events.ts`

- [ ] **Step 1: Write the notification regression test first**

Capture the mocked callback passed to `Notifications.addNotificationResponseReceivedListener`, invoke it with:

```ts
{
  notification: { request: { identifier: 'push-1', content: { data: { type: 'sharedDelivery', deliveryId: 'delivery-1' } } } },
  actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
}
```

Expect:

```ts
expect(navigateWhenReady).toHaveBeenCalledWith('SharedHome', {
  deliveryId: 'delivery-1',
  source: 'push',
});
```

Missing/blank delivery ids must not navigate.

- [ ] **Step 2: Extend the closed notification union**

Add:

```ts
| { type: 'sharedDelivery'; deliveryId: string }
```

Do not add it to `SYSTEM_NUDGE_TYPES`; family delivery is not an AI/system nudge and does not share its caps or ledgers.

- [ ] **Step 3: Add exact response routing**

In the response switch:

```ts
case 'sharedDelivery': {
  const deliveryId = typeof data.deliveryId === 'string' ? data.deliveryId.trim() : '';
  if (!deliveryId) return;
  navigateWhenReady('SharedHome', { deliveryId, source: 'push' });
  break;
}
```

Keep general notification analytics metadata-only.

- [ ] **Step 4: Add safe analytics constants**

Add the seven names from the evaluation plan to `AnalyticsEvent`: `SharedDeliveryCreated`, `SharedDeliveryPushAttempted`, `SharedHomeOpened`, `SharedHomeItemOpened`, `SharedDeliveryDestinationReached`, `SharedDeliverySettled`, and `SharedDeliveryUnavailable`. Client events attach capability/event/state/source classes only.

- [ ] **Step 5: Run and commit**

```bash
npx jest src/services/NotificationService.test.ts --runInBand
git add src/services/NotificationService.ts src/services/NotificationService.test.ts src/services/analytics/events.ts
git commit -m "feat: open Shared Home from family pushes"
```

---

### Task 10: Reconcile documentation and run the local completion gates

**Files:**

- Modify: `src/features/shared-home/FEATURE.md`
- Modify: `docs/feature-briefs/shared-home.md`
- Modify after proof only: `docs/job-flows/maya-move-family-life-forward.md`

- [ ] **Step 1: Update the manifest from planned to implemented truth**

Replace “Planned surfaces” with “Surfaces” and list only files that now exist. Keep `status: shipping` until TestFlight behavioral proof is complete.

- [ ] **Step 2: Run focused suites**

```bash
npx jest src/features/shared-home src/navigation/CapabilityMenu.test.tsx src/navigation/linkingConfig.test.ts src/services/NotificationService.test.ts --runInBand
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/sharedHomeDelivery_deno_test.ts
npm run lint:supabase-functions
npm run product:lint
```

Expected: all PASS with no new product-lint errors.

- [ ] **Step 3: Run the repository completion ritual**

```bash
npm run verify:changed -- --run
```

Because this changes shared navigation, notifications, caching, and server paths, also run:

```bash
npm test -- --runInBand
npm run lint:tests
npm run architecture:lint
```

Expected: all PASS. Record any pre-existing unrelated failure separately; do not fix or stage concurrent Focus Widget, Money, Activities, Arc, navigation, or soundscape work unless Andrew expands scope.

- [ ] **Step 4: Self-review against the brief**

Check every acceptance criterion in `docs/feature-briefs/shared-home.md`. Search for prohibited concepts:

```bash
rg -n "mark.*read|unread_count|feed_rank|shared.*composer|kwilt_feed_events" src/features/shared-home supabase/functions/_shared/sharedHomeDelivery.ts
```

Expected: no manual unread/ranking/composer implementation and no `kwilt_feed_events` dependency.

- [ ] **Step 5: Commit the completed local slice**

```bash
git add src/features/shared-home/FEATURE.md docs/feature-briefs/shared-home.md
git commit -m "docs: record Shared Home implementation boundary"
```

Do not stage unrelated dirty files. Verify the exact staged paths with `git diff --cached --name-only` before every commit.

---

### Task 11: Deploy the gated backend and prove two-device TestFlight behavior

**Files:**

- Update proof sections only: `docs/feature-briefs/shared-home.md`
- Update after evidence: `docs/design-explorations/shared-experience-notification-thread/05-evaluate-learning.md`
- Update after evidence: `docs/job-flows/maya-move-family-life-forward.md`

- [ ] **Step 1: Verify deployment target and migration history read-only**

Confirm the linked Supabase project, current remote migration head, function versions, and the exact two allowlisted permanent user ids. Do not deploy if the target is ambiguous or the local migration history diverges.

- [ ] **Step 2: Deploy additive schema and functions**

Apply only the new migration and deploy `invite-create` and `remote-pass-pattern-command` with `SHARED_HOME_RECIPIENT_IDS` configured for the two test accounts. Inspect the live table, RLS policies, grants, indexes, triggers, and Realtime registration afterward.

- [ ] **Step 3: Prove remote authorization directly**

With separate authenticated sessions, prove recipient read succeeds and actor, unrelated Friend, unrelated Household member, anonymous session, and wrong recipient return zero rows. Attempt client insert/update/delete and confirm denial. Save sanitized evidence without names, content, tokens, or ids.

- [ ] **Step 4: Create and verify a signed TestFlight build**

Record source checkout, branch, commit, dirty state, EAS build id, uploaded artifact, Apple processing state, installed TestFlight version/build, and device account roles. An accepted upload is not behavioral proof.

- [ ] **Step 5: Run the real Goal lifecycle**

From account A, create a targeted Goal invitation for account B. On B's physical device, receive and dismiss the push, later open Home manually, find the same delivery, review the invitation, accept or decline, and observe settlement. Repeat revoke and expiry/unavailable behavior with separate fixtures.

- [ ] **Step 6: Run the real Pass the Pattern lifecycle**

Use claimed permanent-account seats. Complete a successful turn and invoke `next_player`; verify only the new player receives one Home delivery/push, ordinary beat submissions emit none, the old delivery settles, and the exact remote room opens.

- [ ] **Step 7: Run boundary scenarios**

Verify foreground, background, cold launch, notification denied, offline cache, stale refresh, sign-out, account switch, removed seat, revoked Goal access, duplicate command retry, and expired source behavior. Any wrong-recipient or cross-account presentation blocks release.

- [ ] **Step 8: Record learning without overclaiming**

After at least ten real lifecycles and 48 hours of possible natural return, update the evaluation record with engineering, comprehension, and product evidence separately. Keep the brief and manifest `shipping` unless the permanent-product threshold is met; update the Maya job-flow score only when real evidence changes Kwilt's delivered ability.

- [ ] **Step 9: Commit proof artifacts only**

```bash
git add docs/feature-briefs/shared-home.md docs/design-explorations/shared-experience-notification-thread/05-evaluate-learning.md docs/job-flows/maya-move-family-life-forward.md
git commit -m "docs: record Shared Home learning evidence"
```

Omit any unchanged file from the command and verify the staged diff before committing.

---

## Plan self-review

- Spec coverage: schema/RLS, Goal, Game, push, Home, Home/Ask navigation, cache isolation, analytics, feature flags, rollback, and physical proof each map to a task.
- Type consistency: server event kinds are `goal_invitation | game_turn`; destinations are `goal_invite | game_room`; client and push use `sharedDelivery` plus `deliveryId`.
- Product correction: live Bank rolls never emit Home events; the second adapter is a deliberate Pass the Pattern `next_player` handoff.
- Existing Home conflict: legacy `TodayScreen` remains untouched and Shared Home has its own feature folder and manifest.
- Worktree rule: execute on the existing branch unless Andrew explicitly approves a parallel worktree.
- Staging rule: every commit lists exact paths and requires a cached-name review; unrelated concurrent work remains unstaged.
