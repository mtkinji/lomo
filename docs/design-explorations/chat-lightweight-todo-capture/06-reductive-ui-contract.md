# Reductive UI Contract

Job: When a user names a To-do in Chat, they need Kwilt to capture and organize it without making them administer fields, so they can continue their conversation and review details only when useful.

Primary action: Say the To-do once; afterward, tap the resulting row only if detail review is useful.

Must show: The authoritative To-do title and the same timing/estimate metadata shown in To-do inventories.

Reveal later: Notes, steps, triggers, notification state, recurrence, Goal, tags, image, and every other detail live in the native To-do detail screen. Swipe-left reveals Delete.

Must not add: A proposal form for explicit creation, a second To-do editor, Inspect or Undo buttons, AI badges, enrichment toggles, explanatory assistant prose, or forced detail navigation.

Reuse map:

- creation and enrichment -> Quick Add creation contract plus `steps`, `triggers`, `details`, and entitled `cover_image`
- row content -> `ActivityListItem` semantics and `buildActivityListMeta`
- row tap -> native `ActivityDetail`
- destructive action -> inventory swipe-left `Delete`
- return -> exact durable Unified Chat thread

Behavior sources: Explicit user direction in this design exploration; Quick Add controller and AI-enrichment production contracts; `ActivityListItem` inventory interaction contract; existing durable proposal/receipt/idempotency boundary behind the UI.

Unresolved decisions: A React Native component cannot render inside the credential-free web workbench DOM. The embedded row must mirror the inventory interaction contract until Chat's timeline is native; it must not acquire Chat-only semantics.

The embedded mirror intentionally uses the standard row's `showCheckbox={false}` presentation. A completion circle would imply an unwired completion action; Chat should add it only when completion can update the authoritative Activity and durable receipt together.

Required states: working/enriching, created, long title, missing metadata, failed create, deleted, detail open, exact return, and reduced motion.

Proof path: Signed-in iPhone Simulator through standalone Chat; create by natural language, observe compact row, swipe-left to Delete, create again, tap row, inspect native details/triggers, and Back to the exact Chat thread. Repeat the permanent journey on a signed physical device.

## Reduction pass and simulator score

| Category | Result | Evidence |
| --- | --- | --- |
| Job clarity | PASS | Name-only “add tea” produced the To-do row directly. |
| Reduction | PASS | No assistant explanation, proposal table, approval, Inspect, Undo, AI badge, or enrichment controls remain in the create result. |
| Hierarchy | PASS | The user message is followed by one familiar inventory row; detail is progressive disclosure through row tap. |
| System fit | PASS with documented boundary | Creation/enrichment use Quick Add functions and metadata uses `buildActivityListMeta`. The WebView DOM mirrors `ActivityListItem` because React Native components cannot render inside it. |
| Interaction | PASS | Row tap, native detail, exact Back, swipe-left Delete, and post-delete row removal were operated in the signed-in simulator. |
| States | PASS for this slice | Created, enriched, opened, returned, swipe-revealed, deleted, failed model interpretation, and corrected retry were observed. |
| Resilience | PASS for tested conditions | Missing metadata, settled timing/estimate, touch drag-versus-tap, local-calendar dates, and reduced-motion CSS are covered; broader accessibility remains in the permanent Chat journey. |
| Runtime proof | PASS on simulator; physical unverified | Screenshots are linked from `docs/delivery-evidence/unified-chat/README.md`. The login keychain still blocks a signed physical-device build. |
