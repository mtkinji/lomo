## Backend Services Strategy (Supabase-first)

### Why this doc exists

Kwilt is currently **local-first** and is close to shipping. We now want to add web services for:

- **User accounts** (optional until needed)
- **True collaboration** on shared objects (Goals now; later Arcs + Activities)
- **Focus mode audio** hosting/delivery (and optional Pro-gating later)
- **AI proxy + quotas** (required for production; no OpenAI keys in the client)

This doc proposes a backend architecture that:

- Preserves the fundamental UX layers:
  - **App shell** (nav + gutters) remains stable
  - **Canvas** remains the action surface (no “backend mode” screens)
- Stays compatible with the feature brief posture:
  - **No forced auth for v0** evangelism/sharing
  - **Auth required** when collaboration/sync makes it necessary
- Is **CLI-first** so Cursor can automate setup/migrations/deploy with minimal manual overhead.

---

## High-level recommendation

Use **Supabase as the backend spine**:

- **Postgres + RLS**: best fit for co-ownership, row-level privacy (“shared vs private-to-me”), and role-based write permissions.
- **Realtime**: Postgres change feeds for “other person sees edits instantly”.
- **Auth**: native-friendly OAuth (Sign in with Apple) + device sessions.
- **Edge Functions**: invites, AI proxy, quotas, redirects/links, webhooks.
- **Storage**: focus audio, with a clean path to migrate heavy assets later (R2/S3) without touching the data model.
- **Supabase CLI**: local stack, migrations, function deploy, typegen.

---

## Product posture & non-goals

### Non-negotiables (aligned to existing docs)

- **Local-first, sync-ready** (`docs/ux-flow.md`): core product must still work offline.
- **No forced auth for launch-safe sharing** (`docs/feature-briefs/growth-evangelism-shared-goals.md`, `docs/onboarding-cycle-plan.md`):
  - Share-sheet evangelism can work without an account.
- **True collaboration** (this conversation):
  - Once a user joins/creates shared objects, the system must support realtime edits + conflict posture.
- **AI proxy** (`docs/feature-briefs/ai-proxy-and-quotas.md`):
  - No OpenAI key in the client; server enforces quotas.

### Explicit non-goals for the first backend iteration

- Full “global cloud sync” for *all* personal objects immediately (we can start with shared objects + AI).
- A “friends graph” / social network; start with invite links and memberships.
- Perfect concurrent text editing (CRDT). Start with optimistic concurrency + conflict recovery.

---

## Identity & auth strategy (multi-surface: mobile now, desktop later)

### Requirements

- One canonical account id used by all surfaces (mobile + future desktop).
- Native-appropriate auth: **PKCE OAuth** per device.
- Sessions are **per-device**, but map to the same user. (No need for automatic cross-device sign-in.)

### Recommended approach

- **Supabase Auth** as the identity provider.
- Primary sign-in methods: **Sign in with Apple + Sign in with Google** (intent-gated; only required for collaboration).
- Client posture:
  - Let the user stay **anonymous/local** until they want:
    - collaboration (create/join shared objects), or
    - cross-device sync (future), or
    - server-tied Pro features that must be validated server-side (AI proxy/quota, etc.).

### Anonymous → authenticated migration (important)

We need a stable local identifier for “this install” so we can:

- meter AI usage before login (if we choose to allow it),
- attribute invite link opens (Phase 0),
- later merge local drafts into the user account (Phase 2+).

Recommendation:

- Generate an `installId` (UUID) on first run and store it in secure storage.
- Use it in requests as `x-kwilt-install-id`.
- When a user signs in, the server can associate historical `installId` usage to the user.

---

## Shared objects: data model and permissions (Goals → Arcs → Activities)

### Design principles

- Build a **generic collaboration layer** once and reuse it across object types.
- Prefer “many small rows” over “one big JSON blob”:
  - checklist items, milestones, comments, reactions as separate rows → fewer merge conflicts.
- Use **RLS** for row-level access; keep logic on the server, not just in the client.

### Minimal collaboration abstraction

We standardize on:

- **Membership**: who is part of a shared object and what they can do
- **Role**: co-owner vs collaborator (v1 can start with co-owner only, but schema should allow expansion)
- **Feed**: append-only events for “what happened” (social context + notifications later)
- **Visibility**: “shared to all members” vs “private to me” implemented as separate rows, not hidden fields

### Proposed core tables (conceptual)

- `kwilt_memberships`
  - `id`
  - `entity_type` (enum: `goal | arc | activity | chapter` (future))
  - `entity_id` (uuid)
  - `user_id` (uuid → `auth.users.id`)
  - `role` (enum: `owner | co_owner | collaborator`)
  - `status` (enum: `active | pending | left`)
  - `created_at`, `updated_at`, `left_at`

- `kwilt_invites`
  - `id`
  - `entity_type`, `entity_id`
  - `created_by` (user id)
  - `code` (short token)
  - `expires_at`, `max_uses`, `uses`
  - `created_at`

- `kwilt_feed_events`
  - `id`
  - `entity_type`, `entity_id`
  - `actor_id`
  - `type` (enum: `member_joined | goal_updated | activity_completed | comment_added | reaction_added | checkin_submitted | ...`)
  - `payload` (jsonb)
  - `created_at`

Object tables (initially at least `goals`, later `arcs`, `activities`) can remain “type-specific”; memberships reference them via `(entity_type, entity_id)`.

### RLS policy sketch (conceptual)

- Read:
  - Allowed if requester is an **active member** of the entity.
- Write:
  - Allowed if requester is an active member with a role that grants that action.
  - Example: collaborators can create Activities/check-ins/comments, but cannot edit the goal definition (optional posture).

Note: keep RLS policies simple early; encode nuanced permissions via roles and separate tables, not deep policy code.

---

## Realtime & conflict posture (true collaboration)

### Realtime requirements

- When one member edits a shared object, other members see updates quickly.
- Must support membership changes, comments, reactions, check-ins, and core object edits.

### Recommended implementation

- Use **Supabase Realtime** subscriptions for shared tables:
  - `goals`, `activities`, `kwilt_memberships`, `kwilt_feed_events`, `comments`, `reactions`, etc.
- Client subscribes per “open canvas” scope (Goal detail, Arc detail, Today).

### Conflict handling (v1)

Avoid CRDT complexity initially; use optimistic concurrency:

- Each mutable row has:
  - `updated_at` (server-set)
  - `version` (int, server-incremented)
- Client updates include `expected_version`.
- Server rejects if stale → client refetches and replays changes or prompts.

Guidance:

- For high-conflict free-text fields (goal narrative/description), consider:
  - small field-level edits (separate rows), or
  - later: edit locks / “editing” indicators, or
  - later: document CRDT for long-form text only.

---

## Focus mode audio (hosting + delivery + future gating)

### MVP needs

- Host audio assets
- Stream reliably on mobile (range requests)
- Allow offline caching by the client (download-once behavior)

### Recommended implementation

- Store audio in a Supabase Storage bucket, e.g. `focus-audio`.
- Maintain a metadata table:
  - `audio_tracks` (id, title, duration, file_path, version, is_pro, created_at)
- Access model:
  - Public bucket if no gating needed, OR
  - Private bucket + signed URLs minted via Edge Function if Pro-gated later.

### Future migration option (if needed)

If audio bandwidth/storage costs grow, move object storage to **Cloudflare R2** or S3 while keeping:

- the same `audio_tracks.file_path` semantic (or `provider`, `key` fields)
- the same client API (server mints URLs)

---

## AI proxy + quotas (server-side, production required)

### Requirements (from `docs/feature-briefs/ai-proxy-and-quotas.md`)

- No embedded OpenAI key in the client
- Quota + abuse protection
- Stable response shapes to preserve current UX/tool registry shapes

### Recommended implementation

Implement an Edge Function:

- `POST /v1/ai/chat`
  - validates request (mode, messages, workflowDefinitionId)
  - applies quotas and rate limits
  - calls the model provider
  - returns stable JSON response

### Quota identity (important decision)

Because Kwilt is “no forced auth” early, we need a quota key before login.

Recommended v1:

- Quota key is:
  - `user_id` if logged in, else `install_id` (from header).
- Keep a single “generations” meter (aligned with monetization doc posture).

Schema concept:

- `ai_usage_daily` (date, quota_key, count)
- `ai_usage_monthly` (month, quota_key, count)

### Pro entitlements (server verification posture)

There are two levels:

- **V1 (fastest)**: server accepts a short-lived token minted by an Edge Function that:
  - verifies the client’s RevenueCat entitlement (or receipt) server-side
  - returns `is_pro` claim with expiry
- **V0 fallback (not ideal)**: trust client-provided `isPro` and enforce only coarse caps server-side.

Recommendation:

- If AI costs matter at launch, do **server-verified entitlements** for AI.
- Keep the rest of Pro gating client-side for UX.

---

## Invites and link flows (Phase 0 → Phase 1)

### Phase 0 (launch-safe): share sheet + optional link

From `docs/feature-briefs/growth-evangelism-shared-goals.md`:

- Share message works without an account.
- Optional link:
  - landing page with referral params, OR
  - deep link into app to a generic “Join” screen (later).

Implementation:

- Edge Function `GET /i/:code`:
  - logs `invite_opened`
  - redirects to universal link / app scheme / store fallback.

### Phase 1 (true collaboration): link accept creates membership

- Accepting invite requires sign-in (Apple).
- Edge Function `POST /invites/:code/accept`:
  - validates code + TTL + max uses
  - creates membership row
  - emits feed event (`member_joined`)

Abuse controls:

- rate-limit invite creation and accept by IP/install/user
- TTLs on codes
- optional “block user” later (not MVP)

---

## Client integration plan (React Native / Expo)

### Guiding rule

Preserve the app shell/canvas layering; backend changes should primarily:

- add background sync/realtime subscriptions behind existing canvases,
- add sign-in prompts *only* at high-intent points (create/join shared objects, enable cross-device sync).

### Suggested client modules

- `src/services/backend/supabaseClient.ts`
  - initializes Supabase client (anon key)
  - configures auth session persistence per platform
- `src/services/backend/sharedObjects.ts`
  - membership-aware CRUD for shared goals/arcs/activities
  - helper to subscribe/unsubscribe to realtime channels per canvas scope
- `src/services/backend/invites.ts`
  - create invite, accept invite
- `src/services/backend/audio.ts`
  - list tracks, fetch signed URL (if gated)
- `src/services/backend/aiProxy.ts`
  - calls `/v1/ai/chat`, handles quota errors, retryAt

### Data flow posture (incremental)

- Start by syncing only **shared objects** (server is source of truth for those).
- Keep purely personal objects local until a “cloud sync” milestone.
- When the user converts a personal goal → shared:
  - create a new shared server goal, or “promote” the existing one
  - decide history visibility (from `docs/shared-goals-feature-spec.md`)

---

## CLI-first implementation steps (Cursor-friendly)

### “Cursor can run this” checklist (copy/paste friendly)

This is the minimal path to a working backend spine while keeping the app local-first.

- **Scaffold Supabase**
  - `npx supabase init`
  - `npx supabase start`

- **Create migrations (schema + RLS)**
  - `npx supabase migration new kwilt_shared_objects_v1`
  - Edit the generated SQL to add:
    - `kwilt_memberships`, `kwilt_invites`, `kwilt_feed_events`
    - baseline RLS policies + (optional) helper SQL functions (`is_member`, `member_role`)
  - Apply locally:
    - `npx supabase db reset`

- **Create Edge Functions**
  - `npx supabase functions new invite-create`
  - `npx supabase functions new invite-accept`
  - `npx supabase functions new invite-redirect`
  - `npx supabase functions new ai-chat`
  - Serve locally:
    - `npx supabase functions serve --no-verify-jwt`

- **Generate types**
  - `npx supabase gen types typescript --local > src/types/supabase.ts`

- **Deploy (when ready)**
  - `npx supabase link`
  - `npx supabase db push`
  - `npx supabase functions deploy invite-create invite-accept invite-redirect ai-chat`

### File placement (recommended)

- **Supabase**
  - `supabase/migrations/*` — schema + RLS as SQL migrations
  - `supabase/functions/*` — Edge Functions (invites, AI proxy, signed URLs)
- **Client**
  - `src/services/backend/supabaseClient.ts` — initializes client + auth session persistence
  - `src/services/backend/` — thin domain APIs (`sharedObjects.ts`, `invites.ts`, `aiProxy.ts`, `audio.ts`)
  - `src/types/supabase.ts` — generated DB types

### 0) Repo scaffolding

- Add Supabase project scaffolding at repo root:
  - `supabase/` (migrations, functions)
- Add environment wiring:
  - `.env.local` (local dev)
  - EAS secrets for builds (prod)

### 1) Supabase local development loop

- `supabase init`
- `supabase start`
- `supabase db reset` (as needed)

### 2) Schema + RLS (shared objects foundation)

- Create migrations for:
  - `kwilt_memberships`
  - `kwilt_invites`
  - `kwilt_feed_events`
  - shared comments/reactions/check-ins tables as needed
- Add RLS policies:
  - member read
  - role-based write
- Add helper SQL functions (optional) to keep RLS readable:
  - `is_member(entity_type, entity_id, uid)`
  - `member_role(entity_type, entity_id, uid)`

### 3) Edge Functions

- `supabase functions new invite-create`
- `supabase functions new invite-accept`
- `supabase functions new invite-redirect`
- `supabase functions new ai-chat`
- `supabase functions deploy ...`

### 4) Realtime subscriptions

- Confirm realtime enabled for required tables
- Implement client subscription hooks (per-canvas)

### 5) Focus audio

- Create storage bucket `focus-audio`
- Upload initial tracks
- Add `audio_tracks` table + seed
- Decide public vs signed URLs

### 6) Type safety

- `supabase gen types typescript --local > src/types/supabase.ts`
- Wrap client APIs so feature code doesn’t touch raw tables directly

### 7) Production deploy

- Create Supabase project
- Apply migrations:
  - `supabase link`
  - `supabase db push`
- Deploy functions
- Configure Auth providers (Apple)
- Configure URL allowlists / redirect URIs (mobile + future desktop)

---

## Phased rollout plan (recommended)

### Phase A (launch-critical)

- AI proxy + quotas (Edge Function + minimal usage tables)
- Optional: invite redirect endpoint for share links (even if it only lands on marketing)

### Phase B (true collaboration v1: shared goals)

- Auth (Apple + Google) required for create/join shared goals
- Shared goal CRUD + memberships + realtime
- Feed events + reactions/comments (lightweight)

### Phase C (expand sharing surface)

- Apply the same membership model to Arcs and/or Activities
- Add check-ins, richer feed, notification hooks (server-side push optional later)

### Phase D (cloud sync + desktop readiness)

- Optional: sync personal objects
- Persist workflow instances/timelines server-side (align with `docs/ai-chat-architecture.md` “planned” persistence)

---

## Open decisions (answer before implementing v1)

- **Role posture**: co-owner-only vs co-owner + collaborator (recommended: support both in schema, start co-owner-only in UX).
- **Invite model**: link-only vs email-based invites (start with link).
- **History sharing** on conversion: share all vs from acceptance time forward.
- **AI gating**: allow anonymous AI with install-based quotas vs require sign-in for AI (tradeoff: friction vs cost).


