# Learning Release: Kwilt Chat Widget

## Concept To Build

A small, privacy-safe Kwilt Chat Home Screen widget opens Unified Chat to a fresh unsent composer in one tap and creates a durable thread only when the first message is sent.

## Capability Delta

Today, the user cannot:

- Enter a fresh, ready Kwilt Chat directly from the iOS Home Screen.
- Avoid both in-app navigation and inherited latest-thread context when starting a new thought.

After this release, the user can:

- Add a small Kwilt Chat widget to the iPhone Home Screen.
- Tap it and land in the existing Unified Chat composer, ready to type or deliberately start voice input.
- Leave without creating an empty thread, or send and continue in a normal durable thread.

Still intentionally not supported:

- Automatic recording.
- Chat content, thread titles, personal context, status, or responses in the widget.
- Continue-latest behavior, widget configuration, interactive Chat actions, Lock Screen, Action Button, or Android surfaces.

## User Experience

The small widget uses restrained Kwilt visual language, the label `Chat`, and short supporting copy such as `Start a thought`. It contains no private or dynamic personal data.

On tap, iOS opens `kwilt://chat?entry=fresh&source=widget`. Kwilt presents the normal Unified Chat surface in a fresh-entry state with the composer ready. The existing microphone remains an explicit secondary action. If the user closes Chat without sending, nothing durable is created. On first send, Kwilt creates the thread just in time and runs the message through the existing durable Chat pipeline. From then on, the thread behaves exactly like any other Unified Chat thread.

## Existing Product Relationship

This enhances the existing Unified Chat entry system and existing Apple widget bundle. It does not replace Chat's global menu, contextual native entry, thread list, or capability-owned actions. Ordinary `kwilt://chat` behavior remains unchanged; only the explicit `entry=fresh` contract requests the threadless composer.

## Buildable Slice

Must be real:

- Generated Swift for one small Chat widget in `KwiltWidgetsBundle`.
- A stable fresh-entry deep-link contract and parser coverage.
- A threadless composer state in the existing Chat workbench/native host.
- Just-in-time thread creation and first-send execution through the authoritative repository and run pipeline.
- Draft cleanup and lifecycle behavior when the user leaves without sending.
- Existing explicit microphone interaction with the corrected native permission configuration.
- Privacy-safe widget-open and first-send attribution.
- Simulator widget installation/open proof and signed physical-device proof.

Can be thin or temporary:

- The visual can be one polished static composition with no timeline data.
- Widget discovery can remain manual during Andrew-only dogfooding.
- Evaluation can use a short manual dogfood note alongside bounded analytics.

Intentionally excluded:

- Additional widget sizes or configurations.
- Recent-thread content or a Continue action.
- Prompt suggestions or rotating copy.
- In-widget text entry, App Intents that mutate Kwilt, notifications, or proactive behavior.
- New entitlements, storage, backend tables, models, or Chat policies.

## Release Channel

**TestFlight build**, initially Andrew-only. Widget usefulness depends on a real Home Screen, repeated daily access, app lifecycle behavior, and physical microphone permission. A Simulator build remains an implementation gate, but it is not sufficient learning evidence for this surface.

Use Kwilt's existing `production-widgets` release lane so the widget extension and main app are signed together. Report EAS upload, App Store Connect processing, tester availability, installation, widget discovery, and signed-device behavior as separate proof stages.

## Brand-Goodwill Guardrails

- The widget should look intentional at small size, not like a debug shortcut.
- No private content leaves the app surface.
- No recording begins until the microphone is tapped in Chat.
- No empty threads, promotional prompts, badges, urgency, or attention extraction.
- If Chat is unavailable or signed out, use the existing honest Chat error/recovery path rather than a widget-specific promise.

## Reversibility

The widget can be removed from `KwiltWidgetsBundle` and the `entry=fresh` route can remain harmless or be retired without migrating data. No new backend records exist beyond ordinary threads created after an actual send. Analytics use existing event infrastructure and can be removed independently.

## Permanent Product Threshold

Keep the widget as a permanent capability when real-device dogfooding shows repeated natural first sends, clean lifecycle behavior, understandable fresh context, reliable voice activation, and no empty-thread or privacy regressions. If taps rarely become sends or Andrew repeatedly wants continuity, revise the entry semantics before broader promotion.
