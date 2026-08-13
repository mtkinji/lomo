---
id: brief-chat-widget
title: Kwilt Chat Home Screen Widget
status: accepted
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-get-help-without-retelling-my-life, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [unified-chat]
owner: andrew
last_updated: 2026-08-13
---

# Kwilt Chat Home Screen Widget

## Context

Unified Chat is globally reachable inside Kwilt, but the Home Screen still begins with app navigation and currently defaults to an existing thread. When a thought is already live, that orientation cost works against the moment the user is ready to type or speak. Kwilt already ships an Apple widget extension and a durable Chat system, so the opportunity is a narrow entry contract rather than a new assistant or conversation backend.

## Target audience

AI-native life operators expect AI to be available where an intention begins, but they also expect private context, authorization, and durable changes to remain bounded and inspectable.

## Representative persona

Nina has a practical thought or question while her phone is in hand. She wants to enter Kwilt Chat immediately without choosing an object, inheriting uncertain thread context, exposing private content on her Home Screen, or triggering recording before she asks.

## Aspirational design challenge

How might we help Nina move from a live thought to the existing trusted Kwilt Chat in one calm tap, while preserving privacy, explicit recording, and one authoritative conversation system?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — system-level convenience matters only when it lands in the same reliable, permissioned, reversible Chat the user already trusts.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, step 2: express a practical job in ordinary language or voice. The step is currently scored 3. Text and native voice exist, but a system-level fresh entry is absent and physical-device microphone/lifecycle proof remains incomplete.

## JTBD framing

When something is already on my mind, let me reach the one authoritative Kwilt Chat without navigating or reconstructing context (`jtbd-get-help-without-retelling-my-life`), and let the thought become usable input without administrative setup (`jtbd-capture-and-find-meaning`). Do this without leaking private content, auto-recording, or creating empty durable conversations (`jtbd-trust-this-app-with-my-life`).

## Design

### Widget

- Add one small static Home Screen widget to the existing generated `KwiltWidgetsBundle`.
- Present the quiet identity `Kwilt`, the title `Chat with Kwilt`, and the shared launcher CTA `Start` followed by a right arrow. The title and CTA align exactly with the Focus widget.
- Make the entire widget one tap target to `kwilt://chat?entry=fresh&mode=conversation&source=widget`.
- Display no thread title, message excerpt, prompt suggestion, personal context, badge, count, or status.
- Do not add configuration, additional sizes, timeline data, App Intent mutations, Lock Screen, or Android surfaces in this release.

### Fresh-entry contract

- Preserve ordinary `kwilt://chat` behavior for existing callers.
- Parse only the explicit `entry=fresh` value into a bounded Unified Chat route mode; ignore unknown values safely.
- Fresh entry shows the normal Unified Chat workbench/composer with no inherited thread context and makes text entry ready.
- The microphone remains visible and user-initiated. A widget tap never starts recording.
- Leaving before first send removes the transient draft state and creates no durable thread.

### First send

- When a valid `run.send` arrives from a fresh threadless composer, create one durable thread through the existing repository, initialize the existing workbench snapshot, then send the prompt through the normal run pipeline.
- The first-send path must be single-flight: repeated bridge messages or rapid taps cannot create duplicate threads or duplicate messages.
- If thread creation fails, preserve the unsent prompt locally and present the normal honest Chat error/retry state.
- After creation, replace the route with the durable `threadId`; resume, title generation, capability tools, proposals, receipts, navigation, and undo behave exactly like any other thread.

### Attribution and privacy

- Reuse existing widget-open attribution with destination `chat` and entry `fresh`.
- Add bounded composer-ready, first-send, abandoned-entry, and thread-creation outcome events only if they are needed to answer the learning questions.
- Never record prompt/transcript text, audio, thread titles, object names, attached context, or screenshots.

### Release

- Verify the generated Swift and native project contract locally.
- Prove widget install/open in Simulator with checkout, branch, commit, dirty state, native build, and Metro provenance recorded.
- Ship through the existing `production-widgets` TestFlight lane for Andrew-only dogfooding.
- Treat EAS upload, App Store Connect processing, tester availability, installation, widget discovery, microphone permission, and real-device first send as separate gates.

## Success signal

Across 7–14 days of Andrew-only use, the widget remains installed and produces at least five natural first sends across multiple days. Fresh context is usually right, leaving never creates an empty thread, voice works on the signed device, and the shortcut feels immediate and calm rather than like Home Screen clutter.

## Spec refinement

### Decisions made

- Fresh unsent composer is the first-release default; Continue is a later fallback concept if dogfooding contradicts the bet.
- The widget is small, static, content-free, and iOS-only.
- No thread exists until first send.
- The existing Unified Chat surface, repository, run pipeline, and capability policies remain authoritative.
- TestFlight is the learning channel because Home Screen habit, lifecycle, and microphone permission require a signed physical device.

### TDD posture

- Required tests first: deep-link parsing, fresh-entry state transitions, just-in-time thread creation, single-flight/duplicate protection, retry, abandonment, and privacy-safe telemetry payloads.
- Generator contract tests first: Chat Swift template inclusion, widget kind, small-family support, content-free copy, deep link, and bundle registration.
- Presentational Swift styling can be implemented after its structural contract test.

### Acceptance criteria

- `kwilt://chat` retains its current latest-thread behavior.
- `kwilt://chat?entry=fresh&source=widget` opens a composer with no active durable thread.
- Tapping the widget never requests microphone permission or starts recording.
- Closing before send creates zero threads.
- First send creates exactly one thread and exactly one user turn, then updates navigation to its `threadId`.
- Thread-creation failure preserves the prompt and supports retry without duplication.
- The widget contains no dynamic personal data.
- Generated native config retains iOS microphone usage text and Android recording permission.
- Focus, Activities, Streak, Money, and Live Activity widgets remain registered and their generator contracts pass.
- Diff-aware verification passes; Simulator and signed-device evidence are reported separately.

### Implementation gate

The current checkout contains active Focus-widget changes in the shared widget generator, generator contract test, and linking configuration. Chat-widget implementation must begin only after those changes are committed/integrated or Andrew explicitly authorizes an isolated parallel worktree with a stated integration target.

## Open questions

No build-blocking product questions remain. After dogfooding, decide whether repeated continuity demand justifies a privacy-safe `New thought` / `Continue` configuration.
