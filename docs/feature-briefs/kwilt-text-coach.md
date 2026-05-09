---
id: brief-kwilt-text-coach
title: Kwilt Text Coach — text-native follow-through agent
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-move-the-few-things-that-matter
  - jtbd-trust-this-app-with-my-life
related_briefs:
  - brief-background-agents-weekly-planning
  - brief-external-ai-connector
owner: andrew
last_updated: 2026-05-08
---

## Context

Kwilt-keep explored a compelling adjacent wedge: an SMS-first "relational chief of staff" that remembers meaningful details, prompts at the right time, helps the user act, and closes the loop. That pattern is closer to a monetizable WOW than "more AI credits" or a passive weekly suggestions surface. The opportunity is to make this Kwilt-native: a text-based follow-through agent that writes into Kwilt's Activity/Goal/Arc/Chapter system instead of becoming a separate memory product.

The strategic move: **Free Kwilt helps me capture and reflect. Pro Kwilt helps me follow through.**

## Target audience

Primary audience: `audience-burned-out-productivity-power-users` — people who have already tried enough productivity systems to know that the hard part is not making another list. Text Coach matters for this audience because it reduces system upkeep at the exact moment an intention appears.

This work also has a strong later fit with `audience-ai-native-life-operators`, but Marcus is the right first lens: if Text Coach feels like another agent console, another notification stream, or another place to manage prompts, it fails the core Kwilt promise.

## Representative persona

**The overextended intention-holder** has real intentions that appear in fragments: while driving, after a text thread, during a hard conversation, after reading a Chapter, or in a quick "I should..." moment. They want to become someone who follows through, especially for people and identity-bearing commitments, but managing reminders and lists feels like a second job.

Representative persona: **Marcus**, adapted to the Text Coach situation. He is not asking for more planning power. He is asking for Kwilt to help a small number of meaningful intentions survive long enough to become real action.

## Aspirational design challenge

How might we help the overextended intention-holder carry meaningful intentions into trusted follow-through through a text-native Kwilt agent, while preserving capture-first, explicit permission, privacy, and the user's authorship over external actions?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Text Coach should help the few meaningful commitments move in real life, not increase the amount of material Marcus has to manage.

## Job flow step

Job flow: `job-flow-marcus-move-the-few-things-that-matter`.

Primary underserved steps:

- **Decide what to do next** — current delivery score 3. Plan and recommendations help, but the "what now?" moment is not yet the spine.
- **Capture progress without maintaining the system** — current delivery score 4. Capture is strong in-app; Text Coach extends it into the moments where the app is not open.

Gap addressed: Marcus needs stronger decision relief and lighter follow-through. AI help must reduce maintenance, not create another planning layer.

## JTBD framing

When the user notices something they mean to do, they want to text Kwilt and trust it to remember, prompt, help them act, and close the loop later, so the person they want to become does not depend on constantly opening an app and managing themselves.

This feature brief serves:

- `jtbd-carry-intentions-into-action` — the primary job. Text Coach carries fragile intentions across time, action help, and loop closure.
- `jtbd-capture-and-find-meaning` — text becomes a first-class capture surface; intentions and outcomes enter Kwilt without app ceremony.
- `jtbd-move-the-few-things-that-matter` — captured intentions become Activities and evidence of movement on meaningful Goals/Arcs.
- `jtbd-trust-this-app-with-my-life` — text prompts and agent actions are high-trust; permissions, pauses, receipts, and logs must be obvious.

## Design

### One sentence

Kwilt Text Coach gives Pro users a number they can text; Kwilt captures intentions, creates or proposes Activities, follows up at useful times, helps with drafts/next steps, and logs loop closure through simple replies.

### Working v1 beta decisions

These are the current product bets for Sprint 6. They can change before engineering starts, but they give the concept enough shape to plan against:

1. **Text is the first high-WOW surface.** Build the system as channel-abstracted where possible, but prove the feeling over SMS/text first. In-app messaging can be a fallback or future mirror; it is not the launch wedge.
2. **One-user, private-by-default.** Relational examples should shape the launch because they create the strongest "Kwilt helped me show up" moments, but v1 is not a family workspace, CRM, or shared household memory system.
3. **Activities are the action boundary.** Standing permission can cover Activity creation, follow-up scheduling, snoozing, and loop-closure logging. Goal changes require confirmation. Arcs are read as context and never silently created or reshaped.
4. **Capture stays generous. Follow-through is Pro.** A free user should not feel punished for texting Kwilt a meaningful intention. The paid value is Kwilt carrying that intention forward: proactive follow-ups, standing Activity permission, drafts, and loop closure.
5. **Draft-first for external action.** Kwilt may draft a text, email, or next step for the user. It does not send messages to other people in v1.
6. **No durable Person model in the first slice unless evidence forces it.** Relational details can start as Activity context and lightweight extracted metadata. A real Person/Memory model is a later expansion only if the beta proves repeated relational demand.

### What it is

Text Coach is a Kwilt-native action surface, not a separate chatbot product. It uses SMS/text as the first high-WOW interface, but the durable objects are Kwilt objects:

- **Activities** for concrete next actions and completed outcomes.
- **Goals** as optional context or proposed changes.
- **Arcs** as stable identity context, never silently created or reshaped.
- **Chapters** as retrospective consumers of the evidence Text Coach creates.

### V1 beta scope

**In scope**

- Phone/text opt-in tied to an authenticated Kwilt account.
- Plain-language Text Coach settings for permissions, quiet hours, daily caps, and pause/STOP handling.
- Inbound intention capture from natural-language text.
- Low-risk Activity creation under standing permission, or a pending Activity suggestion when permission is absent or confidence is low.
- Follow-up scheduling and reply handling for `done`, `snooze`, `pause`, `not relevant`, and `change time`.
- Drafting help for relational or activation-heavy actions.
- Action audit logs that explain what Kwilt created, prompted, changed, or logged.
- Chapter input from closed text loops, clearly marked as evidence from Text Coach.

**Out of scope for v1**

- Autonomous messages to third parties.
- Contact syncing, thread ingestion, or group-thread memory.
- Shared household membership or role-based privacy.
- A general automation rules builder.
- Calendar write access, unless the user later grants a separate calendar permission.
- A standalone chatbot UI that competes with the app canvas.

### Core v1 loops

**1. Intention capture**

User texts: "Call Dad this weekend" or "I owe Alex an apology."

Kwilt replies with a short receipt:

> Saved. I can remind you Saturday morning. Reply `change time` if that is wrong.

If the message is actionable and low-risk, Kwilt may create an Activity under standing permission. If the user has not granted that permission, it saves a pending suggestion and asks one short confirmation.

**2. Right-time follow-up**

At the configured time or cadence, Kwilt texts:

> Still want to call Dad this weekend? Reply `done`, `snooze 2d`, or `pause`.

The point is not nagging. The prompt should feel like Kwilt carried the thread for the user.

**3. Activation-energy help**

For relational or emotionally loaded actions, Kwilt can draft help:

> Want a 2-line text you can send Alex?

Kwilt drafts messages to the user. It does not send messages to third parties in v1.

**4. Loop closure**

User replies `done`.

Kwilt logs the outcome as Activity evidence and, when appropriate, updates the underlying cadence:

> Logged. That counts as showing up today.

**5. Reflection feed**

Closed loops become material for Chapters:

- relationship care the user acted on
- Goal movement that happened outside the app
- repeated patterns of drift and follow-through
- Force Actual evidence, especially Connection and Spirituality/Mastery depending on context

### Shared action-tool substrate

Text Coach should reuse the same domain-level operations planned for the external AI connector. The surface differs, but the action model should not fork.

| Operation | Text Coach behavior | Trust boundary |
|---|---|---|
| `create_activity_from_intention` | Convert a texted intention into an Activity or pending Activity suggestion. | Standing permission allowed for low-risk Activities; otherwise confirm. |
| `schedule_followup` | Set a right-time prompt for an Activity or intention. | Respect quiet hours, caps, and pause state. |
| `log_activity_outcome` | Treat `done` as completed Activity evidence when the prompt context is clear. | Confirm if ambiguous or if multiple open prompts could match. |
| `snooze_followup` | Move a prompt by natural reply like `snooze 2d` or `tomorrow morning`. | Never punish snooze; cap repeated prompts. |
| `pause_followup` | Pause one prompt, one category, or all Text Coach prompts depending on reply. | Make scope explicit in the confirmation. |
| `draft_message` | Draft a message or next step for the user to send. | Draft only; no external send in v1. |
| `propose_goal` | Suggest a Goal only when a pattern is strongly supported. | Confirmation required in app; no silent Goal creation. |

All operations should write to a single audit/action log with source, input summary, output object id, permission used, and whether the user confirmed, dismissed, or revoked.

### Message contracts

Text Coach copy should feel like Kwilt carried the thread, not like a needy assistant. Short, concrete, and reversible.

**Capture receipt**

> Saved. I can remind you Saturday morning. Reply `change time` if that is wrong.

**Permission ask**

> I can turn texts like this into Activities for you. Want to allow that for future texts?

**Right-time follow-up**

> Still want to call Dad this weekend? Reply `done`, `snooze 2d`, or `pause`.

**Activation help**

> Want a 2-line text you can send Alex?

**Loop closure**

> Logged. That counts as showing up today.

**Pause confirmation**

> Paused this follow-up. You can still text me when you want to pick it back up.

**Not relevant**

> Got it. I will clear this one.

Avoid: "I care," "I'm proud of you," "you fell behind," "crush it," "optimize," or any wording that implies Kwilt has feelings, applies guilt, or values task volume.

### App surfaces

Text Coach can live outside the app, but the app still needs to explain and govern it.

- **App shell:** Settings and primary navigation remain stable. Text Coach should appear as a Pro/follow-through setting, not a new top-level world that displaces Arcs, Goals, Activities, or Chapters.
- **App canvas:** the main Text Coach surfaces appear inside normal page canvases: settings, permission review, activity detail, and action audit. The action happens in Activities and related object detail pages, not in a dashboard.
- **Settings -> Text Coach:** phone linking, permissions, quiet hours, prompt caps, pause all, STOP explanation, and action log entry point.
- **Activity detail:** show when an Activity came from Text Coach, the original text summary, follow-up state, and latest reply.
- **Chapter detail:** Text Coach evidence can appear in retrospective language, but Chapters remain lookbacks and never become planning queues.

### Launch phases

**Phase 0 — Concierge beta**

- Small number of Pro-intent users.
- Manual review allowed behind the scenes if needed.
- Goal is to validate tone, timing, and willingness-to-pay before over-automating.

**Phase 1 — Private Text Coach**

- SMS/text opt-in, Activity permission, follow-up scheduling, `done`/`snooze`/`pause`, drafts, audit log.
- Relational examples lead onboarding, but users may capture any Arc/Goal follow-through intention.

**Phase 2 — Shared action tools**

- Generalize the operations so MCP, desktop, and in-app agent surfaces can call the same action substrate.
- Add stronger observability: prompt quality, reply handling, permission revokes, STOP/opt-out, action correction rate.

**Phase 3 — Weekly Options handoff**

- Weekly Planning becomes a ritual under Text Coach/follow-through.
- Text Coach can say: "Kwilt prepared a few options for this week. Want me to carry one forward?"
- Accepted options become Activities with the same follow-up and loop-closure behavior.

### Agent permissions

Text Coach needs an explicit permission model. The first permissions should be plain-language, narrow, and reversible:

- "Create Activities from texts I send Kwilt."
- "Text me follow-ups for Activities created from text."
- "Log `done` replies as completed Activities."
- "Offer drafts for messages I might send."

Not allowed in v1:

- Send texts/emails/messages to other people.
- Create or reshape Arcs.
- Change Goals without confirmation.
- Infer contact from private phone/iMessage threads Kwilt cannot observe.
- Store group-thread transcripts.

### Relational follow-through as the first WOW

The first paid examples should lean into relational follow-through because Kwilt-keep's wedge suggests higher willingness-to-pay there:

- "Lily's birthday is Oct 12. She likes dragons."
- "Remind me if I haven't called Dad in 3 weeks."
- "Charlie has tryouts Friday. Ask me to check in after."
- "Maya's mom is in chemo. Don't give advice; just help me show up."
- "I owe Alex an apology about last night."

These map naturally to Kwilt's identity model when framed as Activities under Connection-heavy Goals or Arcs. The product should avoid becoming a CRM by keeping the action language grounded in becoming and care, not contact management.

### Pricing posture

Text Coach should be a Pro pillar. Free users can still capture in-app and use basic AI surfaces; Pro users get trusted follow-through outside the app:

- proactive text follow-ups
- standing permission for Activity creation from texts
- loop-closure logging through SMS
- drafts and activation-energy help
- future connector/desktop access to the same agent actions

The monetizable promise is not "unlimited texting" or "more AI." It is: **Kwilt helps me actually show up.**

Recommended beta boundary:

- Free: inbound capture receipt and in-app pending suggestion.
- Pro: proactive follow-up, standing Activity permission, loop closure by reply, drafting help, recurring prompt cadences, and future Weekly Options handoff.
- Preview: one remembered intention can be carried through once for a free user after a meaningful activation moment, such as first Chapter or 7-day streak, then explain that recurring follow-through is part of Pro.

### Relationship to other agent work

Text Coach should become the sharper parent concept for the earlier Weekly Planning Agent:

- Weekly Planning Agent = one background ritual that prepares weekly options.
- Text Coach = continuous follow-through surface that captures, prompts, helps, and closes loops.
- Permissioned Activity Agent = internal substrate that lets Text Coach safely perform bounded actions.

### Anti-pattern guardrails

Reject the design if it includes:

- Autonomous messages to third parties.
- Anthropomorphic AI language that pretends Kwilt feels or personally cares.
- Guilt-based prompts: "You still haven't..."
- Productivity-app voice: "optimize," "crush," "falling behind."
- Default-public or household sharing in v1.
- Contact scraping or inference from threads Kwilt cannot observe.
- Forced commitment to dismiss or pause.
- A dashboard as the main interface.

## Success signal

30-day beta success:

- At least 60% of beta users text Kwilt one real intention within 7 days.
- At least 40% receive one right-time follow-up and reply with `done`, `snooze`, or `pause`.
- At least 25% close one loop through text (`done` reply or accepted draft/Activity).
- Qualitatively, users describe the feature as "Kwilt helped me actually show up" rather than "Kwilt reminded me."
- Guardrail: opt-out/STOP rate stays low, and users do not describe prompts as needy, creepy, or nagging.

## Open questions

- Which provider/channel should power the beta: Twilio SMS first, iMessage later, email-to-text fallback, or a staged in-app messaging mirror?
- What exactly is the free preview: one captured intention, one completed follow-up loop, or a limited number of proactive prompts?
- Should the beta onboarding ask for relational examples first, or keep the first prompt broad and let relational use emerge?
- What minimum metadata is enough for relational follow-through without prematurely creating a Person/Memory model?
- How should Text Coach prompts coordinate with existing local notifications so the user experiences one calm system, not two competing nudges?
- What compliance, opt-out, rate-limit, and data-retention rules are required before SMS can touch production users?

## Related

- [`docs/design-explorations/kwilt-text-coach-action-agent/`](../design-explorations/kwilt-text-coach-action-agent/) — design loop artifacts.
- [`docs/feature-briefs/background-agents-weekly-planning.md`](background-agents-weekly-planning.md) — narrower background weekly ritual.
- [`docs/feature-briefs/external-ai-connector.md`](external-ai-connector.md) — Claude/ChatGPT connector that can eventually expose the same action tools.
- [`docs/ai-chat-architecture.md`](../ai-chat-architecture.md) — existing mode/tool architecture that Text Coach should reuse.
- `/Users/andrewwatanabe/kwilt_keep/docs/plan.md` — separate-repo wedge evidence for SMS-native relational follow-through.
