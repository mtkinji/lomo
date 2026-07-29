# Friends Sharing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely expose Settings > People > Sharing with a zero-access Friends roster, two-party Friend links, and server-authorized relationship lifecycle controls.

**Architecture:** Add one additive Supabase hardening migration that removes ambient Friend feed access, revokes direct relationship writes, records audit events, and exposes narrow authenticated RPCs. Refactor the mobile friendship service around those RPCs, compose the dormant roster into the existing Sharing screen, and add a canonical Friend-invite deep-link decision screen. Targeted Friend-to-Goal invitations remain a separate second milestone because they alter the existing Goal invite and membership subsystem.

**Tech Stack:** React Native / Expo SDK 54, React Navigation, Supabase Postgres/RLS/RPC, Supabase Edge Functions, Jest, React Native Testing Library, Node test runner.

---

## File structure

- `supabase/migrations/20260728213000_harden_friendships.sql` — authoritative friendship states, zero-access RLS, audit log, and authenticated transition/invite-accept RPCs.
- `scripts/friends-sharing-migration-contract.test.mjs` — static regression contract for the security-critical migration and accept Edge Function.
- `supabase/functions/friend-invite-accept/index.ts` — authenticated adapter into the atomic database invite-accept command.
- `src/services/friendships.ts` — typed mobile read and command boundary; no direct relationship writes.
- `src/services/friendships.test.ts` — service RPC and two-party-consent regression coverage.
- `src/features/friends/FriendshipSettingsSection.tsx` — relationship roster, incoming decisions, invite action, end, and block controls embedded in Sharing.
- `src/features/friends/FriendshipSettingsSection.test.tsx` — boundary copy, empty/list/request, and action behavior.
- `src/features/friends/JoinFriendInviteScreen.tsx` — deep-link preview and explicit recipient acceptance.
- `src/features/friends/JoinFriendInviteScreen.test.tsx` — acceptance, failure, and zero-access copy behavior.
- `src/features/account/SharingSettingsScreen.tsx` — composes Friends, Goal-scoped sharing placeholders, and existing reminder controls.
- `src/features/account/SettingsHomeScreen.tsx` — renames Family to People and moves Sharing out of Personalization.
- `src/features/account/SettingsHomeScreen.test.tsx` — Settings hierarchy regression coverage.
- `src/navigation/routeParams.ts` — typed Friend invite route parameters.
- `src/navigation/RootNavigator.tsx` — registers the Friend invite decision screen in Settings.
- `src/navigation/linkingConfig.ts` — maps `/friend/:inviteCode` and `kwilt://friend/:inviteCode` to the decision screen.
- `src/navigation/linkingConfig.test.ts` — deep-link resolution regression coverage.
- `src/features/friends/FriendsScreen.tsx` — thin compatibility wrapper around the shared Friends section; removes obsolete feed/milestone claims and unsafe direct-action behavior.

## Scope boundary

This plan does not add targeted Goal invitations to Friends. That follow-on must extend `kwilt_invites`, `invite-create`, `invite-accept`, `src/services/invites.ts`, `ShareGoalDrawer.tsx`, and the recipient's pending Goal inventory together so recipient binding and membership acceptance stay atomic. The foundation produced here is independently useful and testable: people can connect, inspect, end, and block relationships safely, while friendship grants no content access.

### Task 1: Lock the zero-access database contract

**Files:**
- Create: `scripts/friends-sharing-migration-contract.test.mjs`
- Create: `supabase/migrations/20260728213000_harden_friendships.sql`

- [ ] **Step 1: Write the failing migration contract**

Create Node tests that read the migration and assert all of the following exact contracts:

```js
assert.match(migration, /status in \('pending', 'active', 'ended', 'blocked'\)/);
assert.match(migration, /create table public\.kwilt_friendship_audit_events/);
assert.match(migration, /drop policy if exists "Friends can read user feed events"/i);
assert.match(migration, /revoke insert, update, delete on public\.kwilt_friendships from anon, authenticated/);
assert.match(migration, /create or replace function public\.transition_kwilt_friendship/);
assert.match(migration, /create or replace function public\.accept_kwilt_friend_invite/);
assert.match(migration, /security definer/);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /p_action not in \('accept', 'decline', 'end', 'block'\)/);
assert.match(migration, /candidate\.initiated_by = v_actor/);
assert.match(migration, /insert into public\.kwilt_friendship_audit_events/);
assert.match(migration, /grant execute on function public\.transition_kwilt_friendship\(uuid, text\) to authenticated/);
assert.match(migration, /grant execute on function public\.accept_kwilt_friend_invite\(text\) to authenticated/);
```

- [ ] **Step 2: Run the contract and verify it fails**

Run: `node --test scripts/friends-sharing-migration-contract.test.mjs`

Expected: FAIL because `20260728213000_harden_friendships.sql` does not exist.

- [ ] **Step 3: Add the additive hardening migration**

The migration must:

```sql
alter table public.kwilt_friendships
  drop constraint if exists kwilt_friendships_status_check;
alter table public.kwilt_friendships
  add constraint kwilt_friendships_status_check
  check (status in ('pending', 'active', 'ended', 'blocked'));

alter table public.kwilt_friendships
  add column if not exists blocked_by uuid references auth.users(id),
  add column if not exists ended_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.kwilt_friendships
  add constraint kwilt_friendships_initiator_is_participant
  check (initiated_by = user_a or initiated_by = user_b);
```

Create an append-only `kwilt_friendship_audit_events` table. Participants may read events for their own relationship, but app roles cannot insert, update, or delete audit rows. Drop the original insert/update policies and revoke direct mutations on `kwilt_friendships`.

Drop the legacy `Friends can read user feed events` policy so friendship alone exposes no feed or milestone content.

Create `transition_kwilt_friendship(p_friendship_id uuid, p_action text) returns jsonb` with `security definer set search_path = ''`. It must lock the relationship row, derive the actor from `auth.uid()`, require actor participation, and enforce:

```text
accept: pending, actor is not initiated_by -> active
decline: pending, actor is not initiated_by -> ended
end: active, either participant -> ended
block: pending or active, either participant -> blocked
```

Create `accept_kwilt_friend_invite(p_code text) returns jsonb` with the same hardening. It must lock one unexpired, unexhausted `friendship` invite, reject self-friending and blocked pairs, activate the normalized pair because inviter-send plus recipient-accept are the two affirmative actions, increment invite use atomically, and append an audit event.

Revoke function execution from `public` and `anon`; grant only to `authenticated`.

- [ ] **Step 4: Run the migration contract**

Run: `node --test scripts/friends-sharing-migration-contract.test.mjs`

Expected: PASS.

### Task 2: Route mobile relationship mutations through authenticated commands

**Files:**
- Create: `src/services/friendships.test.ts`
- Modify: `src/services/friendships.ts`

- [ ] **Step 1: Write failing service tests**

Mock `getSupabaseClient()` and require these calls:

```ts
expect(rpc).toHaveBeenCalledWith('transition_kwilt_friendship', {
  p_friendship_id: 'friendship-1',
  p_action: 'accept',
});

expect(rpc).toHaveBeenCalledWith('transition_kwilt_friendship', {
  p_friendship_id: 'friendship-1',
  p_action: 'decline',
});

expect(rpc).toHaveBeenCalledWith('transition_kwilt_friendship', {
  p_friendship_id: 'friendship-1',
  p_action: 'end',
});

expect(rpc).toHaveBeenCalledWith('transition_kwilt_friendship', {
  p_friendship_id: 'friendship-1',
  p_action: 'block',
});
```

Also assert no test observes `.from('kwilt_friendships').update(...)` for a mutation, `FriendshipStatus` includes `ended`, and invite acceptance reports `active` rather than a pending third-confirmation state.

- [ ] **Step 2: Run the service tests and verify failure**

Run: `npm test -- --runInBand src/services/friendships.test.ts`

Expected: FAIL because the service still performs direct table updates and exposes no separate end/block commands.

- [ ] **Step 3: Implement the typed RPC boundary**

Add:

```ts
export type FriendshipStatus = 'pending' | 'active' | 'ended' | 'blocked';
export type FriendshipAction = 'accept' | 'decline' | 'end' | 'block';

async function transitionFriendship(friendshipId: string, action: FriendshipAction): Promise<boolean> {
  const { error } = await getSupabaseClient().rpc('transition_kwilt_friendship', {
    p_friendship_id: friendshipId,
    p_action: action,
  });
  return !error;
}

export const acceptFriendRequest = (id: string) => transitionFriendship(id, 'accept');
export const declineFriendRequest = (id: string) => transitionFriendship(id, 'decline');
export const endFriendship = (id: string) => transitionFriendship(id, 'end');
export const blockFriendship = (id: string) => transitionFriendship(id, 'block');
```

Remove `declineOrBlockFriend`. Correct the service comments to state that a deliberate link send plus recipient acceptance activates the relationship, and that friendship grants no feed/content visibility.

- [ ] **Step 4: Run the service tests**

Run: `npm test -- --runInBand src/services/friendships.test.ts`

Expected: PASS.

### Task 3: Make Friend-link acceptance atomic

**Files:**
- Modify: `scripts/friends-sharing-migration-contract.test.mjs`
- Modify: `supabase/functions/friend-invite-accept/index.ts`

- [ ] **Step 1: Extend the failing source contract**

Require the Edge Function to authenticate the bearer token using a user-scoped Supabase client and call:

```ts
supabase.rpc('accept_kwilt_friend_invite', { p_code: code })
```

The source contract must reject service-role relationship inserts, manual `uses + 1` updates, and a pending third-confirmation response.

- [ ] **Step 2: Run and observe failure**

Run: `node --test scripts/friends-sharing-migration-contract.test.mjs`

Expected: FAIL because the current Edge Function uses service-role reads/inserts/updates.

- [ ] **Step 3: Refactor the Edge Function**

Keep method, CORS, bearer, body, and safe error response handling. Create a Supabase client with the publishable/anon key and the caller's Authorization header, verify `auth.getUser()`, then call the atomic RPC. Return `{ friendshipId, status }` from the RPC result. Never expose blocker identity or raw database diagnostics.

- [ ] **Step 4: Run the source contract**

Run: `node --test scripts/friends-sharing-migration-contract.test.mjs`

Expected: PASS.

### Task 4: Broaden Settings from Family to People

**Files:**
- Modify: `src/features/account/SettingsHomeScreen.test.tsx`
- Modify: `src/features/account/SettingsHomeScreen.tsx`

- [ ] **Step 1: Write the failing hierarchy test**

Assert that Settings renders `People`, not `Family`; that both Household and Sharing navigate to their existing routes; and that Sharing appears only once.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --runInBand src/features/account/SettingsHomeScreen.test.tsx`

Expected: FAIL because the current section is Family and Sharing is under Personalization.

- [ ] **Step 3: Apply the minimal IA change**

Change the section to:

```ts
{
  id: 'people',
  title: 'People',
  entries: [
    { id: 'household', title: 'Household', route: 'SettingsHousehold' },
    { id: 'sharing', title: 'Sharing', route: 'SettingsSharing' },
  ],
}
```

Remove Sharing from Personalization. Keep Screen Time Controls where it is.

- [ ] **Step 4: Run the hierarchy test**

Run: `npm test -- --runInBand src/features/account/SettingsHomeScreen.test.tsx`

Expected: PASS.

### Task 5: Compose Friends into the Sharing surface

**Files:**
- Create: `src/features/friends/FriendshipSettingsSection.tsx`
- Create: `src/features/friends/FriendshipSettingsSection.test.tsx`
- Modify: `src/features/account/SharingSettingsScreen.tsx`
- Modify: `src/features/friends/FriendsScreen.tsx`

- [ ] **Step 1: Write the component behavior tests**

Mock the friendship service and assert:

- The screen always shows `Becoming friends does not share anything by itself.`
- Incoming requests expose distinct Accept and Decline controls.
- Active Friends render without friend counts, activity, progress, streaks, or status badges.
- `Invite a friend` creates and shares a one-use link with precise zero-access copy.
- End and Block are separate actions; end copy previews that shared Goals remain unchanged.
- Loading, empty, and error states remain understandable.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --runInBand src/features/friends/FriendshipSettingsSection.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the embedded relationship section**

Build a quiet Settings-native section using `Card`, `SettingsRow`/primitives, `ProfileAvatar`, and semantic state copy. Do not introduce blue or green decoration. Brand color may identify the primary Invite action; destructive color is reserved for Block; neutral surfaces carry ordinary rows.

Use `listFriends`, `getPendingFriendRequests`, `createFriendInvite`, `acceptFriendRequest`, `declineFriendRequest`, `endFriendship`, and `blockFriendship`. Do not send identifiers, names, or invite codes to analytics.

- [ ] **Step 4: Compose it into Sharing**

Order the screen as:

```text
Sharing boundary
Friend requests (when present)
Friends
Shared by you (Goal-only placeholder only when real data exists; omit for now)
Shared with you (Goal-only placeholder only when real data exists; omit for now)
Reminders
```

Retain reminder controls. Replace decorative selected-row color with a semantic selection indicator and neutral selected surface.

Make `FriendsScreen` a compatibility wrapper that renders the same section rather than retaining separate unsafe copy/actions.

- [ ] **Step 5: Run component and Settings tests**

Run: `npm test -- --runInBand src/features/friends/FriendshipSettingsSection.test.tsx src/features/account/SettingsHomeScreen.test.tsx`

Expected: PASS.

### Task 6: Add the Friend-invite decision route

**Files:**
- Create: `src/features/friends/JoinFriendInviteScreen.tsx`
- Create: `src/features/friends/JoinFriendInviteScreen.test.tsx`
- Modify: `src/navigation/routeParams.ts`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`

- [ ] **Step 1: Write failing route and screen tests**

Require `/friend/abc123` to resolve to `Settings > SettingsJoinFriend` with `{ inviteCode: 'abc123' }`. Require the decision screen to say friendship shares nothing, call `acceptFriendInvite('abc123')` only after explicit acceptance, show active success, and give expired/blocked/invalid failures safe retry-or-return copy.

- [ ] **Step 2: Run and observe failure**

Run: `npm test -- --runInBand src/navigation/linkingConfig.test.ts src/features/friends/JoinFriendInviteScreen.test.tsx`

Expected: FAIL because the route and screen do not exist.

- [ ] **Step 3: Register the route and screen**

Add:

```ts
export type JoinFriendInviteRouteParams = { inviteCode: string };
```

Register `SettingsJoinFriend: JoinFriendInviteRouteParams` and map `friend/:inviteCode` beneath Settings in `linkingConfig`.

The screen must require signed-in state through the existing auth prompt path, present the zero-access contract before acceptance, call the service once per deliberate attempt, and navigate to `SettingsSharing` after success.

- [ ] **Step 4: Run the route and screen tests**

Run: `npm test -- --runInBand src/navigation/linkingConfig.test.ts src/features/friends/JoinFriendInviteScreen.test.tsx`

Expected: PASS.

### Task 7: Verify the foundation and record proof boundaries

**Files:**
- Modify: `docs/feature-briefs/friends-sharing.md`
- Modify: `src/features/friends/FEATURE.md`

- [ ] **Step 1: Run focused automated verification**

Run:

```bash
node --test scripts/friends-sharing-migration-contract.test.mjs
npm test -- --runInBand src/services/friendships.test.ts src/features/friends/FriendshipSettingsSection.test.tsx src/features/friends/JoinFriendInviteScreen.test.tsx src/features/account/SettingsHomeScreen.test.tsx src/navigation/linkingConfig.test.ts
npm run product:lint
```

Expected: all commands pass with zero errors.

- [ ] **Step 2: Run the repository completion gate**

Run: `npm run verify:changed -- --run`

Expected: pass. Report unrelated concurrent Explore files/tests separately from Friends proof.

- [ ] **Step 3: Update documentation truth**

Record that the secure relationship foundation is implemented locally but remains `shipping`. Do not claim production readiness until the migration and Edge Function are deployed, the universal-link web route forwards correctly, and two authenticated accounts complete create/open/accept/reload/end/block on separate installs without database intervention.

- [ ] **Step 4: Prepare the next implementation plan**

Create a follow-on plan for targeted Friend-to-Goal invitations only after this foundation passes. It must include recipient-bound invite creation, pending recipient inventory, explicit accept/decline, membership isolation, independent revocation, and a two-account TestFlight procedure.
