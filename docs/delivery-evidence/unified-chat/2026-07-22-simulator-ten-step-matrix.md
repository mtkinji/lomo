# Unified Chat ten-step simulator matrix — 2026-07-22

- App version: `1.0.89`.
- App base SHA: `bf0500189807f97c3f2effcdd4d39bcfbc37af0d`; the Unified Chat changes remain uncommitted in the isolated worktree.
- Device: signed-in iPhone 17 Pro simulator, iOS 26.4.1.
- Workbench: production `https://www.kwilt.app/embed/chat` hosted by the native app.
- Data hygiene: saved images use deterministic fixture names or sanitized crops. No account identifier, private Goal title, attachment body, token, or credential is retained.

| Step | Simulator observation | Evidence |
|---|---|---|
| 1. Arrive with visible scope and exact return | Global Chat opened with no hidden personal scope. A capability launch rendered removable scope. Native To-do detail returned to the exact durable Chat thread. | [`simulator-global-entry.png`](simulator-global-entry.png), [`simulator-enriched-exact-chat-return.png`](simulator-enriched-exact-chat-return.png) |
| 2. Express intent in ordinary language | Free text, a text-document attachment, and name-only `add tea` capture all entered through the same composer. | [`simulator-attachment-ready.png`](simulator-attachment-ready.png), [`simulator-name-only-quick-add-enriched.png`](simulator-name-only-quick-add-enriched.png) |
| 3. Establish bounded request scope | General entry remained detached; an attached document was explicitly named; the To-do update scoped itself to one Kwilt capability. | [`simulator-global-entry.png`](simulator-global-entry.png), [`simulator-attachment-response.png`](simulator-attachment-response.png), [`simulator-update-proposal.png`](simulator-update-proposal.png) |
| 4. Retrieve inspectable evidence | A bounded Goals question exposed a collapsed `Used 3 Kwilt records` evidence control. The saved crop omits private Goal content. | [`simulator-bounded-goals-evidence.png`](simulator-bounded-goals-evidence.png) |
| 5. Understand result and limits | The attachment and Goals responses separated the direct answer, `What Kwilt found`, and `Limits`. | [`simulator-attachment-response.png`](simulator-attachment-response.png), [`simulator-bounded-goals-evidence.png`](simulator-bounded-goals-evidence.png) |
| 6. Review a typed capability-owned proposal | The exact-match update `move my tea todo tomorrow` produced one compact change card containing only the changed date. Name-only creation skipped redundant review and rendered the resulting inventory row. | [`simulator-update-proposal.png`](simulator-update-proposal.png), [`simulator-name-only-quick-add-enriched.png`](simulator-name-only-quick-add-enriched.png) |
| 7. Correct, decline, defer, or approve | The compact update exposed `Not now`, `Change`, and `Apply`; Apply was operated. Explicit create intent served as approval for the low-risk create. | [`simulator-update-proposal.png`](simulator-update-proposal.png), [`simulator-update-applied.png`](simulator-update-applied.png) |
| 8. Apply idempotently with authoritative receipt | Apply produced an `Updated tea` receipt. Read-only production inspection confirmed `scheduledDate=2026-07-23` while notes, five generated steps, ten-minute estimate, and `very_easy` difficulty remained intact. The create journey exposed its settled authoritative inventory row only after enrichment. | [`simulator-update-applied.png`](simulator-update-applied.png), [`simulator-quick-add-enrichment-detail.png`](simulator-quick-add-enrichment-detail.png) |
| 9. Return to the exact native destination | Tapping the created inventory row opened native To-do detail; Back restored the same Chat thread and settled row. | [`simulator-quick-add-enrichment-detail.png`](simulator-quick-add-enrichment-detail.png), [`simulator-enriched-exact-chat-return.png`](simulator-enriched-exact-chat-return.png) |
| 10. Resume, correct, and remove | The thread survived native navigation and live reloads. Retry reused one durable user message and attachment without duplication. Swipe-left exposed the standard Delete rail and removed the authoritative created To-do. | [`simulator-attachment-failed-run.png`](simulator-attachment-failed-run.png), [`simulator-attachment-response.png`](simulator-attachment-response.png), [`simulator-inline-swipe-delete.png`](simulator-inline-swipe-delete.png), [`simulator-inline-delete-complete.png`](simulator-inline-delete-complete.png) |

Runtime defects found and fixed during this pass:

- strict grounded-answer responses were missing the proxy's nested `json_schema` envelope;
- update evidence omitted the Activity ID and optimistic version required by the native executor;
- the strict update schema forced the model to restate every Activity field, risking accidental data loss;
- `uniqueItems` was unsupported by the model response-format subset and prevented the request from reaching the model;
- a model could ask which app owned the To-do even though the request was already scoped inside Kwilt.

The corrected update contract treats nullable strict-schema fields as unchanged, accepts clears only through an explicit `clearFields` list, de-duplicates clears in the native parser, and instructs the model to act on one exact matching Kwilt Activity without requesting irrelevant details.

Still outside this simulator matrix: microphone permission/transcription, stop/steer, correction editing, background/foreground recovery, and the signed physical-device journey. These remain explicit release-proof work, not inferred successes.
