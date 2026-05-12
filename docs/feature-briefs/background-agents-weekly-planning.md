---
id: brief-background-agents-weekly-planning
title: Background Agents — Weekly Planning Agent
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-make-sense-of-the-season
  - jtbd-recover-when-i-drift-from-an-arc
  - jtbd-trust-this-app-with-my-life
related_briefs:
  - brief-kwilt-phone-agent
  - brief-external-ai-connector
  - brief-kwilt-text-coach
owner: andrew
last_updated: 2026-05-10
---

## Context

The external AI connector makes Kwilt data available inside Claude and ChatGPT, which is strategically good but weakens "more Kwilt AI credits" as the main Pro story. The stronger Pro pillar now lives in [`docs/feature-briefs/kwilt-phone-agent.md`](kwilt-phone-agent.md): trusted follow-through through Kwilt's owned phone-number surface. Text Coach is the SMS-first slice of that parent concept: it captures intentions, prompts at useful times, helps with drafts or next steps, and closes loops. Weekly Planning is a narrower ritual inside the broader follow-through agent concept.

This feature brief defines a future background-agent ritual: a **Weekly Planning Agent** that reviews the week and prepares a small, confirmable set of **Weekly Options** for the week ahead. It connects to Chapters as retrospective input, but it is not a Chapter feature and does not depend on the Plan feature. Chapters remain lookbacks. Phone Agent is the parent follow-through surface; Text Coach is the first SMS slice; Weekly Options is one cadence-based ritual it can trigger or hand off.

## JTBD framing

When a week has ended and the user has lived enough real life for patterns to emerge, they want Kwilt to quietly prepare a few grounded next steps for the week ahead, so they can re-enter the few things that matter without turning reflection into planning homework or trusting an AI to silently reshape their life.

This serves:

- `jtbd-move-the-few-things-that-matter` — the output is proposed Activities and careful Goal adjustments that help existing Arcs move.
- `jtbd-make-sense-of-the-season` — the latest Chapter can inform the plan, while Chapter itself remains retrospective only.
- `jtbd-recover-when-i-drift-from-an-arc` — a weekly ritual can notice quiet Arcs with a gentle re-entry posture.
- `jtbd-trust-this-app-with-my-life` — background automation must be transparent, reversible, calm, and user-confirmed.

## Design

### One sentence

Every week, Pro users can have Kwilt run a background planning ritual that reads recent Activities, Goal/Arc state, drift signals, Text Coach loop-closure evidence, and the latest Chapter, then prepares a small set of **Weekly Options** in a lightweight review surface for the user to accept, edit, defer, or dismiss.

### Product boundary

This remains a separate feature brief because the weekly ritual has its own cadence, surfaces, and success signals. But it is no longer the parent "agentic automation" concept. It should reuse the Phone Agent / Text Coach / permissioned Activity Agent substrate for prompts, standing Activity permissions, loop closure, and action auditing. The connector can later expose proposal read/confirm tools, but Claude/ChatGPT are not the proactive surface.

This is also **not a Chapters extension**. Chapters are retrospective meaning objects. The Weekly Planning Agent may read a Chapter summary as signal, but the proposal container is its own review surface, not the Chapter body and not the Plan canvas.

### User experience

**Setup**

- Pro users see a calm opt-in row in Settings → Kwilt Pro or Text Coach settings: "Prepare weekly options."
- Default cadence: weekly on Sunday morning, local time.
- The setup explains the contract plainly: "Kwilt can prepare suggestions. Nothing is added until you confirm." If the user has already granted Text Coach standing permission to create low-risk Activities, the setup explains whether accepted weekly options can be created automatically.
- Free users may see a one-time preview after their first Chapter, but recurring background runs are Pro.

**Background run**

- The scheduled job gathers:
  - Recent Activities, including unanchored Activities.
  - Active Goals and their recent Activity evidence.
  - Text Coach intentions, follow-ups, and closed loops.
  - Arc drift signals, especially quiet Arcs.
  - Latest published Chapter summary, if one exists.
  - Existing scheduled/future Activities, to avoid duplicate suggestions.
- The agent produces:
  - 2-4 proposed Activities for the coming week.
  - 0-1 Goal proposal or Goal adjustment, only when strongly supported.
  - 0-1 gentle re-entry observation for a quiet Arc.
- The agent does **not** create Arcs, silently anchor Activities, change Forces, generate Chapters, or mark anything complete.

**Weekly Options review**

- The primary surface is a dedicated in-app review flow, inside the existing app shell. The app shell keeps primary navigation and page margins; the app canvas holds the active review.
- This surface is reachable from push, email, widget, Chapter digest, and later desktop/connector entry points. It should not require the user to use the Plan feature.
- The entry says something like: "Kwilt prepared a few options for the week."
- Each proposal is individually actionable:
  - Accept creates or updates the Activity/Goal.
  - Edit opens the existing creation/edit flow with the proposal prefilled.
  - Defer keeps it out of this week without training shame into the copy.
  - Dismiss removes it.
- Weekly Options expire after the week boundary unless the user saves proposals.

**Notifications, email, widget, desktop**

- Push/email should announce availability, not demand action: "Your week is prepared when you want it."
- The weekly Chapter digest can include a separate link: "Review next week's options" only if Weekly Options exist. The email must visually separate retrospective Chapter copy from forward-looking options.
- Widgets should not show proposal counts. At most, they can deep-link to the Weekly Options review with calm copy after the user has opted in.
- Desktop later mirrors the same review surface, not a separate agent console.

**Claude/ChatGPT connector extension**

After the external connector ships, the MCP tool catalog can add proposal tools:

- `list_weekly_options` — read-only, returns pending option summaries.
- `get_weekly_option_set` — read-only, returns proposal details.
- `accept_weekly_option` — write, requires the proposal id and creates the confirmed Activity/Goal.
- `dismiss_weekly_option` — write, marks a proposal dismissed.

The connector is a secondary review interface. It does not run the background ritual and should not assume it can proactively push messages into old Claude/ChatGPT threads. The same underlying action tools should also be callable by Text Coach when a user replies over text.

### Agent policy

The agent may propose:

- New Activities, including unanchored Activities.
- Goal edits or new Goals in `pending_confirmation` state.
- A gentle Arc re-entry prompt.
- Force Actual suggestions only as user-confirmed suggestions.

The agent must not:

- Create or modify Arcs.
- Auto-anchor Activities to Arcs/Goals without confirmation.
- Generate or edit Chapters.
- Produce dashboard summaries, productivity scores, or "optimized week" language.
- Gate capture, even for free users.
- Create a queue of unresolved decisions that feels like admin work.

### Monetization posture

The recurring Weekly Planning Agent is a Pro feature because it uses Kwilt-owned background execution and AI work. The value proposition inherits from Text Coach: **follow-through, not capacity**. Free users can still capture, reflect, and use the external connector; Pro users get Kwilt carrying intentions forward through prompts, options, and loop closure.

Open product question: offer a one-time free preview after the first Chapter or after a 7-day streak, then explain that recurring weekly preparation is part of Pro.

### Anti-pattern guardrails

Reject the design if any of these appear:

- Chapters include future-planning sections.
- A proposal is created as a real Goal/Activity before user confirmation.
- The review surface becomes a dashboard with charts, scores, or proposal counts.
- Copy says "optimize," "crush," "falling behind," or similar productivity-app language.
- A user must accept a proposal to dismiss the surface.
- Capture is blocked or degraded because the user did not configure planning.
- External AI surfaces become the only way to review or accept proposals.

### Launch phases

**Phase 1 — Manual-feeling Weekly Options**

- Background weekly run for opted-in Pro users.
- Dedicated review surface with individual accept/edit/defer/dismiss.
- Reuse Text Coach action tools where possible, especially Activity creation, follow-up scheduling, and action audit logging.
- No connector proposal tools yet.
- No general rules UI.

**Phase 2 — Pro preview and activation**

- One-time free preview trigger, likely after first Chapter or 7-day streak.
- Paywall reason: new `pro_only_weekly_planning_agent` or reuse a broader `pro_only_background_agents` reason if Pro positioning wants room for future rituals.
- Analytics for draft generated, viewed, accepted, edited, deferred, dismissed.

**Phase 3 — Connector read/confirm tools**

- Add proposal read/confirm tools to the MCP server after the core connector is stable.
- Claude/ChatGPT can answer "What did Kwilt prepare for me?" and confirm explicit choices.
- Tool errors reuse existing structured paywall patterns.

**Phase 4 — Text Coach handoff**

- Text Coach can notify the user: "Kwilt prepared a few options for this week. Want me to carry one forward?"
- Accepted options can become text-followed Activities, so Weekly Options does not become a separate queue.

**Phase 5 — Additional rituals, only after evidence**

- Consider drift re-entry, Goal closeout, or Chapter-prep rituals.
- Do not ship an automation rules studio until the single weekly ritual shows strong adoption and low trust risk.

## Success signal

Within 90 days of Phase 1 launch:

- Pro users with Weekly Options have higher next-week Activity creation/completion than comparable Pro users without options.
- At least 35% of generated option sets are reviewed within 72 hours.
- At least 25% of reviewed option sets result in one accepted or edited proposal.
- Dismiss-all rate stays below 40%; higher means the agent is not preparing useful options.
- Notification opt-out and connector revoke rates do not rise meaningfully among users exposed to the ritual.

Qualitative success: in interviews, users describe the feature as "Kwilt helped me re-enter the week" rather than "Kwilt gave me more tasks."

## Open questions

- Should the first free preview trigger after a user's first Chapter, first 7-day streak, or first week with 5+ captured Activities?
- Should the Pro paywall reason be specific (`pro_only_weekly_planning_agent`) or broader (`pro_only_background_agents`)?
- What exact day/time should the default cadence use for users whose configured week starts on Monday?
- Should Weekly Options expire automatically, or remain visible until dismissed?
- Which proposal types are allowed in v1: Activities only, or Activities plus one Goal proposal?

## Related

- [`docs/design-explorations/background-agents-weekly-planning-agent/`](../design-explorations/background-agents-weekly-planning-agent/) — Frame/Diverge/Converge artifacts.
- [`docs/feature-briefs/kwilt-phone-agent.md`](kwilt-phone-agent.md) — parent phone-number agent and follow-through surface.
- [`docs/feature-briefs/kwilt-text-coach.md`](kwilt-text-coach.md) — SMS-first follow-through slice and shared action-tool substrate.
- [`docs/feature-briefs/external-ai-connector.md`](external-ai-connector.md) — connector that can later expose proposal review tools.
- [`docs/growth-loops-strategy.md`](../growth-loops-strategy.md) — Pro positioning in a bring-your-own-LLM world.
- [`docs/growth-loops-execution-plan.md`](../growth-loops-execution-plan.md) — planned sequencing after the external connector.
- [`docs/jtbd/_kwilt-context-primer.md`](../jtbd/_kwilt-context-primer.md) — anti-pattern guardrails.
