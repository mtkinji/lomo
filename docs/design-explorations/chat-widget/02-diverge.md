# Diverge: Kwilt Chat Widget

## Fixed design challenge

How might we help Nina move from a live thought to the existing trusted Kwilt Chat in one calm tap, while preserving privacy, explicit recording, and one authoritative conversation system?

## Axis of variation

The alternatives vary by **entry semantics**: a deterministic fresh start, an explicit fresh/continuing choice, or a capture-first handoff that postpones the full conversation surface.

## Alternative A: Quiet Portal

A small static Home Screen widget presents the Kwilt mark, “Chat,” and restrained “Start a thought” language. Tapping anywhere opens Unified Chat to a fresh unsent composer with text entry ready. The existing microphone is visible but does not start until tapped. The route creates no thread until the first send.

- Audience/persona fit: high for Nina; it removes navigation without asking her to manage a widget.
- Design-challenge answer: one tap reaches the trusted Chat with no private content or ambient behavior.
- System fit: high. Reuses the widget bundle, `kwilt://chat`, Unified Chat, and existing microphone/composer; extends the route with an explicit fresh-entry contract.
- Four-object stance: neutral. The widget does not assume an Arc, Goal, Activity, or Chapter; the request itself determines any later capability context.
- Capture-first stance: strong. It opens expression immediately and requires no object selection.
- Best when: the common widget moment is “I have a new thought or request.”
- Fails when: people primarily want to continue the most recent thread and resent losing its immediate context.
- Primer anti-pattern check: pass. No dashboard, streak, urgency, forced commitment, anthropomorphic copy, sharing, or auto-anchoring.

## Alternative B: Two Doors

A medium interactive widget offers two equal, generic actions: “New thought” and “Continue.” New thought opens a fresh unsent composer; Continue opens the most recent durable thread. Neither action shows thread titles, excerpts, personal context, or activity state. The widget remembers no additional private model beyond the chosen route.

- Audience/persona fit: medium-high; Nina gets explicit control over context instead of a hidden default.
- Design-challenge answer: removes navigation while making fresh versus continuing intent legible.
- System fit: medium. Reuses the same backend and routes but adds two widget actions, a larger family, and a latest-thread resolution contract.
- Four-object stance: neutral. Neither action projects or selects a Kwilt object.
- Capture-first stance: good, but introduces a decision before capture.
- Best when: fresh starts and continuations are both frequent and users understand the distinction immediately.
- Fails when: the extra choice becomes tiny pre-work or the medium widget feels like persistent Chat furniture.
- Primer anti-pattern check: pass with restraint. It fails the calm-UX bar if “Continue” implies urgency or if private thread metadata leaks into the widget.

## Alternative C: Hold the Thought

The widget opens Kwilt into a deliberately minimal Chat capture state: only a composer, microphone, and close affordance are initially visible. After the first send, the surface expands into the normal durable Unified Chat thread. This preserves one backend but introduces a distinct transient presentation optimized for immediate capture.

- Audience/persona fit: medium; the focused state is fast, but Nina may wonder whether she is in real Chat or a separate capture tool.
- Design-challenge answer: minimizes visual orientation and keeps the first interaction singular.
- System fit: low-medium. It requires a new native/hosted presentation state, transition rules, draft recovery, and additional proof that it does not become a second Chat UI.
- Four-object stance: neutral at capture; any later object work stays capability-owned.
- Capture-first stance: strongest. Nothing competes with expression.
- Best when: full Chat chrome measurably slows first input or feels visually heavy during widget entry.
- Fails when: the transient mode creates conceptual ambiguity, duplicates the existing composer, or makes the later expansion feel surprising.
- Primer anti-pattern check: pass in content, but architectural risk is high: it can become the duplicate Chat editor the frame explicitly rejects.

## Comparison summary

| Alternative | Immediate clarity | Privacy | System fit | Capture speed | Clutter risk | Main uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| Quiet Portal | High | High | High | High | Low | Fresh versus continuing default |
| Two Doors | High | High | Medium | Medium | Medium | Whether choice helps or slows |
| Hold the Thought | Medium | High | Low-medium | High | Medium | Whether it feels like a second Chat |

## Divergence takeaway

The meaningful decision is not visual styling; it is how much intent the widget should ask the user to declare before entering Chat. Quiet Portal makes one strong default, Two Doors makes the choice explicit, and Hold the Thought changes the in-app presentation to optimize capture. The first alternative creates the least new product surface while still delivering the requested capability.
