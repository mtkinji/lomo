# Diverge: Kwilt Loops

## Status

This is Phase 2 exploration. It compares distinct product models and does not
select a winner or authorize implementation.

## Fixed frame

- Primary audience: `audience-aspirational-family-organizers`
- Representative persona: Maya
- Comprehension stress test: a retired customer with very low app fluency who
  can comfortably send and receive text messages
- Hero JTBD: `jtbd-move-the-few-things-that-matter`
- Primary active JTBD: `jtbd-carry-intentions-into-action`
- Constraint posture: `Extend the system`
- Design challenge: help Maya state what should happen later in her natural
  words, then provide only the help she authorized at the right moment without
  making her learn automation or manage a new product surface

## Axes of variation

The alternatives differ along four substantive axes:

1. **Initiation:** customer chooses a visible recipe, asks Chat, texts Phone
   Agent, or accepts a system suggestion.
2. **Expression:** constrained plain-language choices versus open natural
   language compiled into a typed contract.
3. **Primary channel:** capability UI, in-app Chat, SMS, or contextual system
   outreach.
4. **Trust posture:** explicit setup first versus inferred opportunity followed
   by explicit opt-in.

All alternatives preserve capability-owned evidence and actions, the four-object
model, capture-first behavior, channel-specific consent, and proportionate
authority. None may schedule arbitrary executable prompts or silently escalate
from notify to mutate.

## Alternative A: Capability Follow-up Recipes

### Sketch

Each capability exposes a tiny catalog of follow-up recipes at the moment its
meaning is obvious. After a Money answer, Maya may tap `Tell me every Friday` or
`Tell me after payday`. Goal detail may offer `Check in with me in two weeks`.
Weekly Options may offer `Prepare this every Sunday`. The customer chooses from
one or two useful options, sees a plain receipt, and manages the loop from the
owning capability. A shared runtime handles timing and delivery beneath these
local recipes.

```text
You have $343 for flexible spending.

[ Tell me every Friday ]

Done — private notification every Friday at 6 PM.
[ Change ]  [ Pause ]
```

### Audience and persona fit

Strong for Maya because it avoids both a rule builder and AI interpretation.
Strongest comprehension option for the retired customer when the offered recipe
matches her exact need. It becomes limiting when her familiar phrasing or
financial routine does not fit the curated choices.

### Design-challenge answer

The capability already knows the current question, supported triggers, and
permitted outcome. Maya makes one bounded timing choice rather than constructing
a loop.

### System fit

Highest fit with current capability-local ownership. The smallest extension is
a shared loop envelope plus a capability recipe registry. Chat and Phone Agent
can later invoke the same recipes, but are not required for creation.

### Four-object and capture-first stance

No new life object appears. Goal follow-ups remain associated with a Goal;
Activity recurrence remains Activity-owned; Money checks remain Money-owned.
Ordinary capture and use never require loop setup.

### Best when

- A capability has a small number of repeated, well-understood follow-up jobs.
- The primary goal is comprehension, predictability, and low implementation
  blast radius.
- The customer is already looking at the answer or object they want carried
  forward.

### Fails when

- The customer's timing, trigger, channel, or question is not represented.
- Every capability accumulates a different row of follow-up buttons.
- Curated recipes become an expanding settings catalog disguised as simplicity.

### Primer anti-pattern check

Pass. No dashboard, scoring, streak, forced commitment, anthropomorphic AI, or
capture gate. The main risk is UI clutter; fix by showing at most one contextual
recipe and putting alternatives behind `Change`.

## Alternative B: Chat-Authored Typed Loops

### Sketch

Maya tells Chat what she wants in ordinary language. Chat preserves the current
capability context, interprets the request into a strict owner-defined loop
schema, and either creates a low-risk reversible loop or asks one materially
necessary clarification. The receipt states what will happen, when, through
which channel, and what authority was granted. Later corrections use the same
language: `Make that Mondays`, `Text me instead`, or `Stop the payday check`.

```text
Maya: When I get paid, tell me what is flexible.

Kwilt: Which deposit should count?
       [ Social Security ]  [ Pension ]

Money check created
After Social Security is deposited, Kwilt will refresh Money and send a
private notification.
[ Change ]  [ Pause ]
```

### Audience and persona fit

Very strong for Maya because she can begin from her own mental model instead of
learning the system's vocabulary. Potentially strongest for the retired
customer because texting is familiar, provided receipts remain concrete and
Chat does not demand long corrective conversations.

### Design-challenge answer

Natural language becomes the setup interface. The owner schema and proposal
receipt prevent flexibility from turning into opaque automation.

### System fit

Strong fit with Unified Chat's channel-independent coordinator, capability
manifest, typed proposals, receipts, and exact return. The smallest extension
is an owner-declared loop recipe/schema, a loop-proposal outcome, a trigger
runtime, and Chat support for create/change/pause/resume/stop intents.

### Four-object and capture-first stance

Chat does not manufacture Goals or Activities merely to represent time. It
attaches the loop to existing capability scope or creates a standalone
capability check when the owner supports one. Capture remains available before
classification, timing, or anchoring.

### Best when

- Customers have many legitimate ways of describing the same routine.
- Context already identifies the capability or object.
- A strict schema can represent the intended trigger and outcome truthfully.
- Cross-channel correction and continuity matter.

### Fails when

- Chat guesses at a trigger, target, source, recipient, or disclosure level.
- Unsupported language produces plausible-sounding but nonexistent behavior.
- Every loop requires a clarification conversation.
- The receipt is too abstract for the customer to verify.

### Primer anti-pattern check

Pass with constraints. AI is an interpreter, not an emotional companion or
domain authority. It fails if copy personifies Kwilt, hides assumptions, or
silently creates commitments. Fix with strict validation, maximum-one-material-
clarification discipline, and concrete receipts.

## Alternative C: Phone-Agent-First Follow-through

### Sketch

The Kwilt Phone Agent becomes the primary place to create and receive loops.
Maya texts `Every Friday tell me what is left for flexible spending` or says it
on an inbound call. The Phone Agent creates a typed capability proposal, sends a
short receipt, and delivers future follow-ups through the same SMS thread. The
app remains the governance surface for phone linking, permissions, quiet hours,
detailed evidence, and consequential review.

```text
Maya → Kwilt
Every Friday tell me what I have left for flexible spending.

Kwilt → Maya
Set. I will check Money every Friday after 6 PM and text you here.
Reply CHANGE or PAUSE anytime. Financial details are hidden until you ask.
```

### Audience and persona fit

Good for Maya when she is away from the app. Potentially exceptional for the
retired customer because it uses a channel she already understands and removes
app navigation almost entirely. It carries the highest trust, privacy,
compliance, provider, and support burden.

### Design-challenge answer

The familiar phone thread becomes both authoring and delivery. Kwilt carries
context across time while the app supplies deeper inspection when needed.

### System fit

Conceptually aligned with the accepted Phone Agent parent brief and shared
agent coordinator. Operational fit is currently weak: unfinished Phone Agent
surfaces are hidden, and deployed provider, consent, scheduler, delivery, and
cross-channel proof remain separate gates. The smallest honest extension is not
small until that channel is running.

### Four-object and capture-first stance

Phone input remains capture-first and may create a loop without forcing a Goal
or Activity. Capability ownership still determines whether the result is a
Money check, Goal question, Activity reminder, or proposal. SMS never becomes
a parallel object store.

### Best when

- The user reliably texts but rarely opens or navigates apps.
- Short prompts and replies are enough to complete the job.
- Phone linking, consent, quiet hours, caps, STOP/HELP, and delivery status are
  already proven.

### Fails when

- The initial experience requires lengthy setup in the app before text becomes
  useful.
- Financial disclosure is unsafe on a shared lock screen or phone plan.
- Evidence, correction, or proposal review is too complex for SMS.
- Provider failure makes a trusted loop silently disappear.

### Primer anti-pattern check

Pass only with strict calm-attention and privacy contracts. It fails if SMS
becomes frequent, emotionally manipulative, promotional, or difficult to stop.
Fix with explicit opt-in, private default content, caps, quiet hours, delivery
truth, and deterministic STOP behavior.

## Alternative D: Suggested Right-Time Loops

### Sketch

Kwilt notices a repeated question, recurring correction, or material capability
moment and occasionally offers to carry it forward. It never enables the loop
without the customer's acceptance. After Maya asks about flexible spending on
several Fridays, Chat or Budget may say `Want Kwilt to check this every Friday?`
After a newly stable income pattern is supported, Money may offer `Tell you
after this deposit next month?` System-originated material notices use the same
trigger and delivery substrate but remain separately governed.

```text
You have checked flexible spending on the last three Fridays.

Want Kwilt to bring this answer to you next Friday?
[ Yes, privately ]  [ Not now ]
```

### Audience and persona fit

Potentially strongest setup reduction for Maya because the system offers one
relevant next step when evidence already explains it. Helpful for the retired
customer only if the offer is literal, rare, and clearly optional. The same
behavior can feel uncanny or coercive when its observation basis is unclear.

### Design-challenge answer

Kwilt performs the translation and timing discovery, leaving Maya with one
understandable opt-in decision at a moment of demonstrated value.

### System fit

Moderate fit. It reuses capability evidence, Chat context, and loop recipes but
adds suggestion eligibility, repetition evidence, suppression, cooldown,
decline memory, and explanation contracts. It is not required for the shared
loop substrate to work.

### Four-object and capture-first stance

Suggestions arise from existing objects or supported capability questions and
never block capture. Kwilt may propose a future check but cannot auto-anchor,
create a Goal, or turn Chapter observations into plans.

### Best when

- Repeated behavior provides strong, easily explained evidence of desire.
- Customers do not discover follow-up creation on their own.
- The offer can be accepted with one calm decision and dismissed permanently.

### Fails when

- Kwilt infers desire from weak or sensitive behavior.
- Suggestions become product promotion or a notification-growth mechanism.
- Declined offers recur.
- The inferred schedule or outcome is wrong often enough to create correction
  work.

### Primer anti-pattern check

Highest risk. It passes only if suggestions are rare, evidence-based,
dismissible, non-punitive, and never enabled automatically. It fails as soon as
it becomes attention extraction, surveillance, or AI-authored urgency.

## Comparative view

| Alternative | Comprehension | Expressive range | Current-system fit | Channel independence | Trust risk | Small first slice |
| --- | --- | --- | --- | --- | --- | --- |
| A. Capability recipes | High | Low-medium | High | Medium | Low | Very strong |
| B. Chat-authored typed loops | Medium-high | High within schemas | High | High | Medium | Strong |
| C. Phone-Agent-first | High after setup | Medium-high | Low operationally today | Low as primary experience | High | Weak until Phone Agent runs |
| D. Suggested right-time loops | High when accurate | Medium | Medium | High | High | Moderate but easy to misuse |

## What the divergence reveals

- **A** is the safest interaction but risks turning each capability into a
  collection of small follow-up controls.
- **B** most directly answers the user's offered idea and creates the strongest
  reusable contract, but comprehension depends on excellent proposals and
  receipts.
- **C** may be the accessibility breakthrough for customers who can text but
  cannot navigate, yet it should consume the shared contract rather than define
  it.
- **D** solves discovery and setup only after the core loop is trustworthy; it
  should not be the architectural foundation.

No alternative requires a top-level Loops destination. The later convergence
must decide whether the first release is a pure version of one alternative or a
reductive combination—most plausibly a Chat-authored Money check constrained by
one capability recipe and delivered first through a private notification.

The user then expanded Alternative D from repeated-use suggestions into
capability-constructed, evidence-backed protection offers. See
[`02a-yes-and-constructed-offers.md`](./02a-yes-and-constructed-offers.md). This
changes the likely convergence: constructed offers may be an activation layer
over the typed loop contract rather than a late discoverability enhancement.

The user then corrected the ownership and experience frame: Chat may construct
those offers in coordination with Money, and conversation may be the primary UI
for some customers. See
[`02b-frame-correction-chat-primary.md`](./02b-frame-correction-chat-primary.md).

## Questions for convergence

1. Is natural-language flexibility essential in the first release, or should
   one contextual Money recipe prove the trigger and delivery contract first?
2. Should a loop create immediately from an unambiguous explicit command, or
   should every loop require one proposal confirmation before activation?
3. Is Phone Agent an essential first proof for the low-app-fluency hypothesis,
   or a later delivery provider after in-app/push behavior is trusted?
