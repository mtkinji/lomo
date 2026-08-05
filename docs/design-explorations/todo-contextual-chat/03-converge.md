# Converge: Peek-to-thread To-dos Chat

## Qualitative score

| Alternative | Visible To-dos context | Durable Chat fit | Phone readability | System risk | Reductive fit |
| --- | --- | --- | --- | --- | --- |
| Peek-to-thread drawer | High | High | High after expansion | Medium | High |
| Full-screen handoff | Medium | High | High | Low | High |
| Composer grows in place | High | Medium | Low after one turn | High | Low |
| Persistent side rail | High | High | Low on phone | High | Medium |

## Chosen alternative

**Peek-to-thread drawer on phone**, backed by Unified Chat rather than Activity Coach.

The accepted pattern extends to Goals inventory as one lower-right 48-point Chat control. It uses the same floating surface and drawer, but carries capability-wide `All goals` scope and plural inventory language. Goal detail retains its existing singular `this goal` scope. This is a system extension, not a new alternative: the surface determines scope and return target while Unified Chat remains one durable conversation system.

The resting To-dos row becomes:

`[ Add a to-do                              ] [ Search ] [ Chat ]`

The Chat control is a circular affordance using Kwilt's existing `navAiGuide` Chat icon—the same icon used by the capability menu—positioned to the right of Search. Its accessibility label is `Chat about to-dos`; visible copy does not need to say `AI`.

On tap:

1. A bottom sheet opens around 60% height so the active list/view remains recognizable.
2. A compact title rail names the fresh conversation `Chat about to-dos` and later adopts its durable generated title. The empty timeline uses a subtle centered Kwilt watermark rather than a synthetic assistant message or global quick starts. The composer shows one removable scope chip such as `All to-dos` or `Past due · 1 filter` once engaged. It does not attach every visible row as hidden context.
3. The composer placeholder is `Ask about these to-dos` with no mode picker and no second manual tab.
4. Keyboard focus expands the sheet near full height. A response may keep it expanded when evidence, proposals, or receipts need room.
5. Approved Activity changes use Unified Chat's capability-owned operation and receipt path. Collapsing the sheet reveals the updated native list.
6. Once a user sends the first message, the thread appears in Chat with normal generated-title behavior and can be resumed there.

## Thread-start and scope semantics

- Opening and closing without sending creates no durable empty thread.
- The first send creates one durable Unified Chat thread and attaches the visible To-dos launch scope.
- Reopening the sheet during the same To-dos visit resumes that active thread.
- A later independent launch starts as a fresh contextual draft by default. Existing conversations are resumed from Chat, not silently selected because they happen to be recent.
- A future learning release may offer one explicit `Continue recent chat` row if repeated dogfood shows that fresh-by-default creates unnecessary fragmentation.
- The durable thread remembers its messages, proposals, and receipts. Context active for the next turn remains separately visible and removable; old To-dos scope does not become invisible permanent permission.

## Capability delta

Today, the user cannot:

- invoke the durable Unified Chat experience directly from the To-dos bottom row while retaining visual orientation to the list;
- trust that a To-dos AI drawer and the Chat history are the same conversation system.

After this concept ships, the user can:

- tap beside Search, ask about the current To-dos scope, act through the existing Activity contract, collapse back to the updated list, and resume the same thread from Chat later.

Still intentionally unsupported:

- silent auto-prioritization or reorganization;
- a persistent chat tied forever to every To-dos visit;
- automatically attaching all visible Activity content;
- side-by-side phone layout;
- a second To-dos-only AI personality, transcript, permission model, or editor.

## Reductive decisions

- Enhance the existing bottom action cluster; add no new top-level capability or tab.
- On inventory surfaces without a bottom action cluster, add only the circular Chat action at the established lower-right inset; do not invent an otherwise-empty dock.
- Reuse the common Chat icon; do not introduce a sparkle, AI badge, or To-dos-specific Chat symbol.
- Support rich one-or-many capture and complete-set bulk changes through existing To-dos and Plan tools. A request such as clearing dates and reminders from all past-due To-dos must resolve every match, present one reviewable batch, and never report partial coverage as success.
- Calendar language routes through Plan and remains pending until native approval and an authoritative calendar receipt. When the same request creates a new To-do, creation is the first reviewed phase; only its applied receipt can supply the id for the follow-up placement, and missing time or duration is requested rather than invented.
- Preserve Quick Add as the widest and clearest action.
- Reuse Unified Chat's composer, timeline, context, proposal, receipt, and thread records.
- Retire `ActivityCoachDrawer` after parity is proven instead of maintaining `AI` and `manual` modes beside the new doorway.
- Add no preference for drawer versus rail. Presentation adapts by available width later.
- Add no prompt carousel. The context chip and `Ask about these to-dos` placeholder teach the interaction.
- Add no modal header controls or close row. A compact title rail owns conversation identity; the drawer grabber, backdrop, system back action, and accessibility escape own dismissal.
- Do not bind the thread to a saved view as a new domain object. The launch can name current view state without giving it ownership of the conversation.

## Drawer-chrome refinement

Three plausible directions were compared after the first device render:

- **Title–watermark–composer** — use a compact title rail, a quiet Kwilt watermark in the empty timeline, and a composer aligned to the same gutter. The grabber owns dismissal and no synthetic message is created.
- **Scope-only utility row** — keep a narrow native row with the scope chip and a trailing close action. This is explicit, but still duplicates the workbench's context control and splits attention across native and web chrome.
- **Floating close control** — remove the row but overlay one trailing close button. This preserves more space than a header, but adds a second dismissal affordance over a surface that already supports drag, backdrop, system back, and accessibility escape.

The chosen direction is **Title–watermark–composer**. The bet is that clear conversation identity and spatial balance solve orientation better than either a modal header or instructional copy. If the drawer still feels ambiguous in dogfood, the next move is a restrained trailing close control—not restoring a full modal header.

## Activation

The affordance is present whenever the resting To-dos dock is present. It should be discovered organically beside Search. On first use only, a brief accessibility-friendly tooltip may say `Ask about what you're looking at` if observation shows the icon is not understood; do not pre-announce a generic “AI assistant.”

Natural adoption is a user opening from a real list question, sending a message without restating the capability, then collapsing to inspect or continue the resulting native work.

## Accepted trade-offs

- The sheet becomes nearly full-screen during serious conversation; “stay in context” means preserved orientation and immediate return, not permanently seeing every list row.
- The embedded host is more work than navigation to the current full-screen screen.
- Fresh-by-default may create more threads, but avoids silently contaminating an unrelated conversation with To-dos scope.

## Rejected trade-offs

- Cramping two permanent panes on a phone.
- Reusing the latest Chat thread merely because one exists.
- Keeping Activity Coach as a second, non-durable shortcut.
- Turning Quick Add into a mode-switching chat composer.

## System implications

- Separate `UnifiedChatScreen` orchestration from its presentation chrome enough to host the same workbench in a drawer.
- Support lazy thread creation with launch context attached atomically on first send, so there is no empty-thread clutter or context race.
- Add current To-dos view metadata as user-legible launch presentation, while authoritative Activity retrieval stays capability-owned.
- Preserve exact return and native list refresh after proposals or applied changes.
- Verify keyboard, VoiceOver, Reduce Motion, drag dismissal, background/resume, and causal timeline behavior in the drawer host.

## Bet

We're betting that users need **spatial continuity at entry and return**, not a permanently split screen: seeing the live To-dos canvas behind a peeking sheet will make Chat feel callable from the work, while expansion gives a real durable conversation enough room. If users still feel displaced, revisit a lightweight anchored transcript preview or wide-layout rail—not a second To-dos chat system.

## Success signal

In dogfood, the user can recognize the active To-dos scope before sending, ask without restating it, distinguish answer/proposal/applied result, collapse to verify the authoritative list change, and later resume the same titled thread from Chat without finding empty or wrongly scoped conversations.
