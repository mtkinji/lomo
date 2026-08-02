# Evaluate Learning: Kwilt Chat Widget

## Learning questions

1. Does a one-tap Home Screen entry meaningfully change how often a live thought becomes a Chat turn?
2. Does a fresh unsent composer feel predictably clean, or does the user usually want to continue the latest thread?
3. Is the handoff fast and visually ready enough that the widget feels different from simply launching Kwilt?
4. Does just-in-time thread creation avoid empty conversations across cold start, backgrounding, cancellation, and retry?
5. Does explicit microphone activation work reliably in the newly built binary after permission grant, denial, and later Settings changes?
6. Does the static, content-free widget feel useful and recognizably Kwilt without becoming Home Screen clutter?

## Evidence plan

Evidence supporting the bet:

- Andrew keeps the widget installed for at least one normal week.
- At least five naturally initiated widget sessions become first sends across multiple days, rather than a single test session.
- Fresh context is correct in ordinary use; the user does not repeatedly leave to find the latest thread.
- No abandoned widget entry creates an empty durable thread.
- Physical-device microphone start, stop, transcription, insertion, and retry work after the native permission fix.
- Qualitative notes describe the path as immediate, calm, and trustworthy.

Evidence disconfirming the bet:

- Widget taps mostly end without a first send after the initial novelty period.
- The user repeatedly wants to resume the latest thread instead of starting fresh.
- Cold-start or WebView readiness makes the widget feel no faster than normal app navigation.
- Empty threads, duplicate first sends, lost drafts, inherited context, permission confusion, or private widget content appear.
- The widget is removed because it does not earn its Home Screen space.

## Instrumentation

Record only bounded events and properties:

- Widget open through the existing app-open attribution path with destination `chat` and entry mode `fresh`.
- Composer ready for a widget-origin fresh entry.
- First send from that entry, linked by an ephemeral launch/session identifier rather than prompt or thread content.
- Abandoned fresh entry without a send.
- Thread-created-on-first-send success or failure.
- Voice state transitions and error class using existing safe Chat telemetry; never audio or transcript content.

Do not record:

- Prompt text, transcript text, audio, message content, thread titles, object names, attached context, or screenshots.
- A persistent behavioral profile whose only purpose is to score Chat-widget engagement.

## Manual dogfood note

For each naturally occurring use, record only:

- approximate situation (`quick thought`, `practical request`, `continuing topic`, or `voice while moving`),
- whether the widget shortened the path,
- whether fresh context was right,
- whether typing or voice was used,
- any lifecycle, permission, or trust friction.

Do not copy the actual private request into the evaluation artifact.

## Decision rule

Evaluate after 7–14 days of Andrew-only TestFlight use and at least five natural first sends.

- **Keep and prepare broader discovery** when the widget remains installed, repeatedly produces first sends, fresh context is usually right, and no trust/lifecycle regression appears.
- **Revise to Two Doors** when continuity demand is common enough that the fresh default repeatedly creates extra navigation.
- **Simplify or retire** when the widget does not earn repeated use, cold-start latency erases the benefit, or a reliable threadless composer requires disproportionate Chat complexity.
- **Block release expansion** for any private-content leak, automatic recording, empty-thread regression, duplicate send, or permission failure in the signed build.

## Expected next action

If the bet holds, add a one-time, dismissible widget education moment for established Chat users and consider the same bounded fresh-entry contract for Lock Screen or Action Button. Do not add richer widget content until a separate privacy and job-value frame justifies it.
