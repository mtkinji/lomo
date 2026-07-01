# Diverge: Work Receipts And Build Continuity Control Plane

## Fixed design challenge

How might we help Nina record meaningful AI-assisted work as completed life evidence, and keep unfinished build threads recoverable across sessions, while preserving Codex plans as lightweight execution scaffolding and Kwilt as the durable, permissioned source of truth?

## Axis of variation

Receipt-first vs. continuity-first vs. MCP-contract vs. in-app/product-surface vs. scheduling-first.

## Alternative 1: Work Receipt Capture

Update the existing `kwilt-control-plane` skill so agents run a continuous Activity lifecycle: capture meaningful work to be done, work against it with the native agent plan, then mark it done with receipt evidence when complete. If the agent only realizes at handoff that meaningful completed work was not captured up front, it can still create the prospective Activity title and immediately mark it done. The receipt details live in notes: what happened, why it mattered, where it happened, and what verification or artifact exists. The Activity title is not rewritten into past tense.

Audience/persona fit: Excellent for Andrew/Nina because it makes everyday AI-assisted work count in Kwilt even when it is not a long-running build.

Design-challenge answer: It records meaningful work as Chapter evidence without requiring a new project container or future next action.

System-fit note: Fits the current plugin repo and existing MCP tools.

Best when: The work was started and finished in one session, or the user wants credit/history more than future continuity.

Fails when: The work has unresolved decisions or follow-ups that need structured resumption.

Primer anti-pattern check: Pass. No dashboard, no new object type, no scheduling pressure.

## Alternative 2: Build Thread Continuity Packet

Extend the plugin skill and MCP write pattern around a structured continuity packet stored in Goal or Activity notes. Each packet has a compact shape: build thread, repo, state, current branch if known, linked artifacts, last verified point, next useful action, open decisions, rejected paths, and deferred follow-ups. Agents update the packet at start, scope change, and handoff.

Audience/persona fit: Very strong. It directly serves the "where am I with this?" moment across sessions.

Design-challenge answer: It makes durable build state recoverable without replacing native agent plans or inventing a new Kwilt object.

System-fit note: Extends the existing `kwilt-control-plane` skill and uses current Goal/Activity/step writes. MCP output schemas or optional metadata could improve reliability later, but are not required for a learning release.

Best when: The main pain is cross-session orientation and deferred follow-up.

Fails when: Users expect automatic scheduling, branch automation, or complete project management.

Primer anti-pattern check: Pass. Activities remain the forward-planning unit; no separate Plan object is introduced.

## Alternative 3: Agent Resume Command

Package a clear user-facing command pattern into the plugin: "Resume my Kwilt build thread for X." The agent reads Kwilt Goals, recent Activities, and repo state, then produces a short resume summary: what this build is, current state, likely next action, and unresolved decisions. Writes are optional and happen only when the user asks to update state.

Audience/persona fit: Strong for disorientation moments, especially after switching threads.

Design-challenge answer: It optimizes the recovery moment rather than the capture/update moment.

System-fit note: Mostly skill behavior plus documentation/demo updates. It may need better search/list tools if Goal matching is weak.

Best when: The user wants to ask "what was I doing?" before choosing what to work on.

Fails when: Agents do not keep continuity packets updated during prior sessions.

Primer anti-pattern check: Pass. It is transparent and read-first.

## Alternative 4: Two-Lane Work Ledger

Make the plugin skill explicitly maintain two lanes throughout the work: `planned work` and `unfinished continuity`. Planned work creates or reuses Activities before or during execution, then marks them done with concise receipt notes when complete. Unfinished work stays planned under the right Goal and gets a continuity packet so the next session can continue.

Audience/persona fit: Excellent because it handles both "I want credit for what I did" and "I need to resume this later."

Design-challenge answer: It gives Kwilt richer Chapter evidence without forcing every bit of work into a long-running build model.

System-fit note: Strong. It is mostly skill/docs behavior on top of existing MCP write tools.

Best when: The same plugin needs to serve quick fixes, one-off docs work, shipped slices, and complex build concepts.

Fails when: Agents cannot reliably classify completed vs. unfinished work.

Primer anti-pattern check: Pass if the completed-work lane remains outcome-level and does not become a command log.

## Alternative 5: Kwilt Build Shelf In-App Surface

Add an in-app or desktop surface that shows active build threads, their states, next actions, and open loops. It would be powered by Goals and Activities tagged as agent/build work. The plugin writes to Kwilt, and Kwilt gives the user a visual place to inspect and correct the thread list.

Audience/persona fit: Moderate to strong for power users, especially if desktop becomes the command center.

Design-challenge answer: It improves inspection and correction, but risks turning this into a project-management UI before the continuity contract is proven.

System-fit note: Requires app/desktop UI work and likely shared query conventions.

Best when: The build-continuity data is already useful and the user wants to audit or curate it visually.

Fails when: The core issue is agent write discipline, not lack of a surface.

Primer anti-pattern check: Risk. Must avoid dashboard/KPI/project-manager energy.

## Alternative 6: Schedule-Aware Build Planner

The plugin not only stores build threads but proposes when to work on them, using Kwilt's priority, schedule, and context signals. It may create scheduled Activities or suggest time blocks after preview.

Audience/persona fit: Tempting because the user's initial language mentioned schedule, but likely premature.

Design-challenge answer: It helps decide when to act, but only after the system knows what the thread is and what next action matters.

System-fit note: Depends on stronger priority/actionability and Auto-Schedule behavior. It would need careful preview/undo.

Best when: Continuity packets are reliable and the user wants calendar/time placement.

Fails when: The user is still trying to recover context, not optimize a calendar.

Primer anti-pattern check: Mixed. Pass only if scheduling is previewed and calm; fail if it creates pressure or silently schedules work.

## Divergence takeaway

The strongest path is Alternative 4: a two-lane work ledger. Intended work is captured as Activities first whenever possible, completed Activities get receipt notes so Chapters become richer, and unfinished work gets a continuity packet so the user can resume later. Alternative 3 remains the activation path for unfinished work. In-app surfaces and scheduling should wait until the Activity lifecycle and packets prove useful.
