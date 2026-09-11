# Chat startup and dictation repair — local evidence

September 10, 2026. Implementation is local; production deployment and signed-device acceptance remain open.

## What changed

- Native Chat presents KwiltLoader immediately while its WebView loads concurrently with conversation data. Readiness waits for the exact initialization snapshot's rendered acknowledgement, with an eight-second recovery deadline, remount retry, and a documented weaker legacy handshake. First snapshot delivery handles bridge-before-data ordering and rejects callbacks from replaced attempts.
- BottomDrawer keeps its gesture wrapper mounted when content panning is disabled during expansion. A failing regression reproduced two editor mounts; the fix preserves one mount, draft and focus. This removed the second Chat startup observed on the first composer tap.
- Drawer composer uses the existing 24-point dock token on both sides and above the keyboard. Resting bottom spacing accounts for the home-indicator inset. The web workbench remains the sole keyboard-spacing owner.
- Dictation preparation/transcription and recoverable errors are visible outside collapsed-composer styling. Slow status appears after five seconds; controls expose Cancel/Retry only with native recovery support. Stop leaves a draft; Send waits for a successful completion. Cancellation uses an old-site-safe error transition, preventing accidental Send.
- Native dictation has a 20-second total Stop deadline, cancellation/generation guards, duplicate-stop protection, parallel encoding/auth, and retained-clip retry. Clips are discarded on success/cancel/leave/background or after five minutes. The server has a 15-second auth/provider deadline and structured failures. No transport-error fallback re-upload occurs.
- Duration-only startup and dictation events contain no speech, draft, audio or credentials. Dictation requests carry an operation identifier echoed with server authentication/provider/total timings. These timers support subsequent release-build benchmarks; they do not establish a production latency claim.

## UI contract

Job: Open contextual Chat and capture a thought without wondering whether input was lost.
Authority chain: Andrew's bug report and repair plan → Kwilt input guidance and local primitives → iOS keyboard/safe-area behavior.
Three-second read: Chat is opening, ready, transcribing, or needs retry; the state is visible.
Primary action: Compose a message; while waiting, Cancel; after recoverable failure, Retry.
Primary information: Draft and current progress/error. Secondary information: Existing context and attachment affordances.
Reveal later: Retry only after a retained-clip failure; attachment details on demand.
Scan order: Chat context → conversation → composer/status.
Must not add: Automatic sending on cancellation, a second keyboard owner, provider jargon, speculative caching or a new chat architecture.
Reuse map: Native KwiltLoader/EmptyState/Button, shared BottomDrawer, existing site Textarea/Button and dock token.
Nearest precedent: Existing full-screen Chat composer and canonical Kwilt loading/recovery patterns; contextual Chat uses the same behavior in a drawer.
External exemplar ledger: N/A; repair within the established local system.
Behavior sources: Equal composer inset and prompt feedback from Andrew; selected-text insertion and Stop/Send semantics from existing Chat contracts; bounded cancellation/retry from the approved plan.
Unresolved: Whether lunch used Kwilt microphone or iOS keyboard dictation, and which installed build/network reproduced it.
Required states: Initial/delayed/failed bootstrap, rendered fresh/existing chat, keyboard open/closed, preparing/recording/transcribing/error, cancel/retry/expiry, background and chat switch.
Proof path: To-dos → Chat about to-dos → first composer tap; localhost embed fixtures for status and recovery.

## Observed evidence

Native: `/Users/andrewwatanabe/Kwilt`, main at `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, dirty shared checkout; existing binary 1.0.118/118, iPhone 17 Pro Simulator, iOS 26.5. Metro serves this checkout on 8081. Workbench: `/Users/andrewwatanabe/kwilt-site`, branch `codex/mature-pricing-page` at `a5e46fb3d4053ab458d6bf8aa54d3da48fb7819a`, dirty, Next development server 3012. Runtime ownership was coordinated with the Areas keyboard task; no parallel Simulator drivers.

- Native Opening Chat accessibility state appeared on contextual launch. Valid `surface.rendered` receipts were logged.
- Before the drawer fix, first focus expanded the drawer and produced a second initialization, dropping keyboard focus. After the fix, one tap expanded and opened the keyboard; a software-keyboard character appeared and was removed without sending.
- Native screenshot: [keyboard and balanced composer](../../../../artifacts/chat-repair/simulator-keyboard.jpg). Accessibility escape dismissed the drawer. Drag gestures were not conclusively exercised by this automation.
- Browser, 393×600: [before hidden transcription](../../../../artifacts/chat-repair/before-transcribing.png), [visible transcription](../../../../artifacts/chat-repair/browser-transcribing.png), [retry state](../../../../artifacts/chat-repair/browser-retry.png). Computed resting insets were `0px 24px 24px` with no browser safe-area inset. Cancel emitted `voice.cancel`; Retry emitted `voice.retry`. These were synthetic host snapshots, not successful live speech transcription.
- Browser without native initialization showed Opening Chat, then Try again after its deadline; Try again rearmed Opening Chat.
- Development startup samples included 2526 ms before the drawer fix and 785 ms on a later warm launch after it; these are different cache/compile conditions and **not a valid speedup comparison or p95**. No second initialization occurred on final first-focus expansion.

UI critique: Hierarchy and composition pass the observed drawer/browser paths: one composer, immediate state feedback, no added chrome, balanced 24-point side/keyboard insets, and existing input materials. Interaction passes first-focus, typing and accessibility-dismissal checks. Runtime proof remains partial: no signed physical device, VoiceOver session, Android, large text, dark mode, real audio or healthy/slow-network benchmark cohorts.

## Automated checks and release boundary

Regression-first checks covered never-loaded surface, exact rendered acknowledgement, legacy handshake, retry/stale callbacks, dictation cancellation, duplicate Stop, selection switch, retained retry/expiry, recorder URI lifetime, stalled fetch/encoding and shared drawer mount preservation. Native selected-text and existing Stop/Send protocol contracts remain in affected coverage.

The initial scoped verify:local run passed all selected checks (160 Jest suites / 1416 tests, app/test types, architecture, code health, Deno and chat contracts) but reported a stale combined receipt because shared checkout inputs changed. After the drawer and final lifecycle fixes, a fresh scoped verification passed in 92.85 seconds: 183 Jest suites / 1517 tests, app/test types, architecture, code health, Deno and chat contracts. Its 22-file selection omitted 339 other changed files; it does not approve that omitted work. Log: `/tmp/kwilt-chat-repair-final-verification.log`. This receipt was appended after verification; no application source changed afterward.

Final site focused tests passed 171 tests, including viewport and Stop/Send cursor coverage. Site-wide TypeScript remains blocked by the pre-existing `lib/publicRecipeEditorial.test.ts:23` costTier typing error; no production build is claimed. The server handler tests cover authentication, auth/provider stalls, provider errors, silence, rate limiting and an already-aborted request. All five direct server-handler tests passed. Cross-repository protocol conformance passed for all 95 operations, the canonical fixture and the compatibility adapter.

Deployed function inspection found Kwilt project `sqxwjtorodqjdfnuvprf`, unified-chat-transcribe v9 ACTIVE using gpt-4o-mini-transcribe with internal user authentication. It was not deployed by this task. A production site deployment, backend deployment and native release must be tracked independently. Before release, run the integration gate on the actual candidate, then the plan's signed-device/20-sample cohorts and Andrew's original demonstration path. Current source cannot establish that the lunch incident is resolved on the installed release.
