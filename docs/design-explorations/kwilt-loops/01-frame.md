# Frame: Kwilt Loops

## Status and review cadence

This is a strategic product-system exploration with a review checkpoint after
each phase. This frame does not authorize implementation.

The user later clarified that Chat may construct and present loops in
coordination with capabilities, and that conversation may be the primary UI for
some customers. See
[`02b-frame-correction-chat-primary.md`](./02b-frame-correction-chat-primary.md),
which supersedes the narrower capability-constructed ownership assumption.

The conversation began with the yes-and expansion in
[`00-yes-and.md`](./00-yes-and.md); this artifact supplies the audience,
job-flow, anchor, and system grounding before divergence.

## What the user said

> I wonder if that is some sort of broader loop/timed action creation
> capability, and not just a function of budgeting?

This follows concrete Money examples such as `Tell me every Friday`, `Tell me
after payday`, and `When I get paid, text me`, with future delivery through
notifications or Kwilt Phone Agent.

## Restated in user voice

When something I care about will become relevant later, I want to tell Kwilt
what should happen and when in the words I naturally use, so Kwilt can carry it
forward and return at the useful moment without making me learn an automation
system, repeatedly navigate the app, or give it more authority than I intended.

## Target audience

`audience-aspirational-family-organizers` — Aspirational family organizers.

This audience wants real family commitments, household money, and everyday
follow-through to work without power-user setup. It is the best current primary
fit because the first credible learning slice is Money and the broader value is
reduced system administration.

Very low-app-fluency and older adults are a deliberate comprehension stress
test. The retired customer described in research may eventually justify a
separate audience or persona, but the current evidence is not yet sufficient to
invent a new taxonomy entry.

## Representative persona

**Maya** is not a productivity hobbyist. She can state what she wants in
ordinary language, but will not reliably construct triggers, filters, channels,
or permissions in a rule builder.

- Current situation: a useful Money answer, family intention, or follow-up has
  become clear, but its relevant moment is in the future.
- What she is trying to do: hand the intention to Kwilt once and trust it to
  return with proportionate help at the right time.
- Emotional state or tension: relieved by the idea of not remembering or
  navigating, but wary of noisy reminders, unexplained automation, and actions
  she did not authorize.
- What would make this feel wrong: an `if-this-then-that` builder, automation
  dashboard, mandatory setup, frequent alerts, AI-authored urgency, or a loop
  that silently changes Money, Goals, Activities, Screen Time, or family state.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — Maya cares because a fragile intention
must survive long enough to become useful action, not because she wants to
administer automations.

## Job flow step

Primary flow: `job-flow-maya-move-family-life-forward`.

Primary underserved step:

- **Schedule or hand off work when it cannot happen now — 2/5.** Scheduling and
  sharing foundations exist, but the flow is not cohesive and does not let Maya
  hand Kwilt a future conditional intention in ordinary language.

Adjacent steps:

- **Keep using the system because it feels helpful, not fussy — 3/5.** A calm
  loop can reduce repeated navigation and memory burden; a rules system or noisy
  prompting would lower delivery.
- In the specialist Money flow, **trust and repeat the pattern — 2/5.** Money
  can answer today, but routine checks and longitudinal value are not proven.

Current offering: Activities can recur or carry reminders; Chat can invoke
typed capability operations; Phone Agent has source-level prompt/cadence and
delivery infrastructure; Weekly Options defines a background ritual; Money has
an accepted design for scheduled checks. These are adjacent implementations,
not one customer-legible follow-through contract.

## Active anchors

- `jtbd-carry-intentions-into-action` — the direct demand-side home. Its current
  definition already names capture, useful-time prompting, reduced activation
  energy, cross-channel continuity, and loop closure.
- `jtbd-get-help-without-retelling-my-life` — a future loop must retain only the
  bounded context needed to avoid making Maya reconstruct the original request.
- `jtbd-stay-in-control-of-ai-actions` — timing permission is not mutation
  permission; proposals, review, receipts, correction, pause, and undo remain
  proportionate to the outcome.
- `jtbd-trust-this-app-with-my-life` — background execution, financial context,
  Phone Agent delivery, and family scope require inspectable evidence and calm
  behavior.

## serves snippet

```yaml
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-get-help-without-retelling-my-life
  - jtbd-stay-in-control-of-ai-actions
  - jtbd-trust-this-app-with-my-life
```

## Friction we are addressing

Kwilt can already represent recurring Activities, device notifications,
Phone-Agent prompts, capability operations, and some background rituals, but a
customer cannot express one ordinary-language future intention and receive a
consistent, governed result across them. The burden remains on the customer to
remember the moment, find the feature, translate their intent into each
capability's setup language, and infer what authority they granted.

## System alignment

Constraint posture: `Extend the system`.

The desired outcome fits Kwilt's channel-independent agent and
capability-ownership architecture, but it requires a new shared trigger and
lifecycle contract. It should extend the system beneath existing surfaces, not
add a competing product shell.

### Current system facts

- **Existing surfaces:** Unified Chat; capability-contextual Chat entry; Money
  Plan and category detail; Goal and Activity detail; Settings notifications;
  Settings Phone Agent; Settings Screen Time; capability-owned proposal and
  receipt surfaces.
- **Existing user flows:** Chat persists a request, resolves bounded context,
  invokes capability-owned operations, and renders evidence, proposals, and
  receipts. Activity recurrence and reminders use Activity-owned semantics.
  Screen Time conditions compile into a shared device-control plane. Phone
  Agent can receive and deliver channel jobs subject to consent and channel
  policy.
- **Existing domain/data models:** `AgentThread`, `AgentMessage`, `AgentRun`,
  `EvidenceRef`, proposal, operation, receipt, and pending-client-action
  records; capability operation manifests; Activity repeat/reminder fields;
  Phone Agent Event, Cadence, Prompt, permission, quiet-hours, and action-log
  records; Money living-plan and typed-answer contracts.
- **Existing technical affordances:** channel-independent coordinator;
  capability-specific mobile/server provider declarations; native notification
  service; queued Phone Agent work; Twilio delivery helper and deterministic
  commands; timezone, prompt-cap, quiet-hour, idempotency, and delivery-status
  concepts; exact native return.
- **Existing UX/copy conventions:** ordinary language first, one answer or
  decision at a time, capability-owned meaning, progressive disclosure,
  explicit scope, calm notifications, reversible actions, no empty Chat thread
  before engagement, and no completion claim without authoritative evidence.

### Constraints to preserve

- Keep Kwilt's app shell and navigation grammar.
- Chat is an authoring and explanation surface, not the owner of capability
  truth or mutation policy.
- The four-object model remains intact: a loop is not a fifth life object.
- Activities remain the day-level unit of doing; recurrence is not redefined as
  generic automation.
- Chapters remain retrospective and cannot become future-plan containers.
- Notification, SMS, voice, and native handoff are channels with distinct
  consent and proof boundaries.
- Capability calculations and conditions remain owned by Money, Goals,
  Activities, Screen Time, Household, or another named owner.
- Standing authority is narrow, operation-specific, visible, pausable, and
  reversible where the domain supports reversal.
- System-originated outreach remains rare, material, calm, and explainable.
- No user has to configure a loop before ordinary capture, Money use, or Chat
  remains useful.

### Constraints we may challenge

- Scheduled work is currently represented by several domain-specific
  structures. A shared loop envelope may unify trigger, lifecycle, delivery,
  and audit semantics without immediately migrating every existing scheduler.
- Settings are currently channel-oriented. A later quiet `Follow-ups` overview
  may be useful if customers need one place to find and stop cross-capability
  loops, while canonical editing remains with the owner.
- The current operation manifest models user-meaningful actions and provider
  availability; it may need an initiation/standing-authority projection for
  scheduled and event-triggered runs.

### Design implication

The solution space should generalize a contract, not a rule-building UI. Chat
should be the primary ordinary-language doorway; capabilities should publish a
small catalog of supported triggers, evaluations, and outcomes; the shared
runtime should own timing and delivery reliability. The first slice should be
one useful Money loop whose design could later support other owners without
making them adopt Money semantics.

## Aspirational design challenge

How might we help Maya hand Kwilt an intention that matters later, in the words
she naturally uses, so Kwilt reliably notices the right moment and provides
only the level of help she authorized—while preserving capability ownership,
calm attention, and her ability to understand, change, pause, or stop the loop?

## Out of scope

- A top-level Loops, Agents, or Automations capability.
- A general-purpose rule builder or arbitrary executable prompt scheduler.
- Raw scheduled SQL or database-query generation.
- Silent consequential writes or universal standing permission.
- Sending messages, purchases, transfers, or other external actions on the
  customer's behalf without separately proven domain authority.
- Outbound Phone Agent voice calls.
- Broad household loops before actor, subject, recipient, privacy, and authority
  semantics exist.
- Immediate migration of every existing recurrence, notification, cadence, or
  background job onto one implementation.
- App implementation during this exploration.

## Open question

Resolved: Maya remains the primary persona. The retired low-app-fluency
customer remains a required comprehension stress test for every alternative.
