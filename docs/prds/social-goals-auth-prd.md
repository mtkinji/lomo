## PRD — Shared Goals + Auth (Apple + Google) + Signals-Only Social Mechanics

### Purpose

Ship **true shared goals** (1:1 and squads) anchored on the **Goal detail canvas**, with **intent-gated sign-in (Apple + Google)** and a **privacy-safe “signals-only” default**.

This PRD is the **canonical source of truth** for:
- Auth posture and when it appears
- What “signals-only” means (and what it explicitly does *not* mean)
- Invite/deep-link mechanics (and how they relate to referral links)
- Minimal data model + RLS posture (Supabase-first)
- Phasing for a first shipping version of shared goals

### References (existing strategy + constraints)

- Backend posture: `docs/backend-services-supabase-strategy.md`
- Shared goals UX spec (high-level): `docs/shared-goals-feature-spec.md`
- Growth context: `docs/prds/growth-evangelism-shared-goals-prd.md`
- UX constraints: preserve **app shell + canvas** (`docs/ux-flow.md`, `docs/ui-architecture.md`)
- Notifications posture (deep links + caps): `docs/notifications-paradigm-prd.md`, `docs/prds/notifications-v1-5-prd.md`
- Existing referral deep-link system (AI bonus credits): `docs/ai-credits-and-rewards.md`

---

## Product goal

Add social dynamics that materially improve follow-through while preserving Kwilt’s core UX layers:
- **App shell** stays stable (nav + gutters)
- **Canvas** stays primary (Goal detail is the action surface)

---

## Non-goals (v1)

- No “friends graph” / social network.
- No public profiles, follower/following, or discovery.
- No leaderboards/leagues/XP.
- No server push notifications required for v1 (in-app and local-first are acceptable).
- No automatic sharing of Activity titles/details by default.
- No CRDT/collaborative rich-text editing; start with low-conflict structures + optimistic concurrency where needed.

---

## Scope decision: skipping “Phase 0” evangelism for this workstream

The repo includes a Phase 0 “share message without accounts” concept (`docs/prds/growth-evangelism-shared-goals-prd.md`, `docs/onboarding-cycle-plan.md`).

**For this rollout we are prioritizing true shared goals + auth.** We may still keep the basic “share message” affordance around for growth, but the implementation plan below assumes we are building **Phase 1 (shared goals + identity)** first.

---

## UX contract (v1)

### Single entry point: one “Share goal” action

In **Goal detail**, add one action:
- Label: **Share goal** (copy can evolve: “Invite buddy” / “Start squad”)
- Opens a bottom sheet that:
  - chooses **Buddy (1 person)** vs **Squad (2–6)**
  - states the default privacy contract (signals-only)

### Intent-gated auth interrupt

If user is not signed in:
- “Share goal” continues into a sign-in sheet **only because** user is initiating a join/invite.
- After sign-in completes, user returns to the **same goal canvas** and the share sheet continues (no “auth mode” screen).

### Join flow (invite acceptance)

When a recipient opens an invite:
- If they have Kwilt installed: deep-link to a **Join Shared Goal** canvas.
- If not installed: a redirect flow should take them to install, and then continue into Join when the app is opened with the link again.

Join canvas requirements:
- Shows goal title and who invited you.
- Shows the signals-only contract (what you will see and what stays private).
- CTA: **Join** (creates membership).

---

## Auth (Apple + Google) — requirements

### Providers

Ship with:
- **Sign in with Apple**
- **Sign in with Google**

### Posture

- Auth is **optional** until collaboration requires it.
- Sessions are **per-device** but map to one account.
- Use Supabase Auth (PKCE OAuth) on mobile.

### Anonymous → authenticated migration (required)

Even before login, the app uses an install-scoped identifier:
- Generate `installId` (UUID) on first run and store securely.
- Send it on relevant calls as `x-kwilt-install-id`.

On sign-in:
- Server associates historical `installId` usage to the user account (for quota, attribution, and link opens).

### Log out semantics (client UX contract)

Kwilt is **local-first**. Signing in enables collaboration and server-backed services, but the core app remains usable without an account.

- **Log out (recommended default behavior)**
  - Clears the Supabase Auth session on-device (disconnects the cloud identity).
  - Returns the app to an “unsigned” posture (auth-gated flows will prompt sign-in again).
  - **Does not delete local data** (arcs/goals/activities) or local coaching/profile preferences.
  - Rationale: preserve user work and keep offline-first utility; avoid surprising data loss.

- **Erase local data (separate, optional action for shared devices)**
  - Destructive confirmation required.
  - Clears local domain storage and resets local store state to defaults.
  - Rationale: shared-device privacy / account switching without carrying over personal data.

---

## “Signals-only” (privacy contract) — canonical definition

Signals-only is a deliberate default to keep early shared goals **supportive** without being **intrusive**.

### What members can see by default

- **Membership + presence**
  - Member list (avatars/names)
  - Join/leave events
- **Explicit check-ins**
  - “I checked in” event
  - Optional short text (member-authored)
  - Optional preset (“Made progress”, “Struggled today”, “Need encouragement”, etc.)
- **Cheering / reactions**
  - Quick reactions on check-ins/events (e.g., “cheer” / “heart” / “clap”)
- **Lightweight progress signals (explicit, not inferred)**
  - “X made progress today” is allowed **only if it is an explicit check-in**, not an inferred activity completion.

### What is NOT shared by default

- **Activity titles**
- **Activity notes / checklists / tags**
- **Exact time spent**
- **Full personal history** prior to invite acceptance (default is “from acceptance forward”)

### Optional future expansions (explicit opt-in, not v1)

- Allow a goal-level toggle: “Share activity titles for activities linked to this shared goal.”
- Allow a per-activity toggle: “Share this activity title with goal members.”
- Allow “include past context” at invite creation time with a clear summary of what will be included.

### UX copy requirement (must be explicit)

Every invite/join surface must include a short, consistent line:
- “By default you share **signals only** (check-ins + cheers). Activity titles stay private unless you choose to share them.”

---

## Invites + referral links — guidance (separate, but share infrastructure)

We already have **referral links** for AI bonus credits (`kwilt://referral?code=...`).
Shared goals require **invite links** that create memberships.

### Recommendation

Keep them **separate at the domain level**, but share routing/redirect infrastructure:

- **Referral codes**:
  - Purpose: growth reward attribution (bonus credits)
  - Behavior: redeem once per friend install; does not grant membership
  - Abuse posture: financial/cost impact, needs strict anti-abuse (already present)

- **Invite codes (shared goals)**:
  - Purpose: access control for a shared object
  - Behavior: accept creates a membership row; may have max uses, expiry, role defaults
  - Abuse posture: access/security impact, needs strict anti-abuse + RLS correctness

### Convergence (allowed later)

If we want a single “link system,” converge **under the hood** via a table like `kwilt_links(kind, code, payload, expires_at, max_uses, uses)` and a single redirect function. But keep the product semantics distinct (invite vs referral) and keep analytics distinct.

---

## Data model + RLS (Supabase-first)

### Core tables (v1)

Reuse the generic collaboration spine:
- `kwilt_memberships` — who belongs to what, with role + status
- `kwilt_invites` — invite codes for entities (goal initially)
- `kwilt_feed_events` — append-only feed of signals + events

Goal-specific tables (v1):
- `goal_checkins`
- (optional) `goal_reactions` (or model reactions as `kwilt_feed_events` types if sufficient)

### Entity model choice

Prefer: keep existing `goals` table as the canonical goal object and add “shared-ness” via memberships:
- A goal is “shared” if it has 2+ active memberships (or a dedicated `is_shared` boolean for faster queries).

### RLS posture (conceptual)

- Read:
  - Allowed if requester is an active member of `(entity_type, entity_id)`.
- Write:
  - Allowed if requester is an active member with a role that grants the action.
  - Recommended v1: **co-owner only** (simple), but schema supports collaborators later.

---

## Social mechanics (v1)

### Check-ins

- A check-in creates:
  - a `goal_checkins` row
  - a `kwilt_feed_events` row (type: `checkin_submitted`)
- Check-ins are the primary “signals-only” artifact.

### Cheers / reactions

- Minimal model: reaction on a feed event (`reaction_added`), with a constrained set of reactions.

### Group streak (optional in v1)

If included, define it strictly as:
- “At least one member checked in today” (or “all members checked in today”) — choose one and document it.
- Streak is computed server-side or derived from check-in events (avoid syncing activities just for streak).

---

## Notifications + deep links

### v1 posture

- Start with in-app surfaces (toasts, feed updates) and local-first notifications where appropriate.
- Avoid server push in v1 unless it becomes necessary.

### Deep link requirements

Invite links and notification taps must:
- Preserve app shell + canvas structure
- Route to:
  - `GoalDetail(goalId)` for members
  - `JoinSharedGoal(inviteCode)` for invite accept

---

## Analytics (v1)

### Auth + invites

- `shared_goal_share_tapped`
- `shared_goal_invite_created`
- `shared_goal_invite_opened`
- `shared_goal_invite_accept_started`
- `shared_goal_invite_accepted`

### Signals-only engagement

- `shared_goal_checkin_created`
- `shared_goal_reaction_added`
- `shared_goal_opened` (member)

Include properties:
- `goalId`, `sharedGoalMemberCount`, `surface` (goalDetailHeader / shareSheet / joinScreen), `isSignedIn`

---

## Phasing (this rollout)

### V1A — Shared goals foundation (ship)

- Apple + Google sign-in (intent-gated)
- Invite create + invite accept (link-based)
- Membership model + RLS
- Goal detail: member header + Share goal action
- Signals-only feed: check-ins + cheers

### V1B — Squads (2–6) + polish (ship)

- Squad creation + membership management
- Basic “group streak” (if desired) + wrap card (optional)
- Better empty states + copy polish + guardrails (mute/leave)

### V1C — Optional deeper sharing (defer)

- Opt-in activity title sharing (goal-level or per-activity)
- Include past context option (explicit)
- Server push notifications (only if needed)

---

## Implementation status (as of 2026-01-01)

This section tracks what is **implemented in `Kwilt` repo** vs what remains. Status legend:
- ✅ **Complete**
- 🟡 **Partial / shipped primitive but not full UX**
- ⏳ **Not started**

### V1A — Shared goals foundation (current)

- ✅ **Apple + Google sign-in (intent-gated)**: `src/services/backend/auth.ts`, `App.tsx` session listener
- ✅ **Invite create/preview/accept/redirect (link-based)**: `supabase/functions/invite-{create,preview,accept,redirect}`, `src/services/invites.ts`
- ✅ **Membership model + RLS**: `supabase/migrations/20251230000000_kwilt_shared_goals_v1.sql` + `20251230000010_kwilt_shared_goals_text_ids.sql`
- ✅ **Goal detail: member header + Share goal action**: `src/features/arcs/GoalDetailScreen.tsx`, `src/features/goals/ShareGoalDrawer.tsx`
- ✅ **Join flow UX (Join drawer + accept)**: `src/features/goals/JoinSharedGoalDrawerHost.tsx`, `src/services/invites.ts`
- ✅ **Member roster (members list)**: `supabase/functions/memberships-list`, `src/services/sharedGoals.ts`
- ✅ **Leave shared goal (basic “mute/leave” guardrail)**: `supabase/functions/memberships-leave`, `src/services/sharedGoals.ts`, Goal members sheet in `GoalDetailScreen`
- ✅ **Deep links**:
  - Scheme + Expo Go: `kwilt://invite?...` and `exp://.../invite?...` via `RootNavigator` + `handleIncomingInviteUrl`
  - Universal links parsing in-app: `https://go.kwilt.app/i/<code>` / `https://kwilt.app/i/<code>` supported in `src/services/invites.ts`
  - iOS/Android app-side association config: `app.config.ts` (requires hosting AASA/assetlinks in the marketing/link repo)
- 🟡 **Analytics instrumentation**: implemented for share/join flows, but event names differ from PRD’s suggested canonical names (`src/services/analytics/events.ts`)
- ⏳ **Signals-only feed (check-ins + cheers UI)**: schema exists (`goal_checkins`, `kwilt_feed_events`), but no client UI/services yet
- ⏳ **Reactions / cheers**: not yet implemented client/server-side beyond copy/contract
- ⏳ **Invite revoke / owner tools**: not yet implemented (V1B)

## Engineering execution checklist (ship plan)

This is the concrete build plan for V1A/V1B. Keep the UX in the **goal canvas** and preserve **shell/canvas** layering at every step.

### 0) Decisions to lock (before building)

- Providers: **Apple + Google** enabled in Supabase Auth.
- Signals-only contract: **explicit check-ins + cheers only** (no inferred activity sharing by default).
- Invite limits:
  - `expires_at`: **14 days** (Buddy + Squad) (adjustable later)
  - `max_uses`: **1 for Buddy**, **5 for Squad** (adjustable later)
- Role posture:
  - Recommended v1: `co_owner` only in UX, schema supports `collaborator`.

### 1) Supabase schema + RLS (migrations)

Create a migration that introduces the collaboration spine for Goals:
- Tables:
  - `kwilt_memberships` (entity_type, entity_id, user_id, role, status, timestamps)
  - `kwilt_invites` (entity_type, entity_id, created_by, code, expires_at, max_uses, uses, timestamps)
  - `kwilt_feed_events` (entity_type, entity_id, actor_id, type, payload, created_at)
  - `goal_checkins` (goal_id, user_id, preset?, text?, created_at)
  - (Optional) `goal_reactions` (event_id, user_id, reaction, created_at) OR encode reactions as feed events
- RLS policies:
  - Member read for `kwilt_*` and `goal_checkins` scoped to the entity.
  - Writes allowed only for members; invite creation allowed for members with the right role.
- Helper functions (optional but recommended for readable RLS):
  - `is_member(entity_type, entity_id, uid)` / `member_role(entity_type, entity_id, uid)`

Status: ✅ Complete (see migrations `20251230000000_kwilt_shared_goals_v1.sql` and `20251230000010_kwilt_shared_goals_text_ids.sql`)

### 2) Edge Functions (invites + redirect)

Implement these Supabase Edge Functions (keep routes stable):
- `POST /invite-create`
  - input: `{ entityType: 'goal', entityId: string, kind: 'buddy'|'squad', goalTitle?: string }`
  - auth: **required** (Supabase user access token)
  - output: `{ inviteCode, inviteUrl, entityType, entityId, payload: { kind, goalTitle, expiresAt, maxUses } }`
  - behavior:
    - ensures inviter has an active membership (idempotent upsert)
    - creates `kwilt_invites` row (random code)
    - emits feed event `invite_created`
- `POST /invite-preview`
  - input: `{ inviteCode: string }`
  - auth: **not required** (invite code is the secret)
  - output: `{ ok, entityType, entityId, payload, inviter?, inviteState: 'active'|'expired'|'consumed', canJoin }`
  - behavior:
    - returns goal + inviter metadata even if expired/consumed so UI can explain what happened
- `POST /invite-accept`
  - input: `{ inviteCode: string }`
  - auth: **required** (Supabase user access token)
  - output: `{ ok, entityType, entityId, payload }`
  - behavior:
    - validates code (expiry/uses/maxUses)
    - creates membership row (idempotent)
    - increments invite uses (best-effort)
    - emits feed event `member_joined`
- `GET /invite-redirect/i/<code>`
  - public redirect to `kwilt://invite?code=<code>`
  - optional: `GET /invite-redirect/i/<code>?exp=<exp://...>` to support Expo Go handoff

Status: ✅ Complete (+ `invite-email-send` exists as an optional channel)

Abuse controls (v1):
- Rate-limit invite create/accept by IP + installId + userId.
- TTL on codes; max uses enforced; ability to revoke (owner only) can be V1B.

### 3) Client: auth integration (intent-gated)

Implement client auth integration so it can be invoked mid-flow:
- Add a single “ensure signed in” helper:
  - `ensureSignedIn({ reason: 'share_goal' | 'join_goal' })`
  - returns to the same canvas on success.
- Support Apple + Google providers.

Status: ✅ Complete (intent-gated helper exists; Google path included)

### 4) Client: deep-link handling (invite join)

Extend deep-link routing (alongside existing referral deep links):
- Deep link route (v1): `kwilt://invite?code=<code>`
- Expo Go support (dev-only): `exp://<ip>:<port>/--/invite?code=<code>`
- When opened:
  - If signed in: navigate to `JoinSharedGoalScreen(code)` and allow “Join”
  - If not signed in: run `ensureSignedIn({ reason: 'join_goal' })` then continue

Status: ✅ Complete for scheme + Expo + universal-link parsing (note: universal-link hosting is external)

### 5) Client screens + UI surfaces (V1A)

Goal canvas (existing Goal detail screen):
- Add “Share goal” action (header/menu) that opens a bottom sheet:
  - Buddy vs Squad (2–6)
  - Signals-only disclosure text
  - CTA: “Create invite link”
- Add shared header block for shared goals:
  - avatars + member count + optional “Manage”

Join screen:
- `JoinSharedGoalScreen`:
  - loads invite metadata
  - displays signals-only contract
  - CTA: Join

Status: ✅ Complete (implemented as Join drawer host + optional screen route)

Signals-only feed (minimal):
- In Goal detail, add a section or tab for:
  - Check-in composer (preset + optional text)
  - Recent feed items (join + check-ins + cheers)

Status: ⏳ Not started (schema exists; client UI/services TBD)

### 6) Client services layer

Create a thin API wrapper layer (names illustrative):
- `src/services/invites.ts`: create/preview/accept, deep-link handler, generate share URL(s)
- `src/services/sharedGoals.ts`: memberships roster + shared goal data fetch (and later: feed subscription, check-in submit)
- `src/services/backend/auth.ts`: intent-gated auth helper used by shared-goals flows

Status: ✅ Complete for invites + roster + leave; ⏳ feed/check-ins/reactions pending

### 7) Realtime (optional in V1A, recommended by V1B)

If enabled:
- Subscribe per-goal canvas to changes in:
  - memberships, feed events, check-ins, reactions
- Ensure RLS policies are compatible with realtime feeds.

### 8) Analytics instrumentation (minimum)

Emit:
- `shared_goal_share_tapped`
- `shared_goal_invite_created`
- `shared_goal_invite_opened`
- `shared_goal_invite_accept_started`
- `shared_goal_invite_accepted`
- `shared_goal_checkin_created`
- `shared_goal_reaction_added`

Status: 🟡 Partial — share/join events exist but names differ; check-ins/reactions pending

### 9) QA checklist (minimum)

- **Shell/canvas integrity**: all join/share flows stay inside the normal shell + margins.
- **Auth interrupt correctness**: start invite while signed out → sign in → returns to same goal canvas and continues.
- **Signals-only**: verify no activity titles/notes leak into any shared feed UI.
- **Invite constraints**: expired code, max uses reached, revoked (if implemented), idempotent accept.
- **Deep links**: invite link open when app is:
  - foreground
  - background
  - killed (cold start)

---

## Open decisions (must answer before build starts)

- **Goal editing permissions**: everyone edits vs owner-only vs “owner can revert.”
- **Streak definition** (if included): “any member checks in” vs “all members check in.”
- **Invite limits**: expiry TTL, max uses (especially for squads), revocation behavior.
- **Naming/copy**: “Share goal” vs “Invite buddy” vs “Start squad” (single surface remains).


