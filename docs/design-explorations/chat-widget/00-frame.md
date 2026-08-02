# Frame: Kwilt Chat Widget

## What the user said

> “It could be cool to have a Chat widget, a Kwilt Chat widget, and tapping it would immediately let me start chatting with Kwilt.”

## Restated in user voice

When something is already on my mind, I want one calm tap from the Home Screen to put me in Kwilt Chat, ready to say or type it, so opening the app does not become a detour.

## Target audience

`audience-ai-native-life-operators` — people who already use AI as an operating surface and expect it to be available where an intention begins.

## Representative persona

Nina uses AI to think, plan, capture, and operate, but expects Kwilt to preserve the boundaries of her private life system.

- Current situation: a thought, question, or practical request becomes salient while her phone is in hand.
- What she's trying to do: enter the existing durable Chat in one beat and express the request before the moment passes.
- Emotional state or tension: ready to talk, but unwilling to navigate through unrelated app surfaces first.
- What would make this feel wrong: a widget that exposes private conversation content, creates clutter, auto-records, or opens a second kind of Chat.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — the shortcut matters only if it lands in the same inspectable, permissioned, durable Chat the user already trusts.

## Job flow step

Step 2 in `job-flow-nina-trust-ai-with-my-life-system`: express a practical job in ordinary language or voice. It is currently scored 3. Kwilt supports durable Chat and voice in-app, but reaching and proving that expression path on a physical device still has friction and incomplete runtime evidence.

## Active anchors

- `jtbd-get-help-without-retelling-my-life` — the widget should enter the existing Chat system with its bounded continuity, not a contextless parallel assistant.
- `jtbd-capture-and-find-meaning` — reducing the distance between a live thought and expression keeps capture from becoming administrative work.

## Friction we're addressing

Chat is globally reachable inside Kwilt, but a user starting from the Home Screen must first open and orient inside the app. That small navigation cost works against the moment when they are most ready to speak or type a request.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: standalone Unified Chat is the durable global Chat destination; Kwilt also has a capability menu entry for Chat and contextual entry from native objects.
- Existing user flow: `kwilt://chat` already deep-links into Unified Chat. With no explicit thread id, the current screen opens the most recently updated thread when one exists; it does not create an empty thread merely because Chat was opened.
- Existing domain/data model: durable owner-scoped threads, messages, runs, bounded context, proposals, decisions, and receipts remain authoritative.
- Existing technical affordances: the iOS widget extension, app-group entitlement, generated Swift bundle, widget-attribution handling, and deep-link routing already ship for other Kwilt widgets.
- Existing UX/copy conventions: Chat is a persistent capability layer, not persistent screen furniture; entry must be calm, recording must be user-initiated, and private content should not be projected outside the app by default.

Constraints to preserve:

- The widget is an entry point to Unified Chat, not another conversation backend or assistant identity.
- Tapping never starts microphone capture automatically; the user explicitly taps the in-Chat microphone.
- The widget exposes no thread titles, message excerpts, life context, or other private content on the Home Screen.
- Opening the widget does not create an empty durable thread before the user sends something.
- Existing Chat capability ownership, authorization, proposal, receipt, and undo boundaries remain unchanged.

Constraints we may challenge:

- Chat currently becomes visible only after entering Kwilt. A small native system surface can make the same capability reachable at the moment of intent.

Design implication:

The smallest coherent extension is a static, privacy-safe Kwilt Chat launcher that deep-links into the existing Chat and makes the composer immediately ready. It should reuse the current widget bundle and attribution path, with no new shared data model and no ambient content.

## Aspirational design challenge

How might we help Nina move from a live thought to the existing trusted Kwilt Chat in one calm tap, while preserving privacy, explicit recording, and one authoritative conversation system?

## Out of scope

- Showing recent thread titles or message previews on the Home Screen.
- Starting audio recording from the widget tap.
- Interactive Chat responses inside the widget.
- A second Chat backend, model, memory store, or capability policy.
- Android widgets in the first iOS learning release.

## Open question

Should the widget resume the most recent Chat by default, or present a fresh unsent composer while delaying thread creation until the first message?
