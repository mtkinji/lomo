## PRD — Social Dynamics Evolution (Beyond Shared Goals v1)

### Purpose

Define the incremental path from Kwilt's current **shared-goals v1** infrastructure toward richer social dynamics, culminating in **friend-based milestone celebrations** (inspired by Duolingo's "Your friends congratulated you" moment).

This PRD is the **canonical roadmap** for social feature evolution post-v1. It builds on existing primitives and respects Kwilt's privacy-first, signals-only philosophy.

### References

- Shared goals v1 PRD: `docs/prds/social-goals-auth-prd.md`
- Shared goals feature spec: `docs/shared-goals-feature-spec.md`
- Backend strategy: `docs/backend-services-supabase-strategy.md`
- Engagement system: `docs/engagement-and-motivation-system.md`
- UX constraints: preserve **app shell + canvas** (`docs/ux-flow.md`, `docs/ui-architecture.md`)

---

## Product Vision

Enable Kwilt users to receive **social encouragement on personal milestones** from people they trust, creating a virtuous loop of accountability and celebration that drives sustained engagement.

The target experience:
- You achieve a meaningful milestone (e.g., 30-day streak, goal completion)
- Friends who care about you see it and react
- You receive an aggregated celebration: "Your friends congratulated you!"
- This reinforces your identity and motivates continued progress

---

## Current State (as of Jan 2026)

### Implemented (Shared Goals v1)

| Component | Status | Location |
|-----------|--------|----------|
| Auth (Apple + Google) | ✅ | `src/services/backend/auth.ts` |
| Memberships model | ✅ | `supabase/migrations/20251230000000_kwilt_shared_goals_v1.sql` |
| Feed events schema | ✅ | `kwilt_feed_events` table |
| Check-ins schema | ✅ | `goal_checkins` table |
| Invite create/accept | ✅ | `supabase/functions/invite-*` |
| Join/leave flows | ✅ | `src/features/goals/JoinSharedGoalDrawerHost.tsx` |
| Local streak tracking | ✅ | `useAppStore` (showUp, focus streaks) |
| Celebration system | ✅ | `useCelebrationStore` |

### Not Yet Implemented (v1 scope, pending)

| Component | Status | Notes |
|-----------|--------|-------|
| Check-in composer UI | ⏳ | Schema exists, no client UI |
| Feed display in Goal detail | ⏳ | Schema exists, no client UI |
| Reactions/cheers | ⏳ | Contract defined, not built |
| Realtime feed subscriptions | ⏳ | Optional for v1A |

### Explicitly Out of Scope (v1)

Per `docs/prds/social-goals-auth-prd.md`:
- No "friends graph" / social network
- No public profiles, follower/following, or discovery
- No leaderboards/leagues/XP
- No server push notifications (in-app + local-first acceptable)

---

## Gap Analysis: Duolingo-Style Friend Celebrations

The Duolingo "friends congratulated you" interaction requires layers Kwilt doesn't have yet:

| Layer | Duolingo | Kwilt (current) |
|-------|----------|-----------------|
| Friends graph | Bi-directional follow | Shared-goal memberships only |
| Milestone visibility | Server-tracked, broadcast to friends | Local-only streaks |
| Social actions | "Congratulate" on friend milestones | Reactions on shared-goal check-ins (not built) |
| Celebration aggregation | Modal showing N friends who reacted | Single-user celebration modal |

---

## Proposed Evolution Phases

### Phase 2A: Complete Signals-Only Foundation

**Goal**: Ship the remaining v1 shared-goals features to validate social mechanics before expanding scope.

**Scope**:
- Check-in composer UI in Goal detail canvas
- Feed display showing recent check-ins + join events
- Reactions (cheers) on check-ins
- Realtime subscription per-goal (optional but recommended)

**Success metrics**:
- % of shared goals with ≥1 check-in in first 7 days
- Check-in → reaction rate
- Retention lift for users with shared goals vs. solo

**Why first**: These mechanics prove that users want social accountability signals before investing in a broader friends system.

---

### Phase 2B: Server-Side Milestones

**Goal**: Move streak/milestone tracking to the server so achievements can be visible beyond the local device.

**Current state**: Streaks are tracked locally in `useAppStore`:
- `lastShowUpDate`, `currentShowUpStreak`
- `lastCompletedFocusSessionDate`, `currentFocusStreak`, `bestFocusStreak`

**Proposed change**: Mirror significant milestones to the server.

**New schema**:

```sql
create table if not exists public.user_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_type text not null,
  milestone_value int not null,
  achieved_at timestamptz not null default now(),
  -- Denormalized payload for flexibility (e.g., goal_id for goal completions)
  payload jsonb not null default '{}'::jsonb
);

create unique index if not exists user_milestones_unique
  on public.user_milestones(user_id, milestone_type, milestone_value);
```

**Milestone types**:
- `streak_7`, `streak_30`, `streak_100`, `streak_365`, `streak_1000`
- `goal_completed`
- `focus_streak_7`, `focus_streak_30`

**Feed event**: When a milestone is achieved, optionally create a `kwilt_feed_events` row (type: `milestone_achieved`) for visibility to friends (Phase 3+).

**Privacy posture**: Milestones are private by default. Visibility is controlled by friendship settings (Phase 3).

---

### Phase 3: Friends Graph (Lightweight)

**Goal**: Enable bi-directional friend relationships separate from shared-goal memberships.

**Key design decisions**:

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Relationship model | Bi-directional (mutual) vs. follow (one-way) | **Bi-directional** (feels more intimate, fits Kwilt's accountability vibe) |
| Discovery | Public search vs. invite-only | **Invite-only** (preserves privacy, aligns with shared-goals pattern) |
| Visibility default | Opt-in vs. opt-out | **Opt-in** (friends see milestones only if you enable it) |

**Data model options**:

**Option A**: Reuse `kwilt_memberships` with `entity_type = 'friendship'`
- Pro: Reuses existing RLS patterns
- Con: Semantic mismatch (friendship isn't really "membership in an entity")

**Option B** (recommended): Dedicated `kwilt_friendships` table

```sql
create table if not exists public.kwilt_friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  initiated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  -- Ensure no duplicate friendships (order-independent)
  constraint kwilt_friendships_unique check (user_a < user_b)
);

-- Helper to normalize user pair ordering
create or replace function public.kwilt_normalize_friendship_pair(a uuid, b uuid)
returns table(user_a uuid, user_b uuid)
language sql
immutable
as $$
  select least(a, b), greatest(a, b);
$$;
```

**Invite flow**: Reuse existing `kwilt_invites` infrastructure with `entity_type = 'friendship'` and `entity_id = NULL` (or a generated friendship placeholder ID).

**New surfaces**:
- "Add friend" action (invite-only, generates a link)
- Friends list (simple roster, not a social feed yet)
- Friend request accept/decline

---

### Phase 4: Friend Reactions on Milestones

**Goal**: Friends can congratulate you on achievements.

**Mechanics**:

1. When you achieve a milestone (Phase 2B), it creates a `kwilt_feed_events` row:
   - `entity_type = 'user'`
   - `entity_id = user_id`
   - `type = 'milestone_achieved'`
   - `payload = { milestoneType, milestoneValue, ... }`

2. Friends see your milestone in their "Friends Activity" surface (if you've opted in to sharing).

3. Friends can react (cheer, clap, heart) — creates a reaction row or feed event.

4. Reactions aggregate and are delivered to you.

**Visibility controls**:
- Global toggle: "Share my milestones with friends" (default: off)
- Per-milestone-type toggles (optional, future): "Share streaks but not goal completions"

**New surfaces**:
- Friends activity feed (new canvas in app shell)
- "Congratulate" action on friend milestones
- Notification surface for received reactions

---

### Phase 5: Aggregated Social Celebrations

**Goal**: The Duolingo-style modal showing "Your friends congratulated you!"

**Implementation**:

Extend `useCelebrationStore` to support a new `social` celebration type:

```typescript
type SocialCelebrationMoment = CelebrationMoment & {
  kind: 'friend_congrats';
  friends: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
  milestoneType: 'streak' | 'goal_completed' | 'focus_streak';
  milestoneValue: number;
};
```

**UI components**:
- Clustered friend avatars (up to 3 shown, "+N" overflow)
- Headline: "Your friends congratulated you!"
- Subheadline: "for your 30-day streak!"
- Celebratory accents (confetti, emojis)
- CTA: "Keep it going" / "Say thanks"

**Trigger logic**:
- When the app opens (or on milestone achievement), check for pending friend reactions
- If ≥1 reaction exists, queue a `friend_congrats` celebration
- Aggregate all pending reactions into one celebration (don't spam)

---

## Dependencies and Sequencing

```
Phase 2A (Signals-Only UI)
    │
    ▼
Phase 2B (Server Milestones)
    │
    ▼
Phase 3 (Friends Graph)
    │
    ▼
Phase 4 (Friend Reactions)
    │
    ▼
Phase 5 (Aggregated Celebrations)
```

**Critical path**: Phase 2B (server milestones) is required before friends can see your achievements. Phase 3 (friends graph) is required before non-goal-members can react.

---

## Open Questions (to resolve before Phase 3)

1. **Bi-directional vs. follow**: Does Kwilt want mutual friendships (both accept) or asymmetric following? Recommendation: bi-directional for intimacy.

2. **Discovery scope**: Invite-only keeps privacy high but limits network growth. Is this acceptable for v1 of friends?

3. **Notification channel**: Friend reactions likely need push notifications to feel timely. When do we invest in server push?

4. **Privacy controls granularity**: Per-friend visibility settings vs. global "share milestones" toggle?

5. **Abuse vectors**: What happens if someone spams friend requests? Rate limits? Block list?

---

## Non-Goals (this roadmap)

- Public profiles or discoverability
- Leaderboards / competitive XP
- Group chats or messaging
- Activity content sharing (titles, notes) — remains opt-in per shared-goals contract

---

## Success Metrics (North Stars)

| Metric | Phase | Target |
|--------|-------|--------|
| Shared goal check-in rate | 2A | ≥50% of shared goals have check-in in week 1 |
| Check-in → cheer rate | 2A | ≥30% of check-ins receive a reaction |
| Friend adoption rate | 3 | ≥20% of signed-in users add a friend |
| Milestone celebration engagement | 5 | ≥60% of friend-congrats celebrations tapped (not auto-dismissed) |

---

## Implementation Checklist

### Phase 2A — Signals-Only UI

- [ ] Create `src/services/checkins.ts` (submit, fetch)
- [ ] Create `src/services/reactions.ts` (add, fetch)
- [ ] Add check-in composer to Goal detail canvas
- [ ] Add feed section to Goal detail canvas
- [ ] Add reaction buttons to feed items
- [ ] (Optional) Add realtime subscription for feed updates
- [ ] Analytics: `shared_goal_checkin_created`, `shared_goal_reaction_added`

### Phase 2B — Server Milestones

- [ ] Create migration: `user_milestones` table
- [ ] Create edge function: `milestone-record` (or client-direct with RLS)
- [ ] Wire local streak recording to also call server
- [ ] Define milestone thresholds and types
- [ ] (Optional) Create `kwilt_feed_events` for milestones

### Phase 3 — Friends Graph

- [ ] Create migration: `kwilt_friendships` table
- [ ] Create edge functions: `friend-invite`, `friend-accept`, `friend-list`
- [ ] Add `entity_type = 'friendship'` support to `kwilt_invites`
- [ ] Create `src/services/friendships.ts`
- [ ] Create Friends list UI surface
- [ ] Create Add Friend flow (invite link generation)
- [ ] Create Friend request accept flow

### Phase 4 — Friend Reactions

- [ ] Define visibility controls schema + UI
- [ ] Extend feed events to support `entity_type = 'user'`
- [ ] Create Friends Activity feed canvas
- [ ] Create Congratulate action
- [ ] Wire reactions to create aggregatable events

### Phase 5 — Aggregated Celebrations

- [ ] Extend `useCelebrationStore` with `SocialCelebrationMoment`
- [ ] Create aggregation logic (batch pending reactions)
- [ ] Create celebration modal UI for friend congrats
- [ ] Wire app open to check for pending reactions
- [ ] Add "Say thanks" / response action (optional)

---

## Appendix: Duolingo Reference

The inspiration for this roadmap is Duolingo's friend celebration moment:

- **Trigger**: User achieves a significant streak milestone (e.g., 1000 days)
- **Friends see**: A notification that their friend hit the milestone
- **Friends act**: Tap "Congratulate" to send a cheer
- **User sees**: A modal aggregating all friends who reacted, with celebratory UI (avatars, confetti, emojis)
- **CTA**: "Keep it going" — drives continued engagement

This moment is powerful because it combines:
1. **Social proof** (friends care about your progress)
2. **Celebration** (emotional reward)
3. **Identity reinforcement** ("I'm the kind of person who shows up")
4. **Forward momentum** (CTA to continue)

Kwilt's version should feel equally warm and motivating while respecting the app's privacy-first, signals-only philosophy.

