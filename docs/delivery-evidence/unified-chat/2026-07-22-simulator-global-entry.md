# Signed simulator global-entry proof — 2026-07-22

- App version: `1.0.89`.
- App base SHA: `bf0500189807f97c3f2effcdd4d39bcfbc37af0d` with the Unified Chat implementation still uncommitted in its isolated worktree.
- Device class: iPhone 17 Pro simulator, iOS 26.4.1.
- Authentication: existing session hydrated successfully; no account identifier is recorded here.
- Entry kind: global Chat.
- Workbench URL: production `https://www.kwilt.app/embed/chat`.

Observed:

- the native Chat route created and loaded a durable new thread;
- the production workbench rendered inside the native shell;
- global scope was visibly empty rather than silently attaching private data;
- Add context, microphone, composer, menu, thread picker, and new-chat controls rendered with safe-area spacing;
- [simulator-global-entry.png](simulator-global-entry.png) records the sanitized empty-thread state.
- the native app was rebuilt with `ExpoDocumentPicker` linked into the signed simulator binary;
- the paperclip opened the native iOS Files picker;
- the deterministic Markdown note `kwilt-chat-proof.md` was accepted, projected into the composer, and persisted with the sent user message;
- [simulator-attachment-ready.png](simulator-attachment-ready.png) records the selected document before send.
- [simulator-attachment-failed-run.png](simulator-attachment-failed-run.png) records the durable sent document, explicit no-private-context scope, document-read event, safe interrupted state, and retry control.

Runtime issue found and corrected:

- the first attached-note response failed because the grounded-answer response format did not use the proxy's required nested `json_schema` envelope;
- `groundedAnswer.ts` now emits that envelope, with a regression test covering the exact request shape;
- the post-fix `Try again` reused the durable original message and attachment, completed successfully, and visibly summarized the deterministic Friday school note;
- the response separated its direct answer, `What Kwilt found`, and `Limits` rather than presenting unsupported conclusions as stored facts;
- [simulator-attachment-response.png](simulator-attachment-response.png) records the successful grounded response;
- a production database inspection found one matching user message, one attachment, one failed run, one completed retry, and no duplicate message or attachment;
- both runs contain exactly the ordered event sequences `1, 2, 3, 4`; the completed retry reached run version 2 with a persisted assistant message through the atomic transition RPC.

Lightweight To-do capture proof:

- an explicit “create” request auto-applied through the durable proposal/receipt boundary and projected no assistant essay, proposal table, approval button, Inspect button, or Undo button;
- the first compact result exposed a date-only UTC parsing defect between Chat and native detail; the shared local-calendar parser now keeps both surfaces on July 24, with regression coverage;
- tapping the row opened the authoritative native To-do detail and Back returned to the exact originating Chat thread;
- swipe-left exposed the inventory-style red Delete rail, and Delete removed both the Activity and its inline row;
- an ordinary name-only “add milk” request initially clarified because the owner classifier required the word To-do; the classifier and deterministic create fallback now treat ordinary `add`, `create`, `make`, `remember`, and `remind me to` noun phrases as To-do capture while excluding named Money, Goal, Chapter, and Screen Time domains;
- the corrected “add tea” journey created directly and rendered only the standard inventory projection `Today · ~10 min` in [simulator-name-only-quick-add-enriched.png](simulator-name-only-quick-add-enriched.png);
- opening that To-do proved the shared Quick Add enrichment contract produced an entitled cover image, generated steps, reminder, due date, location trigger, and estimate in [simulator-quick-add-enrichment-detail.png](simulator-quick-add-enrichment-detail.png);
- native Back preserved the exact thread and settled row in [simulator-enriched-exact-chat-return.png](simulator-enriched-exact-chat-return.png);
- the embedded workbench cannot render the React Native `ActivityListItem` directly, so it consumes the same `buildActivityListMeta` projection and mirrors the row-tap/swipe-delete contract. The native To-do detail remains authoritative.

Typed To-do update proof:

- the exact-match request `move my tea todo tomorrow` retrieved three bounded candidates and produced one compact proposal for the matching fixture;
- the proposal showed only the requested July 23 change rather than restating the To-do detail model;
- Apply produced an authoritative update receipt;
- read-only production inspection confirmed the date changed while the notes, five generated steps, ten-minute estimate, and difficulty were preserved;
- [`simulator-update-proposal.png`](simulator-update-proposal.png) and [`simulator-update-applied.png`](simulator-update-applied.png) record the sanitized review and result;
- the complete per-step mapping is in [`2026-07-22-simulator-ten-step-matrix.md`](2026-07-22-simulator-ten-step-matrix.md).

Still not exercised in this evidence pass:

- stop, steer, correction, and background/foreground;
- microphone permission and transcription;
- physical-device behavior.

The physical-device build remains blocked by the locked login keychain during code signing, as recorded separately. This remains an explicit score-5 blocker.
