## PRD — Growth Flywheel (Evangelism + Social Accountability + Shared Goals)

### Purpose

Layer in an **aspirational growth feature set for launch** that can be built incrementally without forcing premature accounts or heavy backend dependencies:

- **Evangelism**: lightweight sharing that users actually do.
- **Social accountability**: a partner/friend loop that increases follow-through.
- **Shared goals**: a structured version of accountability that fits the existing app shell + goal canvas.

This PRD intentionally defines phases so we can ship “launch-safe” pieces first and grow into richer shared goals later.

### References

- Launch plan: `docs/launch/mvp-app-launch-jan-1-2026.md`
- Existing shared goals spec (high-level): `docs/shared-goals-feature-spec.md`
- Onboarding evangelism hook notes: `docs/onboarding-cycle-plan.md`
- UX constraints: preserve **app shell** + **canvas** layering (`docs/ux-flow.md`, `docs/ui-architecture.md`)

---

## Principles (how we avoid being shouted at)

- **Value-first**: sharing prompts only after the user has created real value (e.g., first goal has activities).
- **One-time prompts**: evangelism prompts should be one-time or “snooze forever” (no repeated nagging).
- **Contextual CTAs**: show “Invite / Share” in the places where it is logically relevant (Goal detail, post-plan-ready).
- **No forced auth for v0**: a user should be able to share *something meaningful* without creating an account.

---

## Phase 0 (Launch-safe): Evangelism + lightweight accountability

### What ships

#### 1) Share prompt (one-time)

Trigger (recommended, aligned to `docs/onboarding-cycle-plan.md`):

- When the onboarding goal’s Activities transition **0 → >0**, show a one-time prompt:
  - “Want a little accountability?”
  - CTA: “Invite a friend”

Share payload (MVP):

- A share sheet message that includes:
  - The goal title (and optionally Arc name)
  - A simple ask: “Check in with me once a day this week”
  - A link placeholder (see below)

#### 2) Share affordance in Goal detail

- Add a “Share / Invite” affordance in the Goal detail header/actions.
- If goal is not “shared” yet, this is framed as accountability (not collaboration).

#### 3) “Accountability without accounts” (v0 link model)

To avoid auth/backend complexity at launch:

- The “invite” can initially be a **share-only** message (no deep join).
- If we want a link, it can be:
  - A simple landing page (marketing site) with “Download Kwilt” and a referral parameter, OR
  - A deep link that opens the app and lands on a generic “Join” screen (Phase 1+).

### What it does *not* include

- No shared editing.
- No shared activity feed.
- No identity graph (friends list).

---

## Phase 1 (Near-term): Shared goals v1 (1:1, minimal identity)

This phase aligns with `docs/shared-goals-feature-spec.md` Phase 1, but makes identity and invites concrete.

### Identity model (minimal)

We need *some* notion of identity to co-own objects:

Option A (recommended): **Sign in with Apple** (optional, only when creating/joining shared goals)

- Keeps core solo product authless.
- Meets Apple requirements cleanly.

Option B: link-based “guest” identity (tokenized)

- Faster to prototype but riskier for abuse and long-term data migration.

### MVP shared goals behaviors

- Create a goal as shared (1:1).
- Invite via link.
- Accept invite to co-own.
- Shared indicator in goals list (“Shared” pill + avatars).

---

## Phase 2+: Accountability depth (what we grow into)

- Check-ins (daily/weekly) per shared goal.
- Reactions / encouragement.
- Shared activity feed.
- AI-assisted “gentle nudge” language (aligned with engagement tone).

---

## Monetization posture (conversion-friendly, not noisy)

Recommended packaging:

- Free: share prompt + share message (Phase 0).
- Pro: shared goals (Phase 1+) and advanced accountability (Phase 2+).

Rationale:

- Sharing is an acquisition lever → keep a lightweight version free.
- Shared goals create ongoing value + cost (sync, infra) → Pro is reasonable.

---

## Analytics (MVP)

- `share_prompt_shown` (context)
- `share_prompt_dismissed`
- `share_initiated`
- `share_completed` (best-effort)
- Later: `invite_link_opened`, `invite_accepted`, `shared_goal_created`

---

## Risks

- Abuse/spam via invites (mitigate with caps and friction in Phase 1).
- Privacy expectations (must be explicit about what is shared).
- Scope creep (keep Phase 0 “share message” small for launch).


