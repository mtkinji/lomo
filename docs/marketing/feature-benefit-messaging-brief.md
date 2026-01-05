## Kwilt — Feature & Benefit Messaging Brief (Marketer Handoff)

**Brand promise:** “Built to help you make extraordinary progress. Kwilt is the best way to reach your goals with AI.”

**What makes Kwilt meaningfully different:** Kwilt is not “tasks + AI.” It’s an opinionated **life architecture system** (Arcs → Goals → Activities → Chapters) with **contextual, governed AI** (mode + tool allowlists) and **gentle motivation loops** (tiny steps, nudges, streaks) that respect attention and agency.

**Important marketing constraint:** preserve the product’s fundamental UX layering in messaging:
- **App shell**: stable navigation + consistent framing.
- **App canvas**: where the main action happens (goals, activities, coaching, reflection).

---

## How to use this doc

- **If you’re writing website copy**: focus on the “Target benefit” and “Claim language” columns, then pick 3–5 proof points from “Credibility notes.”
- **If you’re writing ads**: choose one persona, then choose one “primary benefit” + one “mechanism” (feature) + one “proof.”
- **If you’re writing lifecycle/email**: use the “Trigger moments” section near the end.

---

## Feature inventory (with target benefits)

Each item is labeled:
- **Shipped**: behavior exists in app/code today.
- **Designed / Planned**: specified in docs/PRDs and partially scaffolded, but not fully shipped.

### 1) Life Architecture core (method + objects)

#### 1.1 Arcs (identity directions) — **Shipped**
- **What it is**: Arcs are slow-changing “storylines of becoming” (e.g., Family Stewardship, Product Craft). They provide meaning and a home for goals.
- **Where it shows up**: Arcs list + Arc detail canvas.
- **Target benefit**
  - **Meaningful motivation**: goals feel connected to identity, not guilt.
  - **Clarity**: reduces “too many unrelated goals” by giving users a small set of life domains.
- **Claim language**
  - “Your big storylines of becoming—so your goals actually mean something.”
  - “Identity-first goal setting.”
- **Credibility notes**
  - Defined as the core object model in `docs/life-architecture-model.md`.
  - AI arc creation is tied to an explicit spec and constrained by mode/tooling (`docs/ai-chat-architecture.md`).

#### 1.2 Goals (30–90 day outcomes) — **Shipped**
- **What it is**: Goals are concrete outcomes that express progress in an Arc; intentionally scoped to weeks/months.
- **Where it shows up**: Goals list + Goal detail canvas.
- **Target benefit**
  - **Finish more**: right-sized outcomes reduce overwhelm and increase completion.
  - **Momentum**: goals are “activity-ready” (they imply the next steps).
- **Claim language**
  - “Right-sized 30–90 day goals you can actually finish.”
  - “Turn a big intention into a finishable outcome.”
- **Credibility notes**
  - Research-backed goal quality guidance exists and informs the system (`docs/goal-creation-best-practices.md`).

#### 1.3 Activities (atomic units of real work; the plan) — **Shipped**
- **What it is**: Activities are the smallest meaningful actions; the ordered activity list *is* the plan (no separate plan object).
- **Where it shows up**: Activities list canvas, Activity detail canvas, Goal detail “plan” section.
- **Target benefit**
  - **Execution**: reduces planning-as-procrastination by making “the next step” concrete.
  - **Low friction capture**: can capture first and align later (no blocking).
- **Claim language**
  - “Your plan is just a list of real actions.”
  - “Capture first. Align later.”
- **Credibility notes**
  - This is explicitly the life architecture design (`docs/life-architecture-model.md`).

#### 1.4 Chapters (AI reflection; retrospective narrative) — **Designed / Planned (partially scaffolded)**
- **What it is**: Chapters are AI-generated “lookbacks” over a time window: what happened, what patterns emerged, what forces showed up, what shifted.
- **Where it shows up**: Chapters screen exists; generation experience may be in-progress depending on build.
- **Target benefit**
  - **Meaning-making**: users see their effort as a story, not a backlog.
  - **Insight**: highlights drift (intent vs actual) and where life is going.
- **Claim language**
  - “AI that helps you understand what your life has actually been about.”
  - “Reflection without journaling homework.”
- **Credibility notes**
  - Domain types exist (`Chapter` types in `src/domain/types.ts`), plus explicit methodology (`docs/life-architecture-model.md`).

---

### 2) AI coaching (contextual + governed, not a generic chatbot)

#### 2.1 AI “modes” (job-focused coaching) — **Shipped**
- **What it is**: AI entry points are modes with a clear job (e.g., Arc Coach); not one unbounded assistant.
- **Where it shows up**: Bottom-sheet coaching surfaces inside the app canvas.
- **Target benefit**
  - **Less cognitive load**: user doesn’t have to “prompt engineer” what they want.
  - **Higher-quality outputs**: suggestions are tuned to the specific job.
- **Claim language**
  - “AI that shows up exactly where you need it—focused on the job at hand.”
  - “A coach, not a chatbot.”
- **Credibility notes**
  - Defined in `docs/ai-chat-architecture.md` (modes, allowed tools, launch context).

#### 2.2 Tool allowlists (governance + safety) — **Shipped (architecture)**
- **What it is**: Each AI mode has an explicit list of allowed tools/capabilities; prevents “random bot behavior” and provides a clean path to expand responsibly.
- **Where it shows up**: Underlying AI layer; impacts reliability and product consistency.
- **Target benefit**
  - **Trust**: AI behavior is constrained and predictable.
  - **Quality**: AI actions tie to real domain concepts (Arcs, Goals, Activities).
- **Claim language**
  - “Governed AI: focused capabilities, clear boundaries.”
  - “AI you can trust in your real life.”
- **Credibility notes**
  - Tool registry concept and per-mode allowlists are explicit (`docs/ai-chat-architecture.md`).

#### 2.3 Activity AI (suggest, enrich, tag) — **Shipped**
- **What it is**
  - AI can propose concrete activities and enrich activities with details.
  - AI can suggest activity tags from text.
- **Where it shows up**: Activities canvas + creation flows.
- **Target benefit**
  - **Get unstuck**: turns vague goals into doable next actions.
  - **Better organization**: lightweight metadata helps retrieval and planning.
- **Claim language**
  - “From goal to next actions—in seconds.”
  - “AI that turns intention into a plan you’ll actually do.”
- **Credibility notes**
  - Activities screen includes AI pick/help and AI enrichment hooks (`src/features/activities/ActivitiesScreen.tsx`).

---

### 3) Motivation & follow-through loops (calm persistence)

#### 3.1 “Suggested next step” engine — **Shipped**
- **What it is**: When the user has nothing scheduled, Kwilt highlights one tiny, meaningful next step from their existing goals/activities.
- **Where it shows up**: Activities canvas (and/or daily canvas surfaces depending on build).
- **Target benefit**
  - **Momentum**: eliminates “what should I do today?” paralysis.
  - **Consistency**: makes showing up small and repeatable.
- **Claim language**
  - “Always know what to do next.”
  - “One tiny step—picked for you.”
- **Credibility notes**
  - Implemented via `getSuggestedNextStep` usage (`src/features/activities/ActivitiesScreen.tsx`).

#### 3.2 “AI pick” (one highlighted next Activity) — **Shipped**
- **What it is**: AI highlights one next activity from your list when you don’t have anything scheduled today.
- **Where it shows up**: Activities canvas (“AI pick”).
- **Target benefit**
  - **Decision relief**: one clear choice beats a long list.
- **Claim language**
  - “One clear next move—when you’re not sure what to do.”
- **Credibility notes**
  - Explicitly described in the Activities UI code (“AI pick highlights…”).

#### 3.3 Show-up streaks based on real action — **Shipped (store + wiring), celebrations partially**
- **What it is**: A streak day is defined as “day with ≥1 activity completion” (not just app opens).
- **Where it shows up**: Daily surfaces and engagement logic.
- **Target benefit**
  - **Integrity**: streaks represent real progress.
  - **Motivation**: reinforces identity and consistency without shame.
- **Claim language**
  - “Streaks that count—based on real actions.”
- **Credibility notes**
  - Defined and implemented in the engagement system doc and store wiring (`docs/engagement-and-motivation-system.md`).

#### 3.4 Notifications that respect attention (caps + spacing + backoff) — **Shipped**
- **What it is**: Local notifications include activity reminders and system nudges with:
  - per-day caps,
  - minimum spacing windows,
  - backoff behavior to reduce noise.
- **Where it shows up**: Notification settings + delivered notifications.
- **Target benefit**
  - **Follow-through**: reminders at the right moment.
  - **Calm**: avoids turning into a noisy nag app.
- **Claim language**
  - “Gentle nudges, hard caps.”
  - “Helpful reminders without notification spam.”
- **Credibility notes**
  - `NotificationService` enforces daily caps + spacing (`src/services/NotificationService.ts`).
  - PRD articulates identity-first copy and user control (`docs/notifications-paradigm-prd.md`).

#### 3.5 Celebrations (micro-rewards) — **Shipped (media system optional)**
- **What it is**: Celebration moments can include optional GIF media fetched via a curated, safety-restricted GIPHY integration; always degrades gracefully if unavailable or disabled.
- **Where it shows up**: Milestone dialogs/interstitials (e.g., first Arc/Goal).
- **Target benefit**
  - **Emotional reward**: makes progress feel good, reinforcing return behavior.
  - **Personal preference respected**: can be disabled.
- **Claim language**
  - “Progress that feels rewarding—not just recorded.”
- **Credibility notes**
  - GIPHY integration is curated (G/PG) and optional (`docs/celebration-media-and-giphy.md`).

#### 3.6 Haptics language (subtle, rate-limited, accessible) — **Shipped**
- **What it is**: Centralized haptics tokens that distinguish shell vs canvas interactions and reserve stronger haptics for true outcomes.
- **Where it shows up**: Across completion, confirmations, navigation.
- **Target benefit**
  - **Feels premium + learnable**: the app communicates “that mattered.”
  - **Protects calm**: avoids buzzing.
- **Claim language**
  - (Usually not a headline; best as product-quality proof.) “Delightful feedback that reinforces progress.”
- **Credibility notes**
  - Defined in `docs/haptics-strategy.md` with explicit constraints and accessibility posture.

---

### 4) Social accountability (without oversharing)

#### 4.1 Shared goals (signals-only default) — **Shipped (v1) + Designed expansion**
- **What it is**: Shared goals with invite links and intent-gated sign-in. Default sharing model is “signals-only”: check-ins + lightweight reactions/cheers, not full private activity text by default.
- **Where it shows up**: Goals surfaces, join/invite flows.
- **Target benefit**
  - **Accountability**: harder to silently drop goals.
  - **Support**: encouragement without surveillance.
  - **Privacy**: share progress signals without exposing personal notes.
- **Claim language**
  - “Do goals with someone—without oversharing your life.”
  - “Signals-only accountability by default.”
- **Credibility notes**
  - “Signals-only” is explicitly a product requirement (`docs/terms-and-privacy-requirements.md`).
  - Future expansion ideas exist (`docs/shared-goals-feature-spec.md`), but keep claims aligned to shipped behavior.

---

### 5) Trust, privacy, and responsible AI cost guardrails

#### 5.1 Local-first core + cloud optionality — **Shipped (architecture posture)**
- **What it is**: Core workspace data is on-device by default; cloud services are used for specific opt-in features (AI proxy, sign-in/sharing, attachments, analytics, subscriptions).
- **Where it shows up**: Overall product architecture + policies.
- **Target benefit**
  - **Trust**: users don’t feel like their life is being uploaded by default.
  - **Reliability**: core planning works without being “always-online.”
- **Claim language**
  - “Local-first by design.”
  - “Cloud only when you choose features that need it.”
- **Credibility notes**
  - Explicitly documented in `docs/terms-and-privacy-requirements.md`.

#### 5.2 AI proxy (no provider keys in client) + quotas — **Shipped**
- **What it is**: AI requests go through a server proxy with rate limits and quotas; protects cost and abuse.
- **Target benefit**
  - **Reliability + safety**: consistent controls and governance.
  - **Business clarity**: predictable budgets (Free vs Pro).
- **Claim language**
  - “Responsible AI with real guardrails.”
- **Credibility notes**
  - Proxy and quota behavior described in `docs/ai-credits-and-rewards.md`.

#### 5.3 AI credits + onboarding shielding — **Shipped**
- **What it is**
  - Monthly AI credits (Free vs Pro).
  - Onboarding mode is shielded so users can get through onboarding without spending their monthly credits.
  - Completion reward/top-up mechanics exist when the user takes the first real action.
- **Target benefit**
  - **Value before paywall**: reduces fear of “wasting” AI.
  - **Sustained usage**: clear budget encourages healthy engagement.
- **Claim language**
  - “Get the help you need—without burning your monthly AI budget during onboarding.”
- **Credibility notes**
  - Implemented and documented in `docs/ai-credits-and-rewards.md`.

---

### 6) Location-based “completion offers” (trust-forward prompts)

#### 6.1 Arrive/leave completion offers — **Designed / Planned**
- **What it is**: User attaches a place to an activity and chooses arrive/leave triggers; Kwilt offers a “mark done?” prompt at the natural transition.
- **Target benefit**
  - **Reduces missed completions**: prompts at the moment the behavior ends.
  - **Less manual tracking**: less “did I remember to log it?”
- **Claim language**
  - “Your environment becomes your reminder.”
  - “Mark done at the moment it naturally happens.”
- **Credibility notes**
  - Fully specified in `docs/prds/geolocation-activity-offers-prd.md`.
  - This is explicitly **offer-based** (not auto-complete) to preserve agency and trust.

---

## Methodology mapping (why these features work)

Use this section for “research-backed” messaging and for positioning against generic task apps.

- **Goal-setting theory (Locke & Latham)** → Goals are **specific, challenging, and observable**; right-sized to 30–90 days.
- **Implementation intentions (Gollwitzer)** → Activities and triggers reduce the intention–action gap (“if X, then do Y”).
- **Progress monitoring (Harkin et al.)** → Lightweight completion/progress signals improve attainment without heavy tracking.
- **Self-Determination Theory (Ryan & Deci)** → Identity-first (autonomy/meaning), tiny wins (competence), shared goals (relatedness).
- **Habit formation realism (Lally et al.)** → Repetition in stable contexts; streaks reward consistency but with a calm tone.

Sources are compiled in `docs/goal-creation-best-practices.md`.

---

## Target benefits by persona (message hooks)

### Persona: Overwhelmed high-performer (too many goals, low clarity)
- **Primary benefits**
  - “Know what matters and what to do next.”
  - “Reduce cognitive load; stop spinning.”
- **Features to emphasize**
  - Arcs (focus), suggested next step / AI pick (decision relief), activities-as-plan.

### Persona: Identity builder (meaning-driven, wants coherence)
- **Primary benefits**
  - “Goals that reflect who you’re becoming.”
  - “Progress you can feel.”
- **Features to emphasize**
  - Arcs narrative, Chapters reflection (when ready), celebrations, calm tone.

### Persona: Restart-er (has lapsed before; needs self-compassionate momentum)
- **Primary benefits**
  - “Start small without shame.”
  - “Gentle persistence that brings you back.”
- **Features to emphasize**
  - Tiny steps, streaks based on real action, respectful nudges (caps/backoff).

### Persona: Accountable partner (wants support without surveillance)
- **Primary benefits**
  - “Accountability without oversharing.”
  - “Encouragement that doesn’t feel invasive.”
- **Features to emphasize**
  - Shared goals signals-only default, intent-gated auth, privacy posture.

---

## Objection handling (FAQ-style copy inputs)

### “Is this just another productivity app?”
- **Answer angle**: “No—Kwilt is identity-first life architecture + AI coaching + gentle follow-through loops. It’s designed for meaning and execution, not task volume.”

### “Will it nag me?”
- **Answer angle**: “No—nudges are capped, spaced, and backed off if ignored; you control categories.”

### “Are you uploading my private goals?”
- **Answer angle**: “Kwilt is local-first. Cloud is used only for features you choose (AI assistance, sharing, attachments, subscriptions).”

### “Is the AI safe / reliable?”
- **Answer angle**: “AI is mode-based and tool-governed, with quotas/guardrails. It helps you generate options; you stay in control.”

---

## Trigger moments (best lifecycle moments to market specific features)

- **First-time setup**: “Onboarding AI is shielded—use it freely to set up your first Arc/Goal.”
- **After creating a goal**: “Plan with AI” / “Generate starter activities.”
- **When user has no scheduled work today**: “AI pick” / “One tiny step.”
- **After completing an activity**: celebrate + reinforce identity (“You nudged your Arc forward.”).
- **After a lapse**: self-compassionate restart message + one tiny step.
- **When user wants accountability**: shared goals with signals-only messaging.

---

## Claim hygiene (avoid overpromising)

When writing marketing copy, keep a strict separation:
- **Shipped today**: Arcs/Goals/Activities, AI coaching surfaces, AI pick/suggested step, notification guardrails, credits + onboarding shielding, celebration media system, haptics posture, shared goals (signals-only default posture).
- **Designed / planned**: Chapters as full narrative reflection experience (if not yet fully live), geolocation completion offers, deeper calendar scheduling integrations, expanded multi-user shared planning.

If uncertain whether a feature is fully live in the current release, phrase as:
- “Designed for…”, “Built for…”, “Rolling out…”, or “Coming next…” and ensure product confirms release status.


