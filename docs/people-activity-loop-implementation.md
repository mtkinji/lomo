# People Activity Loop (Duolingo-style) — Implementation Spec

This doc turns the remaining items in `docs/prds/social-dynamics-evolution-prd.md` (Phase 2B optional + Phase 4–5) into an **integrated system** with concrete contracts.

## Goal

Ship the Duolingo-style loop:

1. **Milestone achieved** (server-recorded, deduped)
2. **People can see it** (follower-gated visibility + blocks + opt-in sharing)
3. **People can congratulate** (one-tap reactions)
4. **Recipient gets an aggregated celebration** (“People congratulated you!”) with strong batching/caps

Non-goal: exposing shared-goal content via follows. Shared-goal membership remains the only gate for goal-level signals.

## System boundaries (non-negotiable)

- **Shared Goals layer**:
  - Audience: goal members only
  - Artifacts: check-ins + goal feed events + reactions on check-ins
- **People (follows) layer**:
  - Audience: followers / mutuals (depending on visibility settings)
  - Artifacts: *user-level* milestones + reactions on milestones + aggregated celebration
- Following must **never** imply access to goal details, activity titles, or goal feeds.

## Primitives we already have

- **Follower graph + blocks**: `supabase/migrations/20260115000002_kwilt_follows.sql`
- **Follow invite flow**: `supabase/functions/follow-invite-{create,accept}` + `src/services/follows.ts`
- **Server milestones table**: `supabase/migrations/20260115000000_kwilt_user_milestones.sql` + `src/services/milestones.ts`
- **User-level feed events allowed in schema + follower visibility policy**:
  - `entity_type in ('goal','user')` and `Followers can read user feed events` policy

## Missing system pieces (what this doc specifies)

- **A. User-level milestone feed events** (`kwilt_feed_events` rows for milestones)
- **B. Visibility controls** (share milestones off by default, optional mutuals-only)
- **C. People Activity feed surface** (read-only list + react)
- **D. Milestone reactions storage + read models**
- **E. Aggregation + delivery** (in-app modal and optional notification strategy)

---

## A) User-level milestone feed events

### Why

`user_milestones` is the canonical record, but Duolingo-like systems need a **broadcastable event stream** to:

- render a feed without complex inference
- attach reactions to an event id
- aggregate “people congratulated you” per milestone

### Event shape (stored in `kwilt_feed_events`)

- `entity_type`: `'user'`
- `entity_id`: `<target_user_id>`
- `actor_id`: `<target_user_id>` (the achiever is the actor)
- `type`: `'milestone_achieved'`
- `payload`:
  - `milestoneType`: string (e.g., `streak_30`, `focus_streak_7`, `goal_completed`)
  - `milestoneValue`: number
  - `milestoneId`: uuid (optional reference to `user_milestones.id`)
  - `achievedAt`: ISO string (optional)

### Idempotency / dedupe

Must ensure **one event per (user, milestoneType, milestoneValue)**. Recommended patterns:

- Add a unique constraint on `kwilt_feed_events` using a computed key in payload (not ideal), or
- Prefer a dedicated `user_milestone_events` table, or
- Use an edge function to “insert-if-not-exists” (best-effort) while keeping `user_milestones` unique as the hard guard.

MVP recommendation: **edge function** `milestone-event-record` that:

- upserts `user_milestones` (already unique)
- inserts a `kwilt_feed_events` milestone event only if one doesn’t exist yet for that milestone

---

## B) Visibility controls (Duolingo-style safety default)

### Product decisions (recommended defaults)

- **Default**: milestone sharing **OFF** (opt-in), per `social-dynamics-evolution-prd`.
- **Option**: “share with mutuals only” vs “share with followers”
- Blocks always override visibility.

### Proposed schema

Add a profile-level setting:

- `profiles.share_milestones_with_followers` boolean default false
- optional future:
  - `profiles.share_milestones_scope` enum (`off`, `mutuals`, `followers`)

### Enforcement

Enforcement must be in **RLS / DB function** (not client):

- Extend `kwilt_can_view_user_feed(viewer, target)` to include the target’s share setting.

---

## C) People Activity feed surface

### UX goals (Duolingo implication)

- feed is a **reaction surface**, not a content surface
- short, repetitive, “safe” content
- one-tap “congrats”

### Data fetch contract (MVP)

- Query `kwilt_feed_events` where:
  - `entity_type = 'user'`
  - `type in ('milestone_achieved')`
  - `entity_id in (followed user ids)` or use a server-side view/function
- Enrich with:
  - target user profile (`profiles`)
  - reaction summary for the current viewer

### Ranking / caps (recommended)

- Show newest first, but apply:
  - per-user frequency cap (e.g., max 1 milestone/day per followed user)
  - “mutuals-first” ranking variant (future experiment)

---

## D) Reactions on milestone events

### Constraints (Duolingo implication)

- constrained set of positive reactions
- toggle/idempotent
- supports aggregation

### Storage options

**Option 1 (event-based, like goal reactions):** store reactions as `kwilt_feed_events` rows:

- `entity_type='user'`, `entity_id=<target_user_id>`
- `type='milestone_reaction'`
- `actor_id=<reactor_user_id>`
- `payload.targetEventId=<milestone_event_id>`
- `payload.reaction=<type>`

Pros: reuse patterns. Cons: summaries require grouping/filtering.

**Option 2 (dedicated table, recommended long-term):** `user_feed_reactions`

- `(target_event_id, reactor_id)` unique
- `reaction_type`, timestamps

Pros: easy aggregation + deletes. Cons: new schema.

MVP recommendation: **Option 2** if you expect Phase 5 aggregation soon; otherwise Option 1 is acceptable for speed.

---

## E) Aggregation + delivery (“People congratulated you!”)

### Aggregation key

Aggregate by:

- `milestone_event_id` (preferred) OR
- `(milestoneType, milestoneValue, achievedAt-window)`

### Display rules (best practice)

- show at most **1 social celebration per app open**
- never interrupt FTUE / other overlays (reuse `useCelebrationStore` conflict rules)
- avatar clustering: show top 3 + “+N”

### Persistence

Need a small “inbox” / cursor so we don’t re-show old congrats:

- `last_seen_social_congrats_at` per user (server) OR
- local device cursor keyed by reaction ids (good enough for MVP, but not cross-device)

---

## Analytics (minimum viable)

Add or ensure these are emitted:

- `milestone_recorded` / `milestone_record_failed`
- `people_list_viewed`
- `follow_invite_created` / `follow_invite_shared` / `follow_invite_accepted`
- `milestone_feed_viewed` (new)
- `milestone_reaction_added` / `milestone_reaction_removed` (new)
- `people_congrats_modal_shown` / `people_congrats_modal_dismissed` / `people_congrats_modal_cta` (new)

---

## Test plan (quick, high-signal)

- **Follow loop**: create follow invite → accept via universal link → confirm follower appears in People UI
- **Milestone event loop**: hit a known milestone → confirm `user_milestones` row → confirm `kwilt_feed_events` milestone event exists
- **Visibility**: sharing OFF → follower sees nothing; sharing ON → follower sees milestone item; block → visibility suppressed both ways
- **Reaction + aggregation**: follower reacts → achiever gets aggregated modal on next open


