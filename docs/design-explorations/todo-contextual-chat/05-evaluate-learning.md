# Evaluate Learning: Peek-to-thread To-dos Chat

## Learning questions

- Does the peeking sheet preserve enough orientation, or does serious Chat effectively feel like a full-screen jump anyway?
- Is the new icon understood as `Chat about to-dos`, distinct from Search and Quick Add?
- Does the same icon remain legible as a first-party participant on Goals when it appears alone rather than inside a three-action dock?
- Does visible launch scope eliminate restatement without causing wrong-anchor or overbroad-context corrections?
- Is fresh contextual draft by default the right thread behavior?
- Do users collapse to verify native changes, and do the list and receipt always agree?
- Can the embedded workbench meet keyboard, VoiceOver, Reduce Motion, interruption, and durable resume requirements?
- After contextual success, do users naturally recognize and resume the thread from Chat?

## Evidence plan

Supporting evidence:

- Andrew uses the affordance for several real inventory questions without restating `my to-dos` or naming items already represented by explicit scope.
- A Goals launch carries `All goals`, uses plural inventory language, and returns to the same masonry position without being confused with a single-Goal conversation.
- Closing before first send creates no thread; sending creates exactly one titled thread visible in Chat.
- Accepted changes appear in the native list and match the durable receipt.
- The furnace-filter request preserves its ten-month date, reminder intent, and Plan-owned calendar placement without a premature success claim.
- The past-due cleanup request covers every authoritative match, clears both dates and reminders, and never applies a partial set.
- The same thread resumes from Chat and returns to the intended To-dos destination.
- Drawer open, keyboard expansion, dismissal, background/resume, and failure recovery remain calm and lossless.

Disconfirming evidence:

- The third bottom action makes Quick Add feel cramped or Search harder to hit.
- Users repeatedly expand immediately and report no benefit from the initial peek.
- Context feels hidden, stale, or too broad.
- Fresh launches fragment one continuing job across many threads, or resumption attaches new scope to an unrelated thread.
- The drawer timeline clips evidence/proposals, fights the keyboard, loses focus, or behaves differently from full-screen Chat.
- Users continue using legacy Activity Coach because the new path does not cover concrete creation well.

## Instrumentation

Use minimal event metadata:

- contextual affordance opened;
- drawer closed before first send;
- first send and durable thread created;
- scope removed or changed before send;
- sheet expanded/collapsed;
- proposal reviewed and authoritative result returned;
- thread later resumed from Chat;
- fallback to full-screen host and host error class.

Record capability, surface, active-view identifier or coarse filter presence, and thread/run ids where already part of the durable contract. Do not log prompt text, to-do titles, visible list contents, or screen snapshots for this learning.

## Decision rule

After at least 10 real contextual sessions across simulator and signed TestFlight dogfood:

- **Keep and generalize** if at least 8 create exactly one durable thread, wrong-scope correction is rare, native result and receipt always agree, and the drawer has no keyboard/accessibility blocker.
- **Revise thread semantics** if repeated work is fragmented across fresh threads or unexpected scope attaches to resumed ones.
- **Fall back to full-screen contextual handoff** if the embedded host cannot meet causal-timeline, keyboard, accessibility, or recovery parity.
- **Retire the affordance** if most useful sessions are indistinguishable from global Chat and spatial continuity does not change behavior.

## Expected next action

If the learning release passes, remove the legacy Activity Coach entry and define one responsive contextual-Chat host contract: bottom sheet on phone, with side rail considered only for proven wide-layout use.
