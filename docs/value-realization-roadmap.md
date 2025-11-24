## LOMO Product Roadmap – Actual User Value Realization

This doc is the **primary checklist** for tracking progress toward real user value and revenue.  
It sits above implementation docs like `ux-flow.md`, `tasks-roadmap.md`, and `agent-onboarding-flow.md` and should stay **source‑of‑truth for “are we delivering value yet?”**  

Use it as a living document:
- Update checkboxes as work progresses.
- Add links to PRs / issues next to items.
- If a lower‑level doc drifts, fix the lower‑level doc to match this one.

Throughout all phases, **preserve the app shell vs canvas structure** described in `ux-flow.md`:
- App shell = persistent nav + high‑level context.
- Canvas = where agent workflows, forms, and lists actually live.

---

## Phase 1 – Agent‑First Core Workflows

**Goal:** A new user can land in the app and, with the Agent’s help, complete a full story arc: **create an Arc → define Goals → adopt an Activity plan** – all without needing hidden expert knowledge.

### 1.1 Arc Creation (Agent‑First)

- [ ] Define “happy path” Arc creation UX (from FTUE + Arcs tab), aligned with `ux-flow.md`.
- [ ] Ensure the Agent can **propose starter Arcs** from a small amount of user input (onboarding flow).
- [ ] Support **manual Arc creation/editing** (title, narrative, timeframe) in the canvas without the Agent.
- [ ] Show created Arcs clearly in the Arcs tab canvas (cards, narrative preview, key stats).
- [ ] Confirm telemetry exists for: Arc created, Arc edited, Arc deleted/archived.

### 1.2 Goal Creation Under an Arc

- [ ] Implement a clear **Goal creation canvas** within Arc detail (manual first, AI‑assisted second).
- [ ] Wire **AI‑assisted Goal suggestions** (“Ask LOMO for concrete goals”) using the agent components catalog.
- [ ] Ensure each Goal has: title, description, timeframe, forceIntent vector, status (planned / in progress / completed).
- [ ] Verify Goals surface correctly in both Arc detail and any relevant Today/Chapter views.
- [ ] Track metrics: Goals created per Arc, Goals completed, time from creation → first Activity logged.

### 1.3 Activity Creation & Planning

- [ ] Implement **manual Activity creation** under a Goal (atomic unit of doing).
- [ ] Implement **AI‑generated Activity plans** (“Generate Activities with AI”) consistent with the Activity model (phase, estimate, order, force emphasis).
- [ ] Ensure Activities created under Goals can be scheduled and surfaced in Today.
- [ ] Add a **quick‑add Activity** path from Today for “loose tasks” not yet tied to a Goal/Arc.
- [ ] Confirm there is a single, coherent **Activity detail / logging surface** (even if lightweight).

### 1.4 Shared UI Component System (ShadCN via React Native Reusables)

- [ ] Adopt a ShadCN‑style component system for React Native using [`reactnativereusables.com`](https://reactnativereusables.com/).
- [ ] Map LOMO’s existing design tokens (`colors`, `spacing`, `typography`, `surfaces`) onto the reusable primitives so **shell vs canvas** styling stays intact.
- [ ] Identify and implement a small set of base primitives (e.g., `Button`, `Input`, `Card`, `Sheet`, `Tabs`) and wrap them in LOMO‑specific components in `src/ui`.
- [ ] Incrementally refactor existing screens to use the new primitives, starting with Today, Arcs, and Chapters canvases.
- [ ] Document patterns for when to use each primitive so future features automatically align with the shared system.

**Value checkpoint:**  
When **a new user can create at least one Arc, 1–3 Goals, and a small Activity plan in a single guided session**, mark Phase 1 as complete.

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

- [ ] Define the **core narrative** for the marketing site (what problem LOMO solves, for whom, and how).
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

- [ ] Define the **role of calendar integration** (e.g., project time‑boxing, reminders, or logging).
- [ ] Implement calendar permissions and safe, respectful defaults (read vs write).
- [ ] Map concrete flows, such as:
  - Push selected Activities into the user’s calendar.
  - Pull relevant calendar events into Today as candidate Activities.
- [ ] Ensure calendar interactions still respect shell/canvas patterns and don’t overwhelm the core UX.
- [ ] Document trade‑offs and edge cases (time zones, all‑day events, reschedules).

**Value checkpoint:**  
When **a stranger can discover LOMO, install it, complete the core agent‑first workflows, experience real daily value, and optionally pay for deeper reflection or integrations**, mark Phase 3 as complete.

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


