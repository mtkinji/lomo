---
id: brief-kwilt-phone-agent
title: Kwilt Phone Agent / Kwilt Keep — phone-number front door to the life system
status: draft
audiences: [audience-ai-native-life-operators, audience-burned-out-productivity-power-users]
personas: [Nina, Marcus]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-capture-and-find-meaning
  - jtbd-carry-intentions-into-action
  - jtbd-move-the-few-things-that-matter
  - jtbd-see-my-arcs-in-everyday-moments
related_briefs:
  - brief-kwilt-text-coach
  - brief-external-ai-connector
  - brief-background-agents-weekly-planning
owner: andrew
last_updated: 2026-05-10
---

## Context

Kwilt mobile has reached App Store review. The next strategic question is how Kwilt Keep should relate to Kwilt: separate SMS relational-memory product, or owned phone-number surface for the Kwilt life system. The decision here is to make **Kwilt Keep the phone-accessible front door to Kwilt's AI life operator**. A user can text or call a Kwilt number when life happens; Kwilt captures what matters, turns safe items into Kwilt actions, follows up when useful, and leaves a clear audit trail.

This is the parent concept for the existing Text Coach and external AI connector work. Text Coach proves the first SMS-native follow-through loop. The external AI connector lets user-initiated Claude/ChatGPT conversations act on Kwilt data. The Phone Agent is the Kwilt-owned channel: the user reaches Kwilt directly by text or phone call, and Kwilt can later initiate calm follow-up over SMS.

## Target audience

Primary audience: `audience-ai-native-life-operators`. Nina already expects AI to help her think, plan, draft, and operate, but she will only trust Kwilt if every action is inspectable, permissioned, and reversible. A phone number is appealing because it is always available, not because it should become a loose chatbot. It must feel like a reliable door into her Kwilt system.

Secondary audience: `audience-burned-out-productivity-power-users`. Marcus gives the first wedge its emotional clarity: he does not need another planning interface. He needs meaningful intentions to survive real life long enough to become action.

## Representative persona

**Nina**, adapted to the phone-agent situation, wants to capture, recall, and operate her Kwilt system from the channel that is closest to the moment: sometimes a text, sometimes a short phone call. She is comfortable with AI, but becomes skeptical the moment it silently changes her system, exposes too much context, or pretends to be emotionally intimate.

**Marcus** shapes the first beta examples: birthdays, drift reminders, check-ins, apologies, support offers, and the other small acts where follow-through proves who he is becoming. His needs keep the product from becoming an abstract agent console.

## Aspirational design challenge

How might we help Nina and Marcus reach Kwilt by phone when life happens, so Kwilt can capture, recall, suggest, and carry forward meaningful intentions, while preserving capture-first behavior, explicit permission, private-by-default trust, and the user's authorship over external actions?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — A phone-number agent is a high-trust surface. If Kwilt is going to sit in SMS threads, voice calls, follow-up prompts, and agent actions, the trust contract must lead the design: minimal context, clear receipts, narrow permissions, visible audit logs, and no silent life-system rewrites.

## Job flow step

Job flow: `job-flow-nina-trust-ai-with-my-life-system`.

Primary underserved steps:

- **Capture from where she is already thinking** — current delivery score 2. Phone access gives Kwilt a universal input channel beyond the app and external AI clients.
- **Ask questions about Arcs, Goals, Activities, and Chapters** — current delivery score 2. Voice calls and SMS recall can make Kwilt queryable without opening the app.
- **Inspect exactly what would change / approve, reject, or edit changes** — current delivery score 1. The phone agent forces a reusable preview, permission, and audit contract.
- **Undo or audit past actions** — current delivery score 1. Every channel action must land in a durable action log visible from the app canvas.

## JTBD framing

When the user is away from the app but something meaningful happens, they want to text or call Kwilt and trust it to remember, help, and carry the thread forward, so follow-through does not depend on opening a planning interface at the perfect moment. This serves `jtbd-capture-and-find-meaning` by making phone input a first-class capture path, `jtbd-carry-intentions-into-action` by letting Kwilt prompt and close loops over time, `jtbd-move-the-few-things-that-matter` by turning those loops into Activity evidence, `jtbd-see-my-arcs-in-everyday-moments` by gently connecting phone-captured moments back to identity context, and `jtbd-trust-this-app-with-my-life` by making permission and auditability the core product promise.

## Design

### One sentence

Kwilt Keep becomes Kwilt's phone-number agent: users can text or call a dedicated number to capture, recall, plan, and follow through, while the app remains the governance and review canvas for permissions, confirmations, object detail, and audit history.

### Product boundary decision

Kwilt Keep is **not** a separate household memory product for v1. It is the branded phone surface for Kwilt. The old Keep wedge still matters, and its relational primitives should exist early because the first high-WOW loops depend on remembering people, dates, preferences, and cadences.

The separate-product path is explicitly deferred because it introduces Account/Member/shared-workspace complexity before Kwilt has proven the one-user phone-agent loop. Internal People/Memory/Event/Cadence records are in scope for v1; household membership, shared/private multi-user memory, group-thread sponsorship, and a user-facing CRM surface are not. Those can return later if beta evidence shows repeated demand, but they should build on the same action substrate and privacy model instead of forking the product.

### Channel contract

| Channel | Best for | Allowed in beta | Not allowed in beta |
| --- | --- | --- | --- |
| SMS | Durable capture, receipts, follow-up prompts, simple commands, loop closure | Natural-language capture, `done`, `snooze`, `pause`, `not relevant`, short recall, drafts, consent prompts | Long multi-step planning, surprise proactive prompts without opt-in, group-thread durable memory |
| Voice call | High-bandwidth capture, recall, planning conversation, emotionally loaded context | Inbound calls for capture, recall, turning a messy intention into Activities or drafts | Outbound phone calls, autonomous calls to other people, silent system mutations |
| App canvas | Governance and review | Phone linking, permissions, quiet hours, prompt caps, pending confirmations, action audit, Activity/Goal detail | A standalone chatbot dashboard that competes with Arcs, Goals, Activities, or Chapters |

The app shell stays stable: primary navigation and margins remain the frame. Phone-agent surfaces live in the app canvas through Settings, Activity detail, pending confirmation review, and action audit. The main action still happens through Kwilt objects, not a new top-level phone-agent world.

### V0 wedge loops

The first beta should prove four loops end-to-end:

1. **Meaningful capture** — User texts or says, "Lily's birthday is Oct 12. She likes dragons." Kwilt saves lightweight internal person/memory/event records, creates or suggests a phone-origin Activity when action is implied, and replies with a clear receipt plus one correction affordance.
2. **Right-time prompt** — Kwilt texts before the meaningful moment: "Lily's birthday is next week. Want three gift ideas under $40?"
3. **Activation help** — Kwilt drafts a card line, call opener, apology text, support offer, or gathering brief. Drafts go to the user only.
4. **Loop closure** — User replies `done`, `snooze 2d`, `pause`, or adds what happened. Kwilt logs Activity evidence and marks the phone-agent action as closed.

Relational examples lead because they create strong willingness-to-pay, but they are framed as Connection-heavy Activities and Goal/Arc evidence, not as CRM records.

### Data model reconciliation

Keep's primitives are useful, but they should be absorbed carefully into Kwilt's object model:

| Keep primitive | Kwilt-native home | Beta decision |
| --- | --- | --- |
| `Person` | Lightweight internal relationship context for names like Dad, Lily, Alex, and aliases | Store in v1; do not expose a People surface in beta |
| `MemoryItem` | Durable extracted facts/preferences/notes tied to a person, event, cadence, or Activity | Store in v1; keep summaries minimal and avoid durable transcripts |
| `Event` | Date-based meaningful moments such as birthdays, tryouts, dinners, or deadlines | Store in v1; use as prompt source and optional Activity context |
| `Cadence` | Recurring follow-through or drift rule such as "if I haven't called Dad in 3 weeks" | Store in v1; user can pause or change cadence |
| `Prompt` | Phone-agent scheduled message with state and source | Must support `pending`, `sent`, `done`, `snoozed`, `paused`, `not_relevant`, `cancelled` |
| `OutcomeLog` | Activity completion/evidence plus phone-agent action log entry | Counts as show-up when it represents real follow-through |
| `Member` / household workspace | Future shared account layer | Out of scope for v1; beta is one-user, private-by-default |
| Group ephemeral buffer | Possible future safety layer for group SMS | Out of scope for v1; no group-thread durable memory |

This gives the beta enough structure for timing and recall without making Kwilt Keep a parallel CRM. If the same person appears repeatedly, the system can resolve context internally. The user-facing object remains the Activity, prompt, or Goal they are trying to move, while relational records quietly improve recall and timing.

### Shared action-tool substrate

Phone Agent, Text Coach, external MCP, desktop AI operator, and future weekly planning should call the same domain-level operations:

| Operation | Phone Agent behavior | Trust boundary |
| --- | --- | --- |
| `capture_activity` | Text/call input becomes an Activity or pending Activity suggestion | Capture-first; Arc/Goal anchoring optional |
| `schedule_followup` | Creates a future SMS prompt from a captured intention, event, or cadence | Respect quiet hours, caps, pause state, and STOP |
| `log_activity_outcome` | `done` or voice confirmation closes the loop | Confirm if multiple prompts could match |
| `snooze_followup` | Moves the current prompt by natural reply or call instruction | Never frames snooze as failure |
| `pause_followup` | Pauses one prompt, one cadence, or all phone-agent prompts | Receipt must state the scope |
| `draft_message` | Drafts user-sent messages, cards, call openers, or next steps | Draft-only; Kwilt does not send to third parties |
| `propose_goal` | Suggests a Goal only when a repeated pattern is strongly supported | App confirmation required |
| `suggest_arc_alignment` | Suggests an existing Arc/Goal connection for phone-origin evidence | User-confirmed only; no auto-anchoring |

All operations write to one action/audit log with channel, source, permission used, input summary, output object id, confirmation state, and correction/revoke state.

### Permission model

The first permissions should be plain-language and narrow:

- "Create Activities from texts and calls I send Kwilt."
- "Text me follow-ups for Activities created from phone input."
- "Log `done` replies as completed Activities."
- "Offer drafts for messages I might send."
- "Suggest existing Goals or Arcs when a phone capture seems related."

Not allowed in v1:

- Send texts, emails, or phone calls to other people.
- Create or reshape Arcs.
- Change Goals without in-app confirmation.
- Read private SMS/iMessage threads that do not include Kwilt.
- Store durable group-thread transcripts.
- Turn the internal relationship records into a CRM-style app surface.

### Message contracts

Phone-agent copy should be short, concrete, and reversible:

**Capture receipt**

> Saved. I can remind you next Saturday. Reply `change time` if that is wrong.

**Voice-call summary**

> I saved three things from the call: call Dad this weekend, draft a note to Alex, and check on Charlie after tryouts. Want me to turn all three into Activities?

**Right-time prompt**

> Lily's birthday is next week. Want three gift ideas under $40?

**Loop closure**

> Logged. That counts as showing up today.

**Pause**

> Paused this follow-up. You can still text me when you want to pick it back up.

Avoid "I care," "I'm proud of you," "you fell behind," "optimize," "crush," or any wording that implies Kwilt has feelings, applies guilt, or values task volume.

### Beta stack decision

Use **Twilio-first** for the beta:

- Twilio owns the phone number, inbound/outbound SMS, opt-out handling, delivery status, and inbound Programmable Voice.
- Inbound SMS posts to a Kwilt backend endpoint that validates Twilio signatures, resolves the authenticated phone link, and routes to the shared action tools.
- Inbound voice calls use Twilio Programmable Voice with bidirectional media streams for real-time audio. Voice-agent orchestration sits behind a provider adapter so Kwilt can start with Twilio + OpenAI Realtime, then swap to Vapi, Retell, or another specialist if latency, interruption handling, or operational tooling is materially better.
- Supabase remains the system of record for Kwilt objects, permissions, action logs, and prompt state.
- A scheduled worker/cron sends due prompts through Twilio SMS. No outbound voice in beta.

This keeps the beta coherent: one phone-number provider, one Kwilt action substrate, and a replaceable voice-agent adapter rather than a hard dependency on one orchestration vendor.

### Launch phases

**Phase 0 — Concierge phone beta**

- One Kwilt-owned number.
- Small group of Pro-intent users.
- SMS-first capture and follow-up.
- Voice calls may be manually reviewed or conservatively summarized behind the scenes.
- Goal: validate tone, timing, and willingness-to-pay before heavy automation.

**Phase 1 — Private Phone Agent**

- Phone linking in Settings.
- SMS inbound capture, follow-up scheduling, `done`/`snooze`/`pause`/`not relevant`.
- Inbound voice call summary and Activity suggestions.
- Action audit log.
- Draft-only activation help.

**Phase 2 — Shared action substrate**

- Generalize action operations so Phone Agent, Text Coach, MCP, desktop, and Weekly Options all call the same trusted tools.
- Add stronger observability: prompt quality, correction rate, permission revokes, STOP/opt-out, phone-origin show-up count.

**Phase 3 — Voice operator depth**

- Better real-time voice planning and recall.
- Voice handoff to app confirmation for Goal proposals and Arc alignment.
- Optional voice-call transcript summaries, stored only when the user allows.

**Phase 4 — Shared relationship-memory expansion**

- Only after evidence: expose relationship memory as an app surface, or add shared household scope, group-thread sponsorship, or multiple members.
- Keep private/shared boundaries explicit and app-governed.

## Success signal

30-day beta success should measure trusted follow-through, not message volume:

- At least 60% of beta users text or call Kwilt with one real intention within 7 days.
- At least 40% receive one right-time follow-up and reply with `done`, `snooze`, `pause`, or `not relevant`.
- At least 25% close one loop through phone input (`done`, accepted draft, or completed Activity).
- At least 20% of beta users use recall over SMS or voice at least once ("What do I know about Lily?", "What did I say I wanted to do this weekend?").
- Qualitatively, users describe the feature as "Kwilt helped me actually show up" rather than "Kwilt reminded me."
- Guardrail: STOP/opt-out stays below 5% of beta users, and permission revokes after phone-agent actions stay below 10%.
- Guardrail: fewer than 2% of phone-agent writes require manual data correction because Kwilt changed the wrong object.

## Open questions

- Does the beta use one shared Kwilt number or provision per-user/local numbers later?
- Does voice-call summary store a transcript, a structured summary only, or nothing beyond created actions?
- What is the exact free preview: one carried intention, one completed loop, or phone capture only with in-app pending suggestions?
- Which paywall reason should represent recurring phone-agent follow-through: `pro_only_text_coach`, `pro_only_phone_agent`, or a broader `pro_only_follow_through_agent`?
- What evidence would justify exposing relationship memory as a first-class app surface rather than keeping it internal to Phone Agent?
- How should phone-agent prompts coordinate with existing local notifications so the user experiences one calm system?

## Related

- [`docs/design-explorations/kwilt-phone-agent/`](../design-explorations/kwilt-phone-agent/) — expanded design loop artifacts for the phone-agent parent concept.
- [`docs/feature-briefs/kwilt-text-coach.md`](kwilt-text-coach.md) — SMS-first follow-through slice that becomes Phase 1 of the phone-agent strategy.
- [`docs/feature-briefs/external-ai-connector.md`](external-ai-connector.md) — external AI pull-based connector that should share the action-tool substrate.
- [`docs/feature-briefs/background-agents-weekly-planning.md`](background-agents-weekly-planning.md) — cadence-based ritual that can later hand off through the phone agent.
- [`/Users/andrewwatanabe/kwilt_keep/docs/plan.md`](/Users/andrewwatanabe/kwilt_keep/docs/plan.md) — original SMS relational-chief-of-staff wedge evidence.
- [`/Users/andrewwatanabe/kwilt_keep/docs/behavioral-rules.md`](/Users/andrewwatanabe/kwilt_keep/docs/behavioral-rules.md) — original Keep SMS and privacy behavior rules.
- [`/Users/andrewwatanabe/kwilt_keep/docs/data-model.md`](/Users/andrewwatanabe/kwilt_keep/docs/data-model.md) — original Keep primitives reconciled above.
