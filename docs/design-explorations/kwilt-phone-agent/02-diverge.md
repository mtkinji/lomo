# Diverge: kwilt-phone-agent

## Axis of variation

The axis is **how phone-native the owned Kwilt agent should be at launch, and where authority lives**:

- SMS-first vs. full voice + SMS.
- Capture/recall only vs. follow-through and planning.
- Phone surface as child of Text Coach vs. parent surface for all Kwilt agent channels.
- One-user private agent vs. household relational memory.

## Alternative A — SMS Follow-Through Upgrade

Kwilt evolves the existing Text Coach brief: the user gets a number to text, Kwilt captures intentions, sends right-time prompts, drafts help, and closes loops with replies like `done`, `snooze`, `pause`, and `not relevant`. Voice calls remain out of scope until the SMS loop is validated. The product is legible and cheaper to ship, but it does not fully answer the user's "phone number accessible agent" ambition.

- Touches the four-object model at: Activities as the main action object; Goals/Arcs optional context; Chapters consume closed-loop evidence.
- Capture-first stance: strong; SMS capture never blocks on Arc/Goal selection.
- Force Intent vs Actual implication: follow-through can create Force Actual evidence, but suggestions are confirmed.
- Audience/persona fit: strong for Marcus; partial for Nina because it lacks richer query/voice operator behavior.
- Design-challenge answer: partial; it carries intentions but does not make Kwilt fully phone-accessible.
- Best when: speed and SMS tone validation are the only priority.
- Fails when: voice is part of the strategic wedge and SMS-only feels too small.
- Anti-pattern check: pass if prompts are capped, draft-only, and non-shaming.

## Alternative B — Full Phone Front Door

Kwilt Keep becomes the owned phone-number surface for Kwilt. The user can text or call. SMS handles durable capture, receipts, follow-ups, and loop closure. Voice handles high-bandwidth capture, recall, and planning conversations. The app remains the canvas for permissions, confirmations, and audit. The first beta still proves the relational follow-through loops, but the product frame is broader: phone access to the Kwilt life system.

- Touches the four-object model at: Activities for captures/outcomes; Goals as confirmed proposals; Arcs as read/context and suggested alignment only; Chapters as retrospective consumers.
- Capture-first stance: strong; phone input creates unanchored Activities or pending suggestions before interpretation.
- Force Intent vs Actual implication: phone-origin outcomes can enrich Actual evidence, but no silent scoring or auto-anchoring.
- Audience/persona fit: strong for Nina and Marcus; Nina gets operator access, Marcus gets follow-through.
- Design-challenge answer: strong; phone access plus app governance preserves trust.
- Best when: Kwilt wants a parent agent surface that can unify Text Coach, MCP, desktop, and Weekly Options.
- Fails when: voice latency/cost makes calls feel unreliable or creepy before the SMS loop is proven.
- Anti-pattern check: pass if voice writes require confirmation and transcripts are minimized.

## Alternative C — Permissioned Agent Substrate First

Kwilt builds the shared action-tool substrate before committing to a channel. Phone, MCP, desktop, and in-app agent surfaces all become clients of one permissioned action system. The first user-facing beta might still be SMS, but the core work is backend permissions, action logs, confirmation states, and audit surfaces.

- Touches the four-object model at: all objects through typed actions; Activities are safest for standing permission.
- Capture-first stance: safe if channel capture remains ungated.
- Force Intent vs Actual implication: strong substrate for confirmed suggestions.
- Audience/persona fit: strong for Nina's trust requirements; weaker for Marcus's emotional WOW.
- Design-challenge answer: strong on trust, weaker on the phone-number wedge.
- Best when: engineering wants to avoid rework across agent surfaces.
- Fails when: users cannot feel the product because the launch is too infrastructural.
- Anti-pattern check: pass if the permission UI is concrete and not an abstract rules builder.

## Alternative D — Household Keep Product

Kwilt Keep remains a distinct SMS-first relational chief of staff with Accounts, Members, shared/private memory, group-thread sponsorship, and household pricing. It can later integrate with Kwilt but does not need to obey the Arc/Goal/Activity/Chapter model in v1. This honors the original Keep wedge most directly.

- Touches the four-object model at: weakly; it introduces Person/Memory/Event/Cadence as parallel primitives.
- Capture-first stance: strong in SMS, but shared/private scope adds friction.
- Force Intent vs Actual implication: Connection evidence could map back later, but not by default.
- Audience/persona fit: strong for household buyers; weaker for Nina's Kwilt life-operator frame.
- Design-challenge answer: weak; it creates another product boundary instead of a phone surface for Kwilt.
- Best when: the business wants a distinct household subscription product.
- Fails when: it distracts from Kwilt's identity-first life system and forks the data model.
- Anti-pattern check: risky because group threads, shared memory, and relational data increase privacy risk.

## Alternative E — Voice Operator First

Kwilt launches around phone calls: the user calls Kwilt to talk through their week, ask about Arcs/Goals, turn messy thoughts into Activities, and receive a text summary afterward. SMS is mostly receipts and links. This differentiates the product but pushes the hardest technical and trust problems into v1.

- Touches the four-object model at: Activities and Goal proposals; Arcs read as context; Chapters as lookback reference only.
- Capture-first stance: medium; call summaries must avoid delaying capture until interpretation is done.
- Force Intent vs Actual implication: rich but risky if the call over-interprets meaning.
- Audience/persona fit: strong for Nina; medium for Marcus if calls feel like more work.
- Design-challenge answer: partial; phone access is strong, but trust risk is higher.
- Best when: voice quality is excellent and the demo needs to feel unmistakably new.
- Fails when: latency, interruption handling, or transcript policy undermines trust.
- Anti-pattern check: risky; must avoid anthropomorphic AI and overconfident coaching.
