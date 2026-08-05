# Converge: Kwilt Chat Widget

## Qualitative scoring

| Criterion | Quiet Portal | Two Doors | Hold the Thought |
| --- | --- | --- | --- |
| Nina / AI-native fit | High | Medium-high | Medium |
| `jtbd-trust-this-app-with-my-life` | High | High | Medium |
| `jtbd-get-help-without-retelling-my-life` | Medium-high | High | Medium |
| `jtbd-capture-and-find-meaning` | High | Medium | High |
| One-tap design challenge | High | Medium | High |
| Current system fit | High | Medium | Low-medium |
| Implementation blast radius | Low-medium | Medium | High |
| Migration or data risk | Low | Low | Medium |
| Clutter risk | Low | Medium | Medium |

## Chosen alternative

**Quiet Portal** — one small static Home Screen widget that opens Unified Chat to a fresh unsent composer, ready for typing or a deliberate microphone tap.

It wins because it makes one strong, comprehensible promise: tap Chat, then say what is on your mind. It extends the existing widget and Chat systems without adding a widget preference, exposing private continuity, or inventing a capture-only Chat mode.

## Capability delta

Today, the user cannot:

- Reach a fresh, ready Unified Chat composer directly from an iOS Home Screen widget.
- Open Chat from a system surface without either navigating in-app or inheriting the current default of resuming the latest thread.

After this concept ships, the user can:

- Tap the Kwilt Chat widget once and arrive at a fresh unsent composer with no private content visible outside the app.
- Type immediately or explicitly tap the existing microphone.
- Send the first message into a newly created durable thread without leaving behind an empty thread if they dismiss the composer.

Still intentionally not possible:

- Starting microphone recording automatically.
- Reading recent messages, thread titles, personal context, or Chat output on the widget.
- Choosing or attaching an Arc, Goal, Activity, or Chapter before entering Chat.
- Running Chat or capability mutations inside the widget.

## Before and after user story

Before: Nina has a thought, unlocks her phone, opens Kwilt, finds Chat, decides whether the latest thread is the right place, and then begins typing or recording.

After: Nina taps a calm Kwilt Chat widget and lands in a clean composer. Nothing durable is created until she sends; after send, the normal Unified Chat thread and all existing capability boundaries take over.

## System implications

- Add one static Chat widget to the existing generated `KwiltWidgetsBundle`; no new extension target or app-group data is required.
- Add an explicit widget deep link such as `kwilt://chat?entry=fresh&source=widget` rather than overloading the meaning of ordinary `kwilt://chat`.
- Extend `UnifiedChatRouteParams` and linking parsing with a bounded fresh-entry mode.
- Add a first-send path that creates the durable thread just in time, then sends through the existing run pipeline. The blank composer must not be a second backend or a second editor.
- Reuse existing widget attribution with a Chat-specific destination property; do not collect prompt text, thread metadata, voice data, or attached context.
- Preserve the normal `kwilt://chat` behavior for existing callers unless they explicitly request fresh entry.

## Accepted trade-offs

- A user who wanted to continue the latest thread must open it from Chat's thread list or existing global entry rather than through this first widget.
- The widget remains visually quiet and functionally narrow even though iOS supports richer interactive widgets.
- The first release is iOS-only because it extends Kwilt's existing Apple widget lane.

## Rejected trade-offs

- No thread preview in exchange for stronger Home Screen privacy.
- No New/Continue choice in exchange for actual one-tap entry.
- No auto-recording in exchange for explicit consent and predictable microphone behavior.
- No minimal capture-only Chat presentation in exchange for one recognizable Chat surface.
- No empty thread on open in exchange for a small just-in-time creation path on first send.

## Reductive design decisions

- One widget family in the first release: small Home Screen.
- One tap target and one outcome.
- One label: `Chat`; the primary action says `Ask Kwilt`, framing the widget as a broad conversational doorway without giving the AI an emotional persona.
- No settings, recent-thread list, badges, unread state, prompt suggestions, rotating content, animation, or notification.
- No new Chat data model, memory boundary, entitlement, or capability policy.
- The widget enhances Unified Chat; it does not create a new feature destination.

## Activation path

The natural activation moment is after someone has successfully used Unified Chat enough to understand its value. The learning release does not need an in-app promotion: Andrew can add the widget directly during dogfooding. If repeated use proves valuable, a later one-time, dismissible education moment can appear in Chat or Widgets settings.

Natural adoption means the widget remains on the Home Screen and produces repeated first sends across ordinary days—not merely widget taps or app opens.

## Stated bet

We're betting that the dominant Home Screen Chat moment is a new thought, and that a deterministic fresh composer will feel faster and calmer than either resuming hidden context or asking the user to choose. If that is not true, we would revisit by testing a privacy-safe `New thought` / `Continue` widget rather than adding previews or smart guessing.

## Success signal

During Andrew-only dogfooding, the widget repeatedly turns a live thought into a sent Chat turn with no accidental empty threads, no uncertainty about inherited context, no microphone surprise, and no need to navigate through Kwilt first.
