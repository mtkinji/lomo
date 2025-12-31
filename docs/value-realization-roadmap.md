## Kwilt Product Roadmap – Primary Source of Truth

This doc is the **primary roadmap** for tracking progress toward real user value, launch readiness, and revenue.  
It sits above execution plans and PRDs (e.g. `docs/launch/mvp-app-launch-jan-1-2026.md`, `docs/prds/*`) and should remain the **single source of truth** for “what are we building next, and why?”

Use it as a living document:
- Update checkboxes as work progresses.
- Add links to PRs / issues next to items.
- If a lower‑level doc drifts, fix the lower‑level doc to match this one.

Throughout all phases, **preserve the app shell vs canvas structure** described in `ux-flow.md`:
- App shell = persistent nav + high‑level context.
- Canvas = where agent workflows, forms, and lists actually live.

---

## Roadmap posture (principles)

- **Stable UX surface area**: expand capability via progressive disclosure (e.g. “Send to…”) rather than new top-level navigation.
- **Launch-safe scope**: for the MVP launch, keep server scope minimal (AI proxy + quotas only), stay local-first elsewhere.
- **Identity-first**: Arcs are identity directions; all AI creation flows are anchored to the gold-standard Arc model in `docs/arc-aspiration-ftue.md`.
- **Agent OS**: workflows + tools are the control plane; new capabilities should be expressible as tools/workflows (see `docs/ai-chat-architecture.md`, `docs/agent-os-hardening-checklist.md`).

---

## Phase 0 – MVP Launch Readiness (Target: Jan 1, 2026)

**Goal:** Ship a launch-safe build to the Apple App Store with **monetization**, **cost safety**, and **no launch-blocking reliability issues**, while preserving the app shell + canvas model.

Owner execution plan: `docs/launch/mvp-app-launch-jan-1-2026.md`

### 0.1 Monetization skeleton + gating (RevenueCat)

- [x] Ship purchase + restore + entitlement caching (offline-safe)
- [x] Enforce Free tier limits consistently at creation choke points:
  - [x] Free: **1 Arc total**
  - [x] Free: **3 active Goals per Arc**
- [x] Add canonical upgrade entry points (Settings + limit-triggered affordances)

Owner PRD: `docs/prds/monetization-paywall-revenuecat-prd.md`

### 0.2 AI proxy + quotas (cost + key safety)

- [x] Remove direct OpenAI calls from the client (no embedded key)
- [x] Route AI requests through a minimal proxy with quotas by tier
- [x] Degraded mode UX for quota exceeded / provider unavailable
- [x] Basic observability: request count, latency, error rate, quota rejects

Owner PRD: `docs/prds/ai-proxy-and-quotas-prd.md`

### 0.3 Notifications v2 (system nudges + caps)

- [x] Activity reminders include Activity title + Goal context in copy
- [x] Goal nudges (opt-in or clear opt-out) with strict caps/backoff
- [x] Deep links preserve shell/canvas model (tap → correct canvas)

Owner PRD: `docs/prds/notifications-v1-5-prd.md`

### 0.4 Arc/Goal lifecycle + limits (avoid destructive deletes)

- [x] Arc lifecycle actions (archive/restore) so Free users can manage their single Arc without deleting data ([PR #18](https://github.com/mtkinji/lomo/pull/18))
  - [x] Archive/restore Arc (non-destructive; hidden from main list by default)
- [x] Goal lifecycle actions (archive/restore) in Goal detail ([PR #19](https://github.com/mtkinji/lomo/pull/19))
  - [x] Archive/restore Goal (non-destructive; hidden from main list by default; stops counting toward Free cap)
  - [ ] Mark complete / reopen affordances (deferred)
- [x] Limits enforced at initiation points (manual + AI)
  - [x] Automated lifecycle unit tests (Jest) for arc/goal lifecycle + limits ([PR #18](https://github.com/mtkinji/lomo/pull/18), [PR #19](https://github.com/mtkinji/lomo/pull/19))

Owner PRD: `docs/prds/arc-goal-lifecycle-and-limits-prd.md`

### 0.5 Calendar export MVP (ICS) + scheduling model

- [x] Add `Activity.scheduledAt` (start time) without breaking existing semantics
- [x] “Add to calendar” exports `.ics` via share sheet
- [x] Gate per monetization posture (Pro or freemium teaser)

Owner PRD: `docs/prds/calendar-export-ics-prd.md`

### 0.6 Keyboard & input safety quality bar

- [x] Standardize screen + sheet input handling on keyboard-safe primitives
- [ ] Validate top input-heavy surfaces: Activity detail, Goal creation, AI chat

Owner PRD: `docs/prds/keyboard-input-safety-prd.md`  
Implementation guide: `docs/keyboard-input-safety-implementation.md`

### 0.7 Explicit MVP cuts (do not expand scope pre-launch)

- [x] Keep Chapters implemented but **hidden from primary nav** for launch
- [x] No server push notifications
- [x] No cross-device sync / accounts required for MVP
- [x] No Google/Microsoft OAuth calendar sync (ICS only)
- [x] Shared goals/social accountability beyond “share message” is post-launch

---

## Phase 1 – Agent‑First Core Workflows (post-launch stabilization → expand capability)

**Goal:** A new user can land in the app and, with the Agent’s help, complete a full story arc: **create an Arc → define Goals → adopt an Activity plan** – all without needing hidden expert knowledge.

### 1.1 Arc Creation (Agent‑First)

- [ ] Align FTUE Arc creation to `docs/arc-aspiration-ftue.md` as the canonical model (tap-first, fast, emotionally resonant).
- [ ] Ensure the Agent can propose high-quality Arcs consistent with the gold-standard identity model (`docs/arc-aspiration-ftue.md`).
- [ ] Support **manual Arc creation/editing** (title, narrative, timeframe) in the canvas without the Agent.
- [ ] Show created Arcs clearly in the Arcs tab canvas (cards, narrative preview, key stats).
- [ ] Confirm telemetry exists for: Arc created, Arc edited, Arc deleted/archived.

### 1.2 Goal Creation Under an Arc

- [ ] Implement a clear **Goal creation canvas** within Arc detail (manual first, AI‑assisted second).
- [ ] Wire **AI‑assisted Goal suggestions** (“Ask Kwilt for concrete goals”) using the agent components catalog. Goal prompts should take the parent Arc as an identity anchor and respect the 5‑factor Arc model in `docs/arc-aspiration-ftue.md` (domain of becoming, motivational style, signature trait, growth edge, everyday proud moment), so suggested Goals clearly express progress inside that specific identity direction.
- [ ] Ensure each Goal has: title, description, timeframe, forceIntent vector, status (planned / in progress / completed).
- [ ] Verify Goals surface correctly in both Arc detail and any relevant Today/Chapter views.
- [ ] Track metrics: Goals created per Arc, Goals completed, time from creation → first Activity logged.

### 1.3 Activity Creation & Planning

- [ ] Implement **manual Activity creation** under a Goal (atomic unit of doing).
- [ ] Implement **AI‑generated Activity plans** (“Generate Activities with AI”) consistent with the Activity model (phase, estimate, order, force emphasis), and ensure the AI uses the parent Arc’s identity narrative (per `docs/arc-aspiration-ftue.md`) so Activities feel like concrete ways of living out that Arc, not generic tasks.
- [ ] Ensure Activities created under Goals can be scheduled and surfaced in Today.
- [ ] Add a **quick‑add Activity** path from Today for “loose tasks” not yet tied to a Goal/Arc.
- [ ] Confirm there is a single, coherent **Activity detail / logging surface** (even if lightweight).

### 1.3b Auto‑Schedule Assist (calendar placement, V1)

- [ ] Ship **Auto‑Schedule Assist**: propose a weekly plan and let the user **Preview → Apply** to write time blocks to their calendar and set `Activity.scheduledAt`.
- [ ] Keep Kwilt lightweight: **no new Plan screen** in V1. Treat the **calendar app as the plan**, and add only minimal in-app affordances:
  - Today: compact “Scheduled today” block + quick actions
  - Activities: filter/segment for Scheduled vs Unscheduled
  - Activity detail: Reschedule / Unschedule / Open in calendar
- [ ] Implement device calendar integration (no OAuth) using native calendar access, defaulting to a dedicated “Kwilt” calendar for easy opt-out.
- [ ] Undo + safety semantics: apply creates a change set; undo removes created calendar events and reverts `scheduledAt` for affected activities.

Owner PRD: `docs/prds/auto-schedule-prd.md`

### 1.4 Agent OS hardening (workflows as the control plane)

- [ ] Complete workflow-backed presenters for object creation/editing:
  - [ ] Arc creation presenter
  - [ ] Goal creation workflow + presenter
  - [ ] Formalize the Chat timeline controller contract
  - [ ] Inline edit workflows via `useAgentLauncher`
  - [ ] Tools/syscalls mutation boundary documentation

Owner checklist: `docs/agent-os-hardening-checklist.md`

### 1.5 Shared UI component system (React Native Reusables adapters)

- [ ] Adopt a ShadCN‑style component system for React Native using [`reactnativereusables.com`](https://reactnativereusables.com/).
- [ ] Map Kwilt’s existing design tokens (`colors`, `spacing`, `typography`, `surfaces`) onto the reusable primitives so **shell vs canvas** styling stays intact.
- [ ] Identify and implement a small set of base primitives (e.g., `Button`, `Input`, `Card`, `Sheet`, `Tabs`) and wrap them in Kwilt‑specific components in `src/ui`.
- [ ] Incrementally refactor existing screens to use the new primitives, starting with Today, Arcs, and Chapters canvases.
- [ ] Document patterns for when to use each primitive so future features automatically align with the shared system.

**Value checkpoint:**  
When **a new user can create at least one Arc, 1–3 Goals, and a small Activity plan in a single guided session**, mark Phase 1 as complete.

### 1.6 iOS ecosystem surfaces (retention + glanceability without new navigation)

Strategic doc: `docs/apple-ecosystem-opportunities.md`

- [ ] Establish “glanceable state” layer (App Group-backed shared state) to power extensions
- [ ] App Intents foundation (Shortcuts + widget buttons) for core actions:
  - [ ] Start/End Focus
  - [ ] Open Today
  - [ ] Toggle soundscape
- [ ] Live Activity for Focus (Lock Screen + Dynamic Island) with pause/resume/end
- [ ] Widgets v1:
  - [ ] Lock Screen widget: Start/Resume Focus
  - [ ] Home widget: Next up / Today snapshot
- [ ] Spotlight indexing for Activities (deep link to detail canvas)
- [ ] Optional: Focus Filters v1 (minimal “context” binding; preserve shell/canvas)

---

## Phase 2 – Activity Object & Engagement Model

**Goal:** Make Activities the **atomic unit of value and engagement** – every log should feel meaningful, and users should be gently pulled back into the app via clear “next right things.”

### 2.1 Activity Object Model

- [ ] Finalize the Activity domain model (status, phase, estimate, scheduledDate, actualMinutes, forceIntent/forceActual, notes, parent Goal/Arc).
- [ ] Ensure the model is consistent across: domain types, store, persistence, and AI prompts.
- [ ] Define canonical Activity statuses and transitions (planned → in_progress → done / skipped).
- [ ] Implement local‑first storage for Activities with reliable load/save flows.
- [ ] Add basic **query helpers** for common questions (e.g., Activities for Today, overdue, by Arc/Goal).

### 2.2 Engagement North Star

- [ ] Choose a **primary engagement metric** (e.g., “weekly active planners who log ≥ N Activities per week for ≥ M weeks”).
- [ ] Instrument the app to measure this metric (either locally or via analytics service).
- [ ] Identify **key celebration moments**, such as:
  - First Activity logged.
  - First week with a complete Activity streak.
  - First Goal completed.
- [ ] Design and ship lightweight **celebratory surfaces** (toasts, confetti, copy) that appear inside the canvas but framed by the app shell.
- [ ] Review metrics monthly and adjust thresholds / copy to better match real behavior.

Owner model: `docs/engagement-and-motivation-system.md`

### 2.3 Screens That Drive Repeat Use

- [ ] Tighten the **Today** tab so it is the default daily home (fast, legible, low friction).
- [ ] Ensure it is always easy to:
  - See “what’s on deck” (aligned Activities) vs “loose tasks”.
  - Start, complete, or skip an Activity.
  - Log actual time and `forceActual` with minimal taps.
- [ ] Cut or defer any screens that don’t clearly support the loop:
  - Plan → Do/Log → Reflect → Adjust.
- [ ] Validate that core daily flows (open app → act for 30–60 seconds → close) can be completed without touching deeper settings or rarely used tabs.

### 2.4 Spokes to Other Value Surfaces

- [ ] Ensure **Chapters / reflection** flows feel like a natural extension of daily Activity logging (not a separate product).
- [ ] Add at least one **“export / share” spoke** (e.g., summary email, PDF export, or shareable snapshot of a Chapter).
- [ ] Explore one **service‑oriented spoke** (e.g., coaching, accountability, or weekly email recaps) that leverages existing Activity and Chapter data.
- [ ] Document how these spokes should show up in prompts and UI without overwhelming the primary flows.

**Value checkpoint:**  
When **users can reliably return to the Today tab, log Activities, see small but real progress, and hit a few celebration moments**, mark Phase 2 as complete.

---

## Phase 3 – Transition to Real Services & Revenue

**Goal:** Turn a compelling core experience into a sustainable product by adding a **public face, monetization, and key integrations**, without breaking the agent‑first in‑app UX.

### 3.1 Marketing Site & Top‑of‑Funnel

- [ ] Define the **core narrative** for the marketing site (what problem Kwilt solves, for whom, and how).
- [ ] Design and build a simple marketing site that:
  - Explains Arcs → Goals → Activities → Chapters in plain language.
  - Showcases screenshots that respect app shell + canvas visuals.
  - Includes a clear CTA (e.g., “Get the app” / “Join TestFlight” / “Join waitlist”).
- [ ] Hook marketing CTAs into actual distribution: TestFlight, App Store / Play Store, or waitlist tooling.
- [ ] Add minimal analytics to measure visitors → signups → activations.

### 3.2 Payments / Monetization

- [ ] Decide on the initial **monetization model** (free trial, freemium, subscription tiers).
- [ ] Integrate a payment stack (e.g., App Store / Play Store billing, RevenueCat, or Stripe for web).
- [ ] Define which features are **core free** vs **paid value** (keep core planning loop accessible).
- [ ] Implement in‑app upgrade surfaces that:
  - Live in Settings / subtle upsell moments (never block core flows abruptly).
  - Are orchestrated by the Agent where appropriate (e.g., “Want me to unlock weekly Chapters for you?”).
- [ ] Validate end‑to‑end: from marketing site → install → in‑app upgrade → receipt validation.

### 3.3 Calendar & External Integrations

- [ ] Evolve beyond ICS export:
  - [ ] Optional provider OAuth sync (Google/Microsoft) only when justified
  - [ ] Bi-directional updates (calendar edits reflect back into Kwilt)
  - [ ] Recurrence integration (`repeatRule`/RRULE)
  - [ ] Auto‑Schedule V2+: continuous placement + conflict repair with stability windows and user “locks”
  - [ ] MCP-backed calendar connectors (server-side) so the Agent can call a standard interface:
    - `calendar.freebusy`, `calendar.create_event`, `calendar.update_event`, `calendar.delete_event`

Owner context: `docs/prds/calendar-export-ics-prd.md`
Owner PRD: `docs/prds/auto-schedule-prd.md`

### 3.4 “Send to…” connectors (export + integrations without UI clutter)

- [ ] Standardize “Send to…” as a single outbound surface on relevant Activity types
- [ ] Introduce a connector registry (eligibility + payload + transport)
- [ ] Start with safe fallbacks (copy/share/web links), then deepen integrations behind stable connector IDs

Strategy docs:
- `docs/send-to-connector-strategy.md`
- `docs/mcp-strategic-proposal.md`

**Value checkpoint:**  
When **a stranger can discover Kwilt, install it, complete the core agent‑first workflows, experience real daily value, and optionally pay for deeper reflection or integrations**, mark Phase 3 as complete.

---

## Phase 4 – Ongoing Learning & Product Bets

This phase is intentionally lightweight; it should evolve as usage data arrives.

- [ ] Set up a simple **feedback loop** (in‑app feedback link, short surveys, or occasional interviews).
- [ ] Regularly review logs and metrics to refine:
  - Agent copy and prompts.
  - Activity and Chapter defaults.
  - Engagement and celebration thresholds.
- [ ] Maintain a small, prioritized list of **product bets** (e.g., web dashboard, richer coaching workflows) tied back to the phases above.
- [ ] Keep this document updated as the single place to answer: **“Where are we on the path from prototype to real, paid user value?”**

### 4.1 Growth flywheel (post-launch)

- [ ] Phase 0 (launch-safe): share prompt + share affordance (no accounts required)
- [ ] Phase 1+: shared goals (1:1) with minimal identity (recommended: Sign in with Apple + Google only when needed)
- [ ] Phase 2+: check-ins, reactions, shared feed, AI-assisted “gentle nudges”

Owner PRD: `docs/prds/growth-evangelism-shared-goals-prd.md` (builds on `docs/shared-goals-feature-spec.md`)



