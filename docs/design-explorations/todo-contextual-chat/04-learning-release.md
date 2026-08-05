# Learning Release: Peek-to-thread contextual Chat

## Concept To Build

Add contextual Chat affordances to To-dos and Goals that open the real Unified Chat workbench over the native inventory and save the conversation to Chat after the first message.

## Capability Delta

Today, the user cannot:

- begin a durable contextual Chat from the To-dos action row without leaving the visual surface or entering the legacy Activity Coach workflow.

After this release, the user can:

- open Chat over the current To-dos view, see and remove its scope, ask or act, collapse to the live list, and resume the resulting thread from Chat.

Still intentionally not supported:

- automatic list cleanup, silent writes, household sharing changes, recent-thread suggestions, phone side rail, or unreviewed rollout to every remaining capability.

## User Experience

In To-dos, the user sees a third circular action to the right of Search. In Goals, they see one matching circular action at the lower-right of the inventory. Tapping either opens a 60% Chat sheet with the matching capability-wide scope and composer. Focusing the composer expands the sheet. The first send creates the durable thread; closing before sending leaves no Chat row. Dragging down returns to the same list state. The created thread appears in the ordinary Chat list.

## Existing Product Relationship

This enhances To-dos as an entry point and Unified Chat as the only conversation system. It leaves Activity ownership, Quick Add, Search, native Activity detail, and the Chat destination intact. The older Activity Coach drawer is hidden behind a temporary internal fallback during learning and removed after parity is established.

## Buildable Slice

Must be real:

- third bottom-row affordance using the shared `navAiGuide` Chat icon, with correct layout, accessibility label, and scroll/chrome behavior;
- lower-right Goals inventory affordance using the same 48-point floating surface, plural copy, and exact Goals-list return target;
- drawer-hosted Unified Chat timeline and composer;
- visible/removable To-dos inventory scope and exact return target;
- lazy durable thread creation on first send;
- thread presence and resume from ordinary Chat;
- existing To-dos read/create/update proposal and receipt behavior;
- rich To-do creation with reminders and Plan-owned calendar placement;
- complete-set bulk To-do updates with one batch review and an explicit no-partial-success invariant;
- native list reconciliation after applied changes;
- keyboard, VoiceOver, dismissal, interruption, background/resume, and error states.

Can be thin or temporary:

- one phone snap-point policy rather than a complete responsive rail system;
- `All to-dos` plus a concise active-view/filter label rather than a rich view-context schema;
- internal fallback to full-screen Unified Chat if the embedded workbench cannot load.

Intentionally excluded:

- prompt suggestions, AI mode selector, dedicated thread picker in the drawer, multi-pane phone UI, automatic rollout to other capabilities, and automatic migration of legacy Activity Coach sessions.

## Release Channel

`Local build`, then `TestFlight build` after simulator acceptance. The interaction depends on real keyboard, touch, VoiceOver, bottom safe-area, background/resume, and durable signed-account behavior; source tests alone cannot prove it.

## Brand-Goodwill Guardrails

- Opening the drawer never creates Chat-list clutter.
- Active scope is visible and removable.
- General questions do not automatically retrieve private To-dos merely because the drawer was opened.
- No mutation is presented as complete before the authoritative Activity result exists.
- Dismissal never loses a sent message or leaves an ambiguous pending proposal.
- The existing full-screen Chat route remains a safe fallback.

## Reversibility

Gate the new affordance and embedded host presentation independently. The durable records use the existing Unified Chat schema, so hiding the button or reverting to full-screen presentation does not strand conversations. Avoid migrations and To-dos-specific thread fields in the first release.

## Permanent Product Threshold

Keep the contextual drawer when repeated real-list use shows less restatement and faster native follow-through without empty-thread clutter, wrong-scope corrections, keyboard/accessibility regressions, or confusion between drawer Chat and the main Chat destination.
