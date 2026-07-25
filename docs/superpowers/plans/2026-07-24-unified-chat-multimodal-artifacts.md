# Unified Chat Phase 6 — Multimodal evidence and editable artifacts

> Execute this plan in the `codex/kwilt-chat-trust-program` worktree. Preserve the Phase 7 canonical thread/run/proposal/receipt architecture and the existing Kwilt AI proxy.

## Goal prompt

Make Kwilt Chat trustworthy with the ordinary material people bring to an assistant: text documents, screenshots, photos, PDFs, and mixed text-image requests. Inspect every supported attachment through the existing authenticated Kwilt AI path, expose what was and was not successfully inspected, scope attachment-derived evidence to its owning turn and exact retry, and ensure removing a draft attachment prevents it from influencing the request. Let useful assistant output become a small, durable, editable artifact without confusing that artifact with a Kwilt capability mutation or receipt.

Kwilt jobs remain primary. Attachments may inform capability questions and reviewed proposals, but they never bypass capability-owned reads, proposals, permissions, or receipts.

## Architectural decisions

- Draft binary bytes remain transient on the device. They travel as bounded data URLs through `ai-chat`; they are not written into Postgres or a public object store.
- The multimodal inspection call uses the Responses API through the existing proxy. Images are `input_image` parts and PDFs are `input_file` parts. The call returns a strict, per-file inspection record.
- The canonical message attachment stores source metadata, media kind, inspection status, and bounded extracted observations. The downstream Chat turn consumes those observations as untrusted user-supplied evidence.
- Attachments belong only to the message that persisted them. Normal history and conversation summaries do not re-inject their extracted content. An exact failed-run retry may reuse the persisted inspection.
- A failed or partial inspection is visible and cannot silently become “ready.” A failed draft blocks send until it is removed or successfully retried.
- Assistant artifacts are separate owner-scoped records linked to the producing run and message. Editing an artifact changes only that artifact, with optimistic concurrency; it never implies a Kwilt domain write.

## Phase 6A — Attachment contract and native intake

### Work

- Replace the text-only attachment type with a discriminated text/image/PDF draft and persisted contract.
- Accept PNG, JPEG, WEBP, and PDF in addition to the current bounded text formats.
- Enforce count, per-kind byte, total byte, filename, MIME, and data-URL validation before network use.
- Project `inspecting`, `ready`, `partial`, and `failed` states into the workbench protocol and attachment chips.
- Preserve mixed text plus up to three attachments in one composer request.

### Done when

- Regression-first tests reject spoofed MIME/data URLs, unsupported formats, excess count/bytes, duplicate ids, and empty extraction.
- Picker tests prove text remains local while image/PDF bytes become bounded data URLs.
- Removing a draft deletes its bytes and inspection result from the next request payload.

## Phase 6B — Model-native inspection through the Kwilt proxy

### Work

- Add a `unified_chat_attachment` Responses route job with server-authoritative model selection and no hosted web search or function tools.
- Validate multimodal Responses payload shape, content-part types, data-URL MIME types, per-part size, `store: false`, and strict output schema in `ai-chat`.
- Add a client inspection service that sends one mixed request, parses strict per-file results, and returns explicit coverage/failure state.
- Feed only successful bounded observations into the existing Chat Completions/tool loop; keep embedded attachment instructions untrusted.

### Done when

- Proxy tests reject arbitrary URLs, unsupported tools, stored/background requests, mismatched jobs, and oversized binary input.
- Service tests prove image, PDF, and mixed image/text request construction and malformed/failed extraction handling.
- Turn tests prove attachment observations affect only the owning turn or its exact retry and never later unrelated turns.

## Phase 6C — Durable provenance and truthful history

### Work

- Migrate message attachments to store `kind`, `inspection_status`, bounded `inspection_text`, optional failure detail, and source-byte metadata without storing binary content.
- Update the atomic user-message RPC, RLS, hydration, and workbench projection.
- Persist included attachment evidence refs on the run with `authority=user_supplied`, plus omitted refs for partial inspection where appropriate.
- Show source kind/status in saved history without exposing extracted prompt material.

### Done when

- Migration contract tests cover validation, owner isolation, atomic persistence, no binary columns, and valid status transitions.
- Repository tests prove round-trip hydration for text, image, PDF, partial, and failed metadata.
- Timeline tests keep each attachment and its evidence inside the owning causal turn.

## Phase 6D — Lightweight editable artifacts

### UI contract

Job: When a customer brings material or asks Kwilt to compose something, they need to see what Kwilt actually inspected and directly refine the useful draft, so they can remain the author and trust the boundary between preparation and action.

Primary action: Send the grounded request; for a produced artifact, edit and save the draft in place.

Must show: attachment name/type, inspecting/partial/failed state only when material, the exact inspection limitation, `Draft` status, artifact title/content, and one edit/save path.

Reveal later: editable artifact fields after Edit; full inspection limitation through the status treatment when space is constrained.

Must not add: attachment settings, model controls, a file manager, a second artifact library, automatic sending, capability mutation controls, or receipt styling.

Reuse map: existing composer chips for attachment state; existing causal timeline for ownership; existing restrained card/input/button tokens for the draft editor; native host commands for picking/removal and persistence.

Behavior sources: feature brief steps 2, 5, 8, and 10; Phase 6 architecture above; draft-first JTBD guidance for external actions; existing optimistic-version command grammar.

Unresolved decisions: binary re-download and a general artifact library remain out of scope; only producing-turn history owns the draft.

Required states: inspecting, ready, partial, failed/removable, artifact read, artifact edit, saving/disabled, version conflict, persisted reload.

Proof path: hosted `/embed/chat` renderer in its matching worktree, then the rebuilt iOS simulator native host with real picker and saved-thread reload.

### Work

- Add owner-scoped `kwilt_agent_artifacts` records linked to a producing run and assistant message, with title, kind, content, version, and timestamps.
- Support bounded `document`, `checklist`, `table`, and `code` artifacts from a strict optional assistant-output contract.
- Render artifacts inside the owning turn and support explicit edit/save with optimistic concurrency.
- Label artifacts as drafts. They are not proposals, capability objects, mutation receipts, or proof that an external action happened.

### Done when

- Parser tests reject malformed, oversized, or completion-claiming artifact payloads.
- Repository/RPC tests prove owner isolation, version conflict behavior, and durable edits.
- Workbench tests prove create/render/edit history stays in the producing turn and never appears as a receipt.

## Phase 6E — Deployment and runtime proof

### Work

- Run targeted Jest and Deno tests after each vertical slice.
- Validate and deploy the migration and affected `ai-chat` function after local gates pass.
- Rebuild/reinstall the current native app before simulator proof; a Metro reload of an older binary is insufficient.
- Capture clean-thread proof for text, screenshot, PDF, mixed input, removal-before-send, failed inspection, saved-thread hydration, and artifact edit/reload.

### Done when

- `npm run verify:changed -- --run` passes.
- Live schema/function versions and authenticated owner behavior are recorded, or the exact external boundary is named.
- Simulator proof covers every attachment state and artifact editing.
- Physical-device/TestFlight proof is recorded separately or explicitly deferred; it is never inferred from simulator or deployment.

## Phase-complete definition

Phase 6 is complete when a Kwilt customer can attach supported text, image, and PDF material to one request; Kwilt truthfully shows inspection coverage; only successfully inspected, turn-scoped evidence reaches the assistant; draft removal prevents use; exact retry remains causal; useful assistant output can be saved and edited as a clearly labeled draft artifact; all capability mutations still require their existing proposal/receipt paths; the full verification gate passes; and every unverified device/provider boundary is stated precisely.
