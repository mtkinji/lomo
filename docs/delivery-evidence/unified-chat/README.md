# Unified Chat Runtime Evidence

This directory holds sanitized proof for the ten-step Unified Chat delivery ledger.

Each score-5 step must reference evidence that records:

- commit SHA and build/version;
- simulator or physical-device class;
- signed-in state and entry kind without account identifiers;
- the exercised job step and expected durable artifact;
- the observed result, failure state, and recovery behavior;
- links to screenshots, recordings, or logs stored in the evidence bundle.

Do not record raw prompts, assistant answers, object titles, evidence excerpts, attachment contents, household-member identifiers, tokens, or credentials. Use deterministic fixtures or redact personal content before saving proof.

A simulator pass and a signed physical-device pass are separate requirements. A rendered success card is not apply evidence unless the referenced authoritative mutation receipt and native destination were also inspected.

Current evidence:

- [Production platform proof](2026-07-22-production-platform.md)
- [Signed simulator global-entry proof](2026-07-22-simulator-global-entry.md)
- [Ten-step simulator matrix](2026-07-22-simulator-ten-step-matrix.md)
- [Physical-device attempt and signing blocker](2026-07-22-physical-device-attempt.md)

Latest lightweight To-do proof:

- [simulator-name-only-quick-add-enriched.png](simulator-name-only-quick-add-enriched.png) — “add tea” becomes only the standard inventory row with settled timing and estimate metadata.
- [simulator-quick-add-enrichment-detail.png](simulator-quick-add-enrichment-detail.png) — the same authoritative To-do contains the Quick Add cover, steps, reminder, due date, and location enrichment.
- [simulator-enriched-exact-chat-return.png](simulator-enriched-exact-chat-return.png) — native Back returns to the exact durable Chat thread.
- [simulator-inline-swipe-delete.png](simulator-inline-swipe-delete.png) and [simulator-inline-delete-complete.png](simulator-inline-delete-complete.png) — swipe-left reveals the standard Delete rail and removes the authoritative row.
- [simulator-update-proposal.png](simulator-update-proposal.png) and [simulator-update-applied.png](simulator-update-applied.png) — an exact-match date change reviews only the changed field, then applies without erasing Quick Add enrichment.
- [simulator-keyboard-composer-attached.png](simulator-keyboard-composer-attached.png) — the caution-free composer follows the iOS visual viewport and sits directly above the keyboard, with WKWebView’s previous/next/done form-navigation accessory removed.
- [simulator-lightweight-composer.png](simulator-lightweight-composer.png) — the ShadCN-style compact input group remains attached to the keyboard with a wrapped draft, quiet focus treatment, and no exposed keyboard-edge background band.

Latest Chat navigation proof:

- [simulator-chat-standard-header.png](simulator-chat-standard-header.png) — Chat uses the standard Kwilt `PageHeader`, with no header-level creation affordance and current-chat actions in the trailing overflow.
- [simulator-chat-thread-list.png](simulator-chat-thread-list.png) — the shared side sheet loads the durable Chats collection, marks the active thread, and places New chat in the `CHATS` section.
- [simulator-chat-thread-list-scrolled.png](simulator-chat-thread-list-scrolled.png) — the same collection scrolls to the remaining persisted chats instead of ending at an empty section label.

Latest progressive composer proof:

- [simulator-progressive-composer-resting.png](simulator-progressive-composer-resting.png) — after interaction, the composer returns to a lightweight single-row pill and active context does not occupy conversation chrome.
- [simulator-progressive-composer-engaged.png](simulator-progressive-composer-engaged.png) — focus expands the same composer into two rows attached to the iOS keyboard; the draft sits above a context-aware tool row while voice and Send stay anchored at the right.
