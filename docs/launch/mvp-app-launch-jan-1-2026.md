## Kwilt MVP App Launch (Target: Jan 1, 2026)

This document is the **execution plan** for launching Kwilt on the Apple App Store by **Jan 1, 2026**, with a **working monetization lever** and no launch‑blocking reliability issues.

**Primary roadmap (source of truth):** `docs/value-realization-roadmap.md`  
This launch plan corresponds to **Phase 0 (MVP Launch Readiness)** in the primary roadmap.

It is grounded in the current app implementation:

- Local notifications are implemented via `expo-notifications` in `src/services/NotificationService.ts`.
- Arcs/Goals/Activities are stored locally in `src/store/useAppStore.ts` (Zustand + persistence).
- Arc domain already includes `status: 'active' | 'paused' | 'archived'` (`src/domain/types.ts`), but current UX is largely “create/delete”.
- AI calls are currently made directly from the client to OpenAI in `src/services/ai.ts` (must be changed for a paid/scalable launch).
- Chapters is hidden from primary nav for this release (removed from drawer routes in `src/navigation/RootNavigator.tsx`).

### Linked PRDs (workstreams)

- **Monetization + Paywall**: `docs/prds/monetization-paywall-revenuecat-prd.md`
- **AI Proxy + Quotas**: `docs/prds/ai-proxy-and-quotas-prd.md`
- **Notifications v1.5 (copy + caps + goal nudges)**: `docs/prds/notifications-v1-5-prd.md` (addendum to `docs/notifications-paradigm-prd.md`)
- **Arc/Goal Lifecycle + Limits**: `docs/prds/arc-goal-lifecycle-and-limits-prd.md`
- **Calendar Export (ICS) + Scheduling Model**: `docs/prds/calendar-export-ics-prd.md`
- **Keyboard & Input Safety**: `docs/prds/keyboard-input-safety-prd.md`
- **Growth Flywheel (Evangelism + Shared Goals + Accountability)**: `docs/prds/growth-evangelism-shared-goals-prd.md` (builds on `docs/shared-goals-feature-spec.md`)

### Scope posture (do not paint ourselves into a corner)

- **No accounts required for MVP**: subscriptions are tied to Apple ID (StoreKit/RevenueCat). Accounts remain an optional later layer for shared goals/sync.
- **Server scope is minimal and purpose-built**: the only required backend for MVP is an **AI proxy** (to protect the OpenAI key and enforce quotas).
- **Model evolution is additive**: avoid breaking renames in the data model; introduce new fields (e.g. `scheduledAt`) rather than repurposing ambiguous ones right before launch.

---

## MVP product rules (launch constraints)

### Subscription tiers

- **Free**
  - **1 Arc total** (Arc creation is blocked beyond the first).
  - **3 active Goals per Arc** (active == `Goal.status` is not `completed` and not `archived`).
  - **Unlimited Activities**.
  - **Unlimited Activity reminders** set explicitly via `Activity.reminderAt`.
  - Daily show‑up reminder is available (user-controlled).
- **Pro**
  - **Unlimited Arcs** (and more than one active Arc allowed).
  - **Higher or unlimited Goals per Arc** (exact number defined in Monetization PRD).
  - AI scheduling + calendar export features (see Calendar PRD).

### Non-goals for MVP (explicit cuts)

- Shared goals / social accountability / deep invite mechanics (aspirational; see Growth Flywheel PRD)
- Cross-device sync
- Server push notifications
- Full Google/Microsoft calendar OAuth sync (MVP uses ICS export)
- Chapters (feature stays implemented but hidden from primary UX for this release)

---

## Launch readiness definition (acceptance criteria)

### App Store and purchase readiness

- App Review build includes functional **purchase**, **restore purchases**, and correct entitlement gating.
- App privacy details, privacy policy URL, and support contact are complete in App Store Connect.
- App does not expose an embedded OpenAI API key (AI calls go through proxy).

### Core UX quality bar

- No critical flows are blocked by the keyboard (input is never obscured; user can always see what they’re typing).
- Notification taps deep-link into the correct canvas location while preserving the app shell/canvas structure.
- Free tier limits are enforced consistently at creation points (no “half-created” objects).
- Goal creation Agent Workspace flow is launch-safe (explicit Arc attachment behavior, no invalid goals, consistent manual + AI adoption). Plan: `docs/launch/goal-creation-agent-workspace-refinement.md`

---

## Workstreams and milestones

### Milestone 1 — “Monetization skeleton + gating”

- Implement subscription provider integration (RevenueCat).
- Entitlement store + helpers (`isPro`, `restore`, cached status).
- Paywall UI + upgrade entry points.
- Enforce limits:
  - Free: block creating a second Arc (manual and AI creation flows both show upgrade path).
  - Free: block creating the 4th active Goal within the same Arc.

Owner doc: `docs/prds/monetization-paywall-revenuecat-prd.md`

### Milestone 2 — “AI proxy + quotas”

- Replace direct OpenAI calls from `src/services/ai.ts` with a server proxy.
- Quota enforcement by tier.
- Degraded mode: if proxy unavailable, user gets a safe fallback (templates/cached suggestion) instead of a hard dead-end.

Owner doc: `docs/prds/ai-proxy-and-quotas-prd.md`

### Milestone 3 — “Notifications v1.5”

- Activity reminder notifications include clear copy (Activity + Goal context).
- Add goal-level daily nudge (optional, capped, non-spammy).
- Add lightweight caps/backoff for non-explicit nudges (never cap explicit `reminderAt` reminders).

Owner doc: `docs/prds/notifications-v1-5-prd.md` (and `docs/notifications-paradigm-prd.md`)

### Milestone 4 — “Calendar export MVP”

- Add a consistent scheduling model (`scheduledAt`) for Activities.
- Add “Add to calendar” that exports `.ics` via share sheet.
- Gate as Pro (or freemium teaser) per Monetization PRD.

Owner doc: `docs/prds/calendar-export-ics-prd.md`

### Milestone 5 — “Keyboard + input safety”

- Standardize scroll containers on keyboard-safe primitives.
- Validate the top input-heavy screens (Activity detail, Goal creation, AI chat) meet the bar.

Owner doc: `docs/prds/keyboard-input-safety-prd.md`

---

## Risk register (launch blockers)

- **AI key leakage / uncontrolled costs** if OpenAI calls remain client-side.
- **IAP review rejection** if restore purchases is missing or paywall messaging is misleading.
- **Over-notification** if goal-level nudges ship without caps.
- **Destructive data loss** if “active arc” is implemented by forcing deletes rather than using `Arc.status`.

---

## Post-launch (Jan → Feb) strategic follow-ups

- Growth flywheel rollout (evangelism → lightweight accountability → shared goals) — see:
  - `docs/prds/growth-evangelism-shared-goals-prd.md`
  - `docs/shared-goals-feature-spec.md`
- Apple ecosystem integrations (retention + “glanceable state” + Focus timer reliability):
  - `docs/apple-ecosystem-opportunities.md`
  - Target: Live Activities (Focus countdown), Lock Screen widget, App Intents (Shortcuts), Spotlight indexing
- Server push notifications (only if needed; keep local-first as default)
- Cross-device sync (requires identity)
- Deeper engagement loops (streak save/reactivation) under strict caps


