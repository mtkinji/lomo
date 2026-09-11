# Chat startup, composer placement, and transcription repair plan

> **For agentic workers:** Use `executing-plans` to implement this plan inline, task by task. Use subagents only if Andrew explicitly requests delegation. Checkboxes represent future work, not completed fixes.

**Goal:** Make contextual Chat appear promptly with a correctly positioned composer, and make speech-to-text fast, visibly active, and recoverable when it fails.

**Architecture:** Keep the shared native Chat host and site-owned workbench. Separate native surface startup, web initialization, and conversation data readiness; keep one owner of keyboard and bottom spacing. Treat microphone capture, transcription transport, and inserting the result into the draft as one cancellable operation with visible progress.

**Tech stack:** React Native/Expo, WKWebView, React/Next.js, Expo Audio, Supabase Edge Functions, the OpenAI transcription endpoint, Jest, node:test, and Deno tests.

**Status:** Implemented locally September 10, 2026, with focused regressions and browser/Simulator evidence. Signed-device latency cohorts and production release remain open. See [implementation and proof record](../../design-system/evidence/chat-repair/README.md). Timing values below remain proposed targets, not measured guarantees. Unchecked items retain unverified acceptance work, including full phase profiling and release benchmarks.

## Report and evidence boundary

Andrew encountered these failures while showing Kwilt to a friend at lunch:

1. Contextual Chat stayed blank for a long time before appearing. It gave no clear loading feedback. Once visible, its composer was not evenly inset from the sides, bottom, and rounded corners.
2. Speech-to-text in full-screen Chat never produced text during the time Andrew waited, and gave no clear indication that transcription was underway.

The two supplied attachments both appear to show Areas with the iPhone keyboard open. Neither visibly shows the contextual Chat composer or a transcription state. They cannot establish the reported geometry, elapsed time, or cause. Preserve the written report; do not infer that Areas is the affected Chat launch surface.

The microphone used at lunch is unconfirmed: Kwilt's composer microphone and iPhone keyboard dictation have different pipelines. An optional clarification was requested. Start with the confirmed gaps in Kwilt's own microphone path, and reproduce keyboard dictation separately if that was the reported entry. The installed app version/build, Chat launch surface, recording duration, network, and elapsed wait remain unrecorded; capture these with the first reproduction.

## Current source findings

These are verified facts about the local source, not proof that the installed lunch-time build contains the same code.

| Finding | Source | Implication |
| --- | --- | --- |
| A fresh contextual drawer embeds the same `UnifiedChatScreen` as full-screen Chat, with `presentation="drawer"`. Native drawer keyboard avoidance is disabled and the web content extends into the bottom safe area. | [UnifiedChatDrawer.tsx](/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatDrawer.tsx) | A visually small drawer still depends on the full web workbench. Preserve one keyboard/bottom-inset owner. |
| Fresh entry initializes `loading` to false. The WebView loads a remote URL; this host has no native loading overlay, load-progress handler, HTTP-error handler, or native readiness deadline. `surface.ready` only means the web bridge has announced itself. | [UnifiedChatScreen.tsx](/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreen.tsx) | There is a native feedback gap before web content is usable. The precise source of the long wait still needs timing evidence. |
| Existing-thread entry waits on thread reads/recovery before mounting the WebView. Fresh entry starts a thread-list request but does not wait for it to render. | [UnifiedChatScreen.tsx](/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreen.tsx) | Separate fresh and existing-thread traces. Do not blame a blocking history fetch for fresh entry without evidence. |
| The web drawer has a bootstrap composer and `aria-busy`, but no explicit visible loading message. Its eight-second initialization timer starts only when its React effect runs. | [KwiltChatWorkbench.tsx](/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx) | This cannot cover time before the remote document/JavaScript arrives. A visually plausible but inert composer also needs an understandable unavailable state. |
| Mobile drawer resting rules use 28px inline padding and 12px bottom padding; other composer states use different rules. | [KwiltChatWorkbench.module.css](/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.module.css) | Concrete unequal-spacing candidate. Actual screen-edge gaps also depend on native bounds, web viewport, safe area, and corner geometry. |
| A site test explicitly asserts the 28px/12px drawer rule. | [unifiedChatComposerLayout.test.ts](/Users/andrewwatanabe/kwilt-site/lib/unifiedChatComposerLayout.test.ts) | The test preserves today's implementation; it does not prove Andrew's visual requirement. Replace that expectation when repairing geometry. |
| Native voice sets `transcribing` before awaiting transcription. The web creates “Transcribing…” text, but the resting composer hides `.composerStatus`; layout selection ignores `hasStatus`. | [UnifiedChatScreen.tsx](/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreen.tsx), [unifiedChatComposerLayout.ts](/Users/andrewwatanabe/kwilt-site/lib/unifiedChatComposerLayout.ts), [workbench CSS](/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.module.css) | Empty, unfocused dictation can have a real pending state that is invisible. Error-message routing also needs rendered coverage because voice errors can use the live-dock presentation. |
| Recording stop, file encoding, auth lookup, upload, JSON parsing, and transcript insertion occur serially. The client fetch has no abort signal/deadline; fallback URLs can be tried after transport exceptions. | [unifiedChatVoice.ts](/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/unifiedChatVoice.ts) | No bounded user-visible completion or cancellation contract. This does not establish that upload or the provider caused the incident. |
| The Edge Function authenticates, decodes base64, and calls `gpt-4o-mini-transcribe`. Its upstream fetch has no explicit deadline or exception boundary. | [transcribe/index.ts](/Users/andrewwatanabe/Kwilt/supabase/functions/unified-chat-transcribe/index.ts) | Provider stalls and transport exceptions need bounded, structured outcomes. |
| Selected-text insertion and distinct recording Stop/Send intents already exist. | [unifiedChatTranscriptInsertion.ts](/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/unifiedChatTranscriptInsertion.ts), [workbench](/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx) | Retain these behaviors; successful transcription must not unexpectedly send a stopped recording. |

Prior compatibility/fresh-entry work is relevant regression coverage, not an established explanation for this incident. Preserve the current operation catalog, recovery behavior, and stale-thread guards. The [September 9 compatibility plan](/Users/andrewwatanabe/Kwilt/docs/superpowers/plans/2026-09-09-chat-compatibility-recovery.md) and [voice proof record](/Users/andrewwatanabe/Kwilt/docs/qa/unified-chat-voice-proof.md) have separate historical proof boundaries; recheck their deployed status during implementation.

## Desired behavior and proposed acceptance targets

| Area | Acceptance |
| --- | --- |
| First feedback | Within 100ms of the drawer opening or recording Stop being acknowledged, show the relevant visible state. For chat, render native loading feedback on the first available frame, independently of network/JavaScript. |
| Chat startup speed | On a declared representative iPhone with a release build and healthy network: fresh warm open p95 ≤500ms to usable composer; cold web open p95 ≤2s. Report fresh/existing-thread and warm/cold separately. A spinner does not satisfy the speed target. |
| Startup failure | Offline/error produces a visible retry state. No successful initialization within eight seconds produces a bounded recovery state. Every retry starts a new attempt/deadline and old callbacks cannot complete it. |
| Composer placement | Equal measured left/right gaps; one agreed optical gap around the bottom and curved corners. Straight-edge comparisons within 2 logical pixels after accounting for the designated safe-area boundary. Capture rounded-corner screenshots; equal CSS numbers alone are insufficient. |
| Keyboard | Composer, caret, and actions stay visible through 60% → 100% drawer expansion, keyboard opening/closing, drawer collapse, and multiline growth. No double inset, overlap, clipped controls, or lost draft/focus. |
| Transcription feedback | Visible progress indicator plus “Transcribing…” remains visible for empty/unfocused and populated composers. After five seconds, use “Still transcribing…” with Cancel. Accessible status announcements and reduced-motion behavior remain understandable. |
| Transcription speed | For clear 5–15-second utterances on the declared device/healthy network, stop-to-editable-text p50 ≤3s and p95 ≤8s. Test longer speech separately and record audio duration/size. |
| Bounded transcription | Start a 20-second total application deadline at Stop, covering recorder finalization, encoding/auth, upload, response body, and insertion. At deadline, leave pending state and offer recovery. Use a shorter server-owned deadline, initially 15 seconds after request entry. These are UX budgets to validate, not provider limits. |
| Draft integrity | Stop inserts once into the correct draft without sending. Explicit Send recording sends once after success. Cancel, failure, retry, navigation, and late results never overwrite another conversation or duplicate text/messages. |

Measure at least 20 repeats for each declared startup/short-utterance cohort; retain individual samples, observed p50/p95, failures, and device/network conditions. This is a repeatable acceptance sample, not a population reliability claim. Slow/offline tests evaluate bounded recovery rather than healthy-network speed.

## Task 1: Capture a reproducible baseline and locate the delay

**Read:** the source files above; [input guidance](/Users/andrewwatanabe/Kwilt/docs/design-system/input-guidance.md); [UnifiedChatScreenPresentation.tsx](/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreenPresentation.tsx); [unifiedChatViewport.ts](/Users/andrewwatanabe/kwilt-site/lib/unifiedChatViewport.ts).

**Create during implementation:** `/Users/andrewwatanabe/Kwilt/docs/qa/chat-startup-layout-and-transcription-proof.md` for the reproduction record. Add focused timing events through `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/unifiedChatTelemetry.ts` and `/Users/andrewwatanabe/Kwilt/src/services/analytics/events.ts` if existing diagnostics cannot separate the phases.

- [ ] Record app/build, installed binary source, actual workbench origin/deployment, backend function version, device/OS, recording entry, and network. Confirm the exact contextual launch surface before calling a reproduction equivalent to lunch.
- [ ] Trace `tap → drawer visible → WebView load start → document loaded → bridge ready → valid initial snapshot rendered → composer usable`. For existing chats, separately time thread list/read/recovery. Also time JS long tasks and workbench asset transfer/hydration.
- [ ] Trace `Stop → recorder stopped → audio encoded → auth ready → request sent → function authenticated → provider started/finished → client parsed → draft rendered`. Use an operation ID and durations measured within each process; do not subtract unsynchronized native/server clocks.
- [ ] Log duration, size, state, outcome category, build/deployment and correlation identifiers. Do not log raw speech, draft content, base64, or credentials.
- [ ] Reproduce empty and populated drafts, first open/reopen, existing thread, cold/warm cache, slow/offline network, and repeated microphone taps. Add a scripted stalled-response fixture so the failure does not depend on a real provider being slow.
- [ ] Name the phase responsible for each measured delay before choosing a performance optimization. Preserve unresolved incident attribution explicitly if the original build cannot be reproduced.

**Exit:** a timeline that distinguishes document loading, native data work, rendering, transcription service time, and draft delivery; measured screenshots for the geometry defect.

## Task 2: Give Chat an immediate, bounded startup state

**Modify:** `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreen.tsx`, `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreenPresentation.tsx`, `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx`.

**Create:** `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/useChatSurfaceReadiness.ts` and its `.test.tsx`, to own attempt generation, startup deadline, and terminal recovery without enlarging the screen's existing command handler.

- [ ] Write failing hook/render regressions for a never-loading document, bridge-ready without a usable snapshot, HTTP failure, web-content process termination, retry, and a late success from a replaced attempt. Verify a fresh draft does not wait on thread-list completion.
- [x] Render an immediate native loading state using the existing `/Users/andrewwatanabe/Kwilt/src/ui/KwiltLoader.tsx` with “Opening Chat…”. Keep the WebView mounted behind it so loading can progress. The loading state must not depend on the remote page's own loader or conceal the drawer's dismissal affordance.
- [ ] Connect `onLoadStart`, `onLoadEnd`, `onHttpError`, `onError`, and `onContentProcessDidTerminate` to readiness/recovery. Loading the document is a timing milestone, not proof the composer is ready. Do not report success solely from `surface.ready`.
- [x] Add an optional render acknowledgement across both protocol implementations. Define `surface.rendered` to acknowledge the exact `host.initialize` request ID after its snapshot has committed to the web UI. Bind accepted acknowledgements to the active load attempt. Use `surface.ready` capability negotiation for this extension so older native/site versions still interoperate; test old/native-new/site and new/native-old/site combinations. For older surfaces, retain explicit legacy fallback and label its weaker readiness evidence.
- [ ] Update `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/workbenchProtocol.ts`, `/Users/andrewwatanabe/kwilt-site/lib/unifiedChatProtocol.ts`, their tests, and `/Users/andrewwatanabe/Kwilt/protocol-fixtures/kwilt-unified-chat-v2.json` plus its companion fixture when adding that event. Keep strict validation and full operation conformance.
- [x] Make the web bootstrap visibly loading with disabled placeholder actions. Re-arm the web initialization timeout on every retry; its existing mount-only timer cannot be reused after it has fired. Clear both native and web timers after success/unmount.
- [x] Ensure retry remounts/reloads one active WebView and preserves native draft/context. Avoid invoking `reload()` on a ref whose WebView was conditionally removed by the failure state.

Run the focused readiness test first red, then green:

```bash
cd /Users/andrewwatanabe/Kwilt
npm test -- --runInBand src/features/unifiedChat/useChatSurfaceReadiness.test.tsx src/features/unifiedChat/UnifiedChatDrawer.test.tsx src/features/unifiedChat/workbenchProtocol.test.ts
```

**Exit:** zero unlabelled startup waits; a failed/slow page always permits recovery; verified acknowledgement and retry ordering. This task addresses feedback/recovery; Task 3 remains necessary for speed.

## Task 3: Remove the measured startup bottleneck

**Likely edit sites:** `/Users/andrewwatanabe/kwilt-site/app/(embed)/embed/chat/page.tsx`, `/Users/andrewwatanabe/kwilt-site/app/(embed)/embed/chat/layout.tsx`, `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx`, `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreen.tsx`.

- [ ] From Task 1, select the slowest measured phase and retain its failing timing/reproduction case.
- [ ] If document/assets/hydration dominate, inspect the production embed bundle and its parent layouts, separate heavy transcript/artifact rendering from initial composer work, and verify static asset caching and document delivery. Keep first composer rendering independent of transcript-only markdown/artifact work. Check actual cold and warm loads after each change.
- [ ] If repeated WebView initialization dominates, evaluate bounded workbench reuse or prewarming in the existing host. Require cleanup on logout/account change, no hidden microphone activity, no stale thread/context/draft leakage, and measured memory cost. Adopt it only if the trace shows the benefit.
- [ ] If existing-thread reads/recovery dominate, render loading chrome while that work proceeds and remove unnecessary serialization/duplicate reads. Preserve recovery ordering and mutation reconciliation; do not blindly run dependent recovery stages in parallel.
- [ ] If native JS stalls dominate, profile synchronous mount/snapshot work and move only the measured nonessential work off the opening path. Do not remove launch context or thread safety to improve a timing number.
- [ ] Repeat the same release-build cohorts. If the small surface still misses its budget because its remote bootstrap is inherently blocking, record a scoped local/bundled shell proposal with cache/versioning implications as the next architectural decision. Do not mark this task complete after merely adding loading feedback.

**Exit:** recorded before/after measurements meet the startup targets, or an explicit unresolved bottleneck and concrete architectural decision remain open. Do not silently relax the targets.

## Task 4: Correct composer geometry as a shared host contract

**Modify:** `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.module.css`, `/Users/andrewwatanabe/kwilt-site/lib/unifiedChatComposerLayout.test.ts`, and `/Users/andrewwatanabe/kwilt-site/lib/unifiedChatViewport.test.ts`. Change the viewport helper, native drawer, or bridge inset contract only where measurement shows they contribute.

- [ ] Capture composer bounds relative to the physical screen and drawer/WebView content boundary at both snap points, before and after focus. Record native bottom safe inset and the web's resolved safe inset to identify missing/double application.
- [ ] Replace the test that mandates 28px/12px with a behavior/geometry regression. Keep source assertions only for ownership invariants; rendered measurements and corner screenshots are the geometry acceptance.
- [ ] Use one shared drawer composer inset variable for inline and bottom optical spacing, reconciled with the actual safe-area owner. Start the visual trial at 16 logical pixels; select the final canonical value using the recorded device/corner comparison. Document whether the bottom measurement is to the screen edge, safe-area boundary, or keyboard. Do not add the home-indicator inset again above an already reduced viewport.
- [ ] Keep the web workbench as the current keyboard/bottom owner and `keyboardAvoidanceEnabled={false}` in this drawer unless the measured fix intentionally transfers ownership. Use existing owned inputs and design tokens; preserve the concurrent input-material migration.
- [ ] Apply compatible placement to bootstrap, resting, expanded, recording, and transcribing states. Exercise full-screen Chat as a regression host. Retain one textarea through focus/layout transitions.
- [ ] On a real iPhone, verify both snap points, keyboard open/closed, interactive keyboard dismissal, collapse after typing, long draft/caret scrolling, increased text size, and corner/home-indicator clearance. Save annotated gaps plus unannotated screenshots.

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/unifiedChatComposerLayout.test.ts lib/unifiedChatViewport.test.ts
```

**Exit:** the composer's spacing reads as even on the device, and its text/actions remain usable. A CSS test pass alone does not close this task.

## Task 5: Make transcription visible throughout the operation

**Modify:** `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx` and its CSS; `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/UnifiedChatScreen.tsx`. Extend existing composer/voice tests with a rendered visibility check.

- [ ] Reproduce the empty, blurred `transcribing` snapshot and prove its status is hidden before changing it. Include error states and both Chat presentations.
- [ ] Render operation status in a dedicated visible region of the composer composition that is not suppressed by `.composerResting`. Retain the compact idle composer. Show an indeterminate indicator while transcribing, descriptive status, and a Cancel control; use a readable wrapping error with recovery actions rather than clipped status-chip text.
- [ ] Acknowledge the initial microphone tap visibly while permission/recorder preparation is pending. Lock duplicate start/stop commands for the same operation; change to recording only after the native recorder starts.
- [ ] At Stop, replace the recording waveform with transcription progress immediately. After five seconds show the slow-progress message. Return to an editable draft on success, or actionable recovery on failure. Do not display invented completion percentages.
- [ ] Preserve Stop versus Send recording. Recording Stop is dictation into the draft; only the user's explicit Send intent may submit after transcription. Cancel/failure clears pending Send intent, and retry requires a fresh send decision to avoid surprising late submission.
- [ ] Preserve selected-text insertion and edits made while waiting. Pending snapshots must not replace a newer typed draft; use the existing insertion helper and operation identity to reject stale completions.
- [ ] Verify status visibility with actual computed styles, focus, and VoiceOver. Cover reduced motion, enlarged text, keyboard hidden, populated/empty draft, and error-to-retry transitions.

**Exit:** the user can always tell recording from transcription, waiting from failure, and Stop from Send; status is visible without focusing the composer.

## Task 6: Bound transcription, support retry, and optimize measured latency

**Modify:** `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/unifiedChatVoice.ts`, its `.test.ts`, and the native voice command integration; `/Users/andrewwatanabe/Kwilt/supabase/functions/unified-chat-transcribe/index.ts`.

**Create:** `/Users/andrewwatanabe/Kwilt/src/features/unifiedChat/useChatDictation.ts` and `.test.tsx` to own operation generation, draft/thread identity, lifecycle cancellation, and late-result suppression. Extract a testable server handler into `/Users/andrewwatanabe/Kwilt/supabase/functions/unified-chat-transcribe/handler.ts` with `/Users/andrewwatanabe/Kwilt/supabase/functions/unified-chat-transcribe/__tests__/handler_deno_test.ts`.

- [ ] Write failing regressions for never-resolving fetch/body parsing, thrown fetch, empty transcript, auth failure, 429/5xx, cancellation, double Stop, retry, and navigating to another chat before completion. Add a stalled recorder-stop/encoding/auth case so the deadline covers more than fetch.
- [ ] Separate finalizing the recorded clip from submitting it for transcription. Keep the clip available privately for explicit retry within the current foreground attempt. Retry reuses that clip; it must not require `recording` to still exist after the recorder was released.
- [x] Start one absolute client deadline at Stop. Pass one abort signal through upload and response handling, use the remaining budget across any eligible fallback, clear timers in `finally`, and reject late nonabortable work by operation generation. Abort must not be mistaken for permission to try another URL.
- [x] Add distinct Cancel and Retry bridge commands with protocol validation and old/new compatibility tests. Cancel/unmount/account switch invalidates the attempt before stopping work. Ensure the web clears pending Send intent before retry.
- [ ] Retain the clip only for the current recoverable operation. Delete it on success, explicit discard/cancel, leaving the chat, logout, or a five-minute retry expiry. If the process/file is gone, state that re-recording is necessary; do not offer a retry that cannot work. Never auto-upload a retained clip.
- [x] Bound authentication/provider work on the server, catch transport exceptions, and return structured timeout/provider/auth/empty-audio outcomes. Preserve the current authenticated-user check and size limits. Release resources and suppress late responses even where the underlying operation cannot be cancelled.
- [ ] Correlate server timings with the client operation without exposing credentials or speech. Confirm the intended deployed function exists and its version/config matches the candidate before attributing a slow result to a model.
- [ ] Optimize the measured dominant phase. If encoding/upload dominates, compare a speech-appropriate mono recording configuration and binary transport against the current high-quality recording/base64 path, preserving intelligibility and MIME/size validation. If provider time dominates, benchmark the existing route against documented alternatives using the same consented synthetic audio. If draft rendering dominates, repair bridge/state delivery.
- [ ] Consider streamed text only if measurements justify the added client/server lifecycle. File transcription supports partial streaming without a Realtime conversation, including existing `gpt-4o-mini-transcribe` integrations; it still cannot remove upload time for a completed recording. See the [OpenAI transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text). Keep partial text provisional and do not duplicate final insertion or auto-send incomplete text.
- [ ] Re-run normal and throttled-network samples. Product deadlines must be substantially shorter than infrastructure failure limits; Supabase documents a 150-second request idle timeout, which is not an acceptable chat waiting experience. See [Edge Function limits](https://supabase.com/docs/guides/functions/limits).

```bash
cd /Users/andrewwatanabe/Kwilt
npm test -- --runInBand src/features/unifiedChat/unifiedChatVoice.test.ts src/features/unifiedChat/useChatDictation.test.tsx src/features/unifiedChat/unifiedChatTranscriptInsertion.test.ts
deno test --allow-env --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/unifiedChatTranscription_deno_test.ts supabase/functions/unified-chat-transcribe/__tests__/handler_deno_test.ts
deno check --no-lock --config supabase/functions/tsconfig.json supabase/functions/unified-chat-transcribe/index.ts
```

**Exit:** short dictation meets the speed targets; stalls terminate predictably; retry/cancel/navigation never lose an existing typed draft or insert/send twice. A timeout alone does not satisfy the latency target.

## Task 7: Verify the complete experience and release boundaries

- [ ] Run each focused regression red before implementation and green after its repair. Keep protocol, selected-text insertion, voice completion cursor, viewport recovery, and fresh-entry race regressions in affected coverage.
- [x] Verify the current candidate once with `npm run verify:local -- --run --files` and the exact changed native files. Read the omitted-file report. Use `npm run verify:local -- --report` before repeating unchanged checks; report unrelated shared-contract failures without absorbing unrelated work.
- [ ] Run site focused tests for protocol, recovery, composer, viewport, and voice completion, plus that repository's required type/build gates. Run `node scripts/unified-chat-protocol-conformance.mjs` from the Kwilt checkout after both protocol copies change.
- [x] Inspect the actual embed in a browser for rendered status/layout and delayed-bootstrap fixtures. Then perform Simulator checks only after coordinating the one runtime owner. Browser geometry does not substitute for native WebView keyboard/safe-area proof.
- [ ] Test a signed physical-device build: contextual chat cold/warm open, existing chat, repeated close/reopen, long draft, both drawer snap points, microphone permission, short/long speech, noisy-room speech, slow/offline connection, Cancel/Retry, background/resume, thread switch, and Bluetooth input where used. Separately reproduce iPhone keyboard dictation if that was the incident entry.
- [ ] Keep three outcomes separately open until proven: **startup speed/recovery**, **composer geometry**, **transcription speed/recovery**. One passing slice does not close the others.
- [ ] Before integration/publication run the uncached `npm run verify:changed -- --run` against the actual integration candidate; inspect intended scope, secrets and whitespace. Preserve existing review and release requirements. Do not publish unrelated dirty work.
- [ ] Record native app commit/build, site deployment commit, Edge Function version/model/config, device/OS, backend, and runtime owner together. Compatible site/backend updates and a new native binary may all be necessary. Upload success, TestFlight availability, and App Store release are distinct checkpoints.
- [ ] Repeat Andrew's original demonstration flow on the resulting installed build before saying the reported issues are fixed. Append concrete results to the proof record rather than checking off source-only evidence as device success.

## Checkout and handoff constraints

Planning baseline:

- Native: `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, extensive existing dirty work including `UnifiedChatScreen`, `BottomDrawer`, and shared inputs.
- Hosted workbench: `/Users/andrewwatanabe/kwilt-site`, branch `codex/mature-pricing-page`, HEAD `a5e46fb3d4053ab458d6bf8aa54d3da48fb7819a`, existing dirty work including the workbench, input material, protocol/recovery, pricing and other site files.
- No worktree or branch switch is required for this planning task. Before implementation reread current status, HEAD, affected files and applicable instructions; both checkouts are actively shared and this snapshot will drift.
- Another task requested exclusive Simulator ownership for Areas keyboard verification during this investigation. This task did not use the Simulator or claim runtime ownership. Coordinate again before native execution.
- Keep changes to a cohesive slice and review only its hunks for a commit; do not stage whole shared files blindly. No implementation, commit, external task creation, or deployment is implied by the existence of this plan.

**Recommended sequence:** baseline → startup feedback/recovery → measured startup speed → geometry → transcription visibility → transcription lifecycle/speed → integrated device proof. Startup/geometry and transcription can be released as separate verified slices once their dependencies and compatibility checks are satisfied.
