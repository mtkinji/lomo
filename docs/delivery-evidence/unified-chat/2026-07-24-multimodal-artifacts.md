# Unified Chat Phase 6 delivery evidence

Date: 2026-07-24 (America/Denver)

## Product contract

- Text, PNG, JPEG, WEBP, and PDF sources enter through one bounded native composer contract.
- Image/PDF bytes remain transient on-device and travel only through the existing authenticated `ai-chat` proxy for inspection.
- Persisted messages retain source metadata, inspection status, bounded observations, and limitations; they do not retain data URLs or binary columns.
- Attachment observations are untrusted, user-supplied evidence scoped to the producing turn or exact retry.
- Failed inspection blocks send until removal or a successful retry; partial inspection remains visible.
- Editable assistant output persists as a `Draft` artifact owned by its producing run and assistant message. It is not a proposal, capability object, mutation receipt, or external-action claim.

## Automated proof

- `npm run verify:changed -- --run`: passed on the current implementation; code-health ratchets had no findings and architecture lint completed with 11 pre-existing raw-Text warnings.
- Full Jest gate: 284 suites and 2,034 tests passed.
- `npm test` and `npm run build` in the matching `kwilt-site` worktree: 99 tests passed and the production build completed.
- `npm run test:chat-contracts`: 29 migration/delivery contracts passed and protocol v2 conformed across Kwilt, `kwilt-site`, and the Giraffed compatibility adapter.
- Deno checks cover the deployed `ai-chat` route and extracted request validator.
- Focused regression files:
  - `unifiedChatAttachmentPolicy.test.ts`
  - `unifiedChatAttachmentPicker.test.ts`
  - `unifiedChatAttachmentInspection.test.ts`
  - `runUnifiedChatTurn.phase6.test.ts`
  - `assistantArtifact.test.ts`
  - `threadRepository.test.ts`
  - `buildWorkbenchSnapshot.test.ts`
  - `unifiedChatProtocol.test.ts` and `unifiedChatTimeline.test.ts` in `kwilt-site`

## Live backend proof

- Linked migrations recorded as applied:
  - `20260725043000` — multimodal attachment provenance
  - `20260725044500` — editable artifacts
  - `20260725050000` — artifact-update relationship hardening
- Deployed `ai-chat`: active version 58, updated `2026-07-25 04:40:04 UTC`.
- Live Responses proxy calls accepted an actual PNG as `input_image` and an actual one-page PDF as `input_file`, returned HTTP 200 strict structured output, and extracted the PDF's unique proof text.
- Anonymous REST requests to both attachment and artifact tables returned HTTP 401.
- Live artifact UPDATE policy inspection confirms `WITH CHECK` requires the current owner and an owned thread/run/assistant-message relationship.
- Supabase security advisors still contain the repository's pre-existing warning set; no Phase 6 table is anonymous or missing RLS.

## Fresh simulator boundary

- Device: iPhone 17 Pro simulator, iOS 26.4, UUID `5B7BC30D-A090-47AB-9898-7D8762BBC94D`.
- Xcode 26.6 native rebuild completed from this worktree with `Build Succeeded`, 0 errors and 4 existing warnings.
- App `1.0.94 (94)` was installed after the rebuild. The installed `EXConstants.bundle/app.config` contains `unifiedChatEnabled: true` and `http://127.0.0.1:3012/embed/chat`.
- Metro bundled the current worktree (3,617 modules), authenticated the existing simulator session, and the rebuilt app opened the matching local Chat renderer.
- Interactive picker/removal/artifact-edit captures are recorded below once the Mac interaction lock is open.

## Runtime cases

| Case | Current proof |
|---|---|
| Current rebuilt Chat surface | Fresh installed binary and current local renderer opened the saved Chat thread |
| Text document | Pending final direct picker capture |
| Screenshot/image | Live proxy model call passed; pending final direct picker capture |
| PDF | Live proxy model call passed; pending final direct picker capture |
| Mixed input | Automated construction/turn tests passed; pending final direct composer capture |
| Removal before send | Sendability/removal regression passed; pending final direct composer capture |
| Failed inspection | Blocking/failure regressions passed; pending final direct composer capture |
| Saved-thread hydration | Repository/timeline regressions passed; pending final direct reload capture |
| Artifact edit/reload | Repository/protocol/timeline regressions passed; pending final direct edit/reload capture |

## Explicitly unverified

- Physical-device document-provider behavior, signed distribution, TestFlight processing/install, and production-store builds are not inferred from simulator or backend deployment.
- Photo-library intake is not part of this phase; images and screenshots are selected through the Files document picker.
