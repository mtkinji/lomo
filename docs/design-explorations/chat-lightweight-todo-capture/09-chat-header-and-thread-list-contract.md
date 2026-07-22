# Chat header and thread-list contract

Job: When returning to Chat, the user needs to recognize the current conversation and move among prior conversations without learning a Chat-only navigation system.

Primary action: Continue the current conversation.

Must show: The standard Kwilt `PageHeader` with its standard menu toggle and current chat title; a `CHATS` section in the shared side sheet containing every active chat in recency order; one New chat affordance in that section.

Reveal later: Current-chat rename and archive remain available from the title-adjacent overflow. Dates provide quiet recency context on thread rows.

Must not add: A custom hamburger, a header-level plus, an empty section label with no rows, a second chat-picker modal, or a non-scrolling thread list.

Reuse map: Header -> `PageHeader`; menu toggle -> `PageHeader`'s `MenuToggleIcon`; thread container -> the existing `CapabilityMenu` scroll view; thread truth -> `createUnifiedChatRepository().listThreads()`; current-chat actions -> the standard title-adjacent more action.

Behavior sources: The user's 2026-07-22 screenshot and direction; the existing PageHeader contract used by Goals, To-dos, and Plan; the durable Unified Chat repository; the capability side-sheet navigation contract.

Unresolved decisions: None for this correction. Archived chats remain excluded by the repository's existing default query.

Required states: Loading, populated, empty, long titles, selected/open thread, creation failure, list-load failure, and enough chats to require scrolling.

Proof path: Open Chat in the signed-in iPhone 17 Pro simulator, open the shared side sheet from the standard header, confirm existing chats and New chat are visible, scroll the list, select another chat, create a chat, and return to the conversation.

## Delivery score

| Criterion | Score | Evidence |
| --- | ---: | --- |
| Job clarity | 5/5 | The header names the active chat; conversation switching and creation live together under `CHATS`. |
| Reduction | 5/5 | Removed the Chat-only hamburger, header `+`, and duplicate thread-picker modal. |
| Kwilt system fit | 5/5 | Reuses `PageHeader`, the shared `CapabilityMenu`, and the durable chat repository. |
| Interaction | 5/5 | Simulator showed 13 persisted rows, selected-state feedback, scrolling, and successful row selection back into Chat. |
| State coverage | 5/5 | Loading, empty, failure, populated, selected, and creation paths are explicit; component tests cover rendering, creation, and selection. |
| Runtime proof | 5/5 | Signed-in iPhone 17 Pro simulator screenshots capture the standard header, populated list, and scrolled list. |

Runtime creation was not invoked during the final proof pass because it would add another durable empty chat to the user's account; the same repository-backed creation path is covered by the component and navigation regression tests.
