# Diverge: Contextual Chat From To-dos

Axis of variation: how much of the To-dos canvas remains spatially present while the conversation grows.

## A. Peek-to-thread drawer

Tapping the new circular Chat affordance opens a bottom sheet at roughly 55–65% height. The list remains visible behind its top edge. A compact header says `To-dos`, a visible context chip names the active view, and the composer says `Ask about these to-dos`. Focusing the composer or receiving a substantial answer expands the sheet near full height. Dragging it down returns to the still-live list; accepted actions appear there through the existing Activity store.

- Persona fit: strong for Nina's visible-scope expectations and Marcus's need to stay oriented.
- Design-challenge answer: preserves one gesture and one visual layer between conversation and native truth.
- System fit: extends `BottomDrawer` with an embeddable Unified Chat host; reuses the durable repository and launch-context contract.
- Best when: phone portrait is primary and the conversation can grow beyond one reply.
- Fails when: the half-height state is treated as a full chat viewport after the keyboard appears, or the sheet creates a separate thread lifecycle.
- Four-object model: reads and proposes changes to Activities; it creates no new planning object.
- Capture-first: Quick Add remains available when the sheet is closed; Chat never blocks capture.
- Anti-pattern check: pass. No dashboard, score, anthropomorphic assistant, or silent reorganization.

## B. Full-screen contextual handoff

Tapping the affordance navigates to the existing Unified Chat screen with a visible `All to-dos` chip and an exact Back return. It is the smallest implementation and gives the conversation maximum room, but the list disappears during the exchange.

- Persona fit: strong for durable trust, weaker for the stated desire to stay in To-dos context.
- Design-challenge answer: semantic context is preserved; spatial context is not.
- System fit: strongest. It can mostly reuse the current route and workbench.
- Best when: implementation risk must be minimized or Chat content is routinely dense.
- Fails when: users perceive a mode switch and forget what in the list prompted the question.
- Four-object model: clean; Chat remains a doorway and Activities remain authoritative.
- Capture-first: pass.
- Anti-pattern check: pass, but it underdelivers on contextual presence.

## C. Composer grows in place

The wide `Add a to-do` pill can switch into a conversational composer, and assistant replies appear as one or two temporary cards immediately above the dock. A control opens the full durable thread when more room is needed.

- Persona fit: attractive for one-shot questions, but ambiguous because the same control changes from capture to conversation.
- Design-challenge answer: maximum spatial continuity for brief exchanges.
- System fit: weak. It mixes Quick Add and Chat state, duplicates timeline presentation, and creates a handoff threshold the user must understand.
- Best when: almost all uses are one-turn assistance.
- Fails when: proposals, evidence, corrections, voice, or multi-turn conversation appear.
- Four-object model: technically clean, but the UI blurs Activity capture with Chat.
- Capture-first: risk; the dominant capture affordance changes identity.
- Anti-pattern check: revise or reject. It can become clever chrome that makes ordinary capture harder.

## D. Persistent side rail

Tapping the affordance opens Chat beside the list. To-dos stays on the left and conversation occupies a fixed rail on the right. The thread can remain open while the user taps among Activities.

- Persona fit: strong for desktop-oriented Nina, poor on a phone-sized portrait canvas.
- Design-challenge answer: strongest simultaneous visibility in wide layouts.
- System fit: requires a responsive split-view shell, selection semantics, and careful keyboard behavior.
- Best when: iPad, landscape, or desktop provides at least two readable panes.
- Fails when: a 390-point phone canvas makes both the cards and conversation cramped, or tapping a new Activity silently changes Chat scope.
- Four-object model: clean if selection is explicit context, not ambient permission.
- Capture-first: pass on wide layouts; clutter risk on phone.
- Anti-pattern check: pass only as an adaptive large-screen form, not the phone default.

## Divergence conclusion

Use A on phone, preserve D as a later responsive expression of the same host, and keep B as the safe fallback if the embedded workbench cannot meet keyboard, accessibility, or causal-timeline requirements. Reject C because it makes Quick Add and Chat less legible to save one tap.
