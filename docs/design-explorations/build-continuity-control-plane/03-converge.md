# Converge: Work Receipts And Build Continuity Control Plane

## Qualitative scoring

| Alternative | Persona fit | System fit | Trust fit | Blast radius | Verdict |
| --- | --- | --- | --- | --- | --- |
| Work receipt capture | Excellent | Excellent | Strong | Low | Necessary base layer. |
| Build thread continuity packet | Excellent | Strong | Strong | Medium-low | Use for unfinished/resumable work. |
| Agent resume command | High | Strong | Strong | Low | Include for unfinished work. |
| Two-lane work ledger | Excellent | Excellent | Strong | Medium-low | Chosen. |
| Kwilt Build Shelf surface | Medium | Medium | Medium | High | Defer until data shape is proven. |
| Schedule-aware build planner | Medium | Weak for V1 | Risky | High | Defer. |

## Chosen alternative

Build a **Two-Lane Work Ledger** into the Kwilt MCP/plugin control-plane behavior.

Lane 1 is a work Activity lifecycle: a concise Activity captures meaningful work to be done, stays planned while work is active, and is marked done with receipt evidence once complete. Its title remains the expression of the work to be done, not a past-tense summary of what happened.

Lane 2 is an unfinished-work continuity packet: a concise, structured handoff summary attached to a durable Kwilt Goal or a pinned/current Activity. Agents use it to decide whether to reuse an existing build thread, what durable Activities to create or update, and what next action to recommend when the user resumes.

## Capability delta

Today, the user cannot:

- Reliably capture meaningful AI-assisted work before doing it, then get Kwilt credit/history when it is marked done.
- Reliably ask an agent where a multi-session build concept stands unless that context happens to be in the current thread.
- Trust that deferred implementation follow-ups survived the end of a Codex session.
- Distinguish short-lived execution checklists from durable build commitments without manually curating Kwilt.
- See whether an agent is creating duplicate build Goals or updating the existing one.

After this release, the user can:

- Ask an agent to capture work to be done in Kwilt, work on it, and mark it done with receipt evidence when complete.
- Ask an agent to resume a build thread and get a compact answer grounded in Kwilt plus repo context.
- Preserve durable build state in Kwilt without copying every micro-step into Activities.
- Keep the current next action, open decisions, and deferred follow-ups attached to the right Goal.
- Receive a handoff summary that says exactly what Kwilt records were created, updated, completed, or left planned.

Existing workaround removed:

- Manually deciding whether agent-assisted work should be entered into Kwilt before or after the fact.
- Manually rereading old chat plans, PR descriptions, memory snippets, and docs to reconstruct the next step before building.

Still intentionally not possible:

- Automatic calendar scheduling of build work.
- Silent creation of lots of to-dos.
- Command-by-command work logging.
- Agent-driven branch/PR/deploy automation as part of the continuity feature.
- Treating Kwilt as a generic issue tracker.

## Reductive design decisions

- Enhance the existing `kwilt-control-plane` skill instead of creating a second skill.
- Add a planned-work capture and completion path before the continuity-packet path.
- Store V1 receipts and packets in existing Goal/Activity notes instead of adding a new object type.
- Keep Activity titles prospective/stable; put completed evidence in notes and completion state.
- Use the existing MCP write tools before adding server-side build-thread APIs.
- Make "resume" the primary user-visible moment, not a dashboard.
- Keep scheduling out of V1.
- Keep Codex plans local and tactical.
- Do not expose raw IDs in normal handoffs.
- Do not write implementation micro-steps to Kwilt; receipts summarize outcomes.

## Activation path

The concept activates in three moments:

1. After a design loop converges or a feature brief/spec is refined, when the durable outcome, phases, and buildable slice are clear enough to map into Kwilt.
2. At handoff, when the agent can record meaningful completed work as a done Activity.
3. At the start of substantial feature/build work, when the agent detects or is asked to use Kwilt for continuity.
4. When the user asks "where was I?", "what's next?", "resume X", or similar.
5. During scope changes, when a completed receipt is no longer enough and the work needs a continuity packet.

Education should be minimal. The plugin docs can include two example prompts: `Record this work in Kwilt when we're done` and `Use Kwilt to keep the durable build thread for this work recoverable.` The agent response should explain only the immediate write/reuse decision.

## Design-loop pairing

The richest moment to create durable Kwilt structure is not after arbitrary coding activity; it is after the design loop has produced a frame, convergence decision, learning release, and spec refinement.

At that point, the agent can distill the design artifacts into Kwilt without guessing:

- Goal: the accepted product outcome or learning release, phrased as the thing to make true.
- Phase-level To-dos: the buildable phases from the learning release and implementation plan.
- Done receipts: design-loop work already completed, such as framing, convergence, or feature-brief drafting.
- Continuity packet: the chosen bet, buildable slice, open decisions, verification needs, and next useful action.

The design loop should not automatically write every artifact as a To-do. It should write only the durable plan that helps future action and Chapter history: what outcome this serves, what phase comes next, what has already been completed, and what evidence should be preserved.

## Model routing posture

The control-plane skill should be efficient, but never cheap out on the judgment step that decides what becomes durable in Kwilt.

Use a higher-quality medium-reasoning model for:

- Distilling design-loop artifacts into the right Goal and phase-level To-dos.
- Deciding whether work deserves a Goal, a planned Activity, a done receipt, or no Kwilt write.
- Resolving ambiguous Goal matching or nearby duplicate work.
- Writing continuity packets that preserve the chosen bet, rejected paths, open decisions, and verification status.

Use lower-cost or lower-reasoning passes for:

- Extracting candidate titles, artifact links, branch names, and verification commands from already-clear context.
- Formatting receipt notes into the standard packet shape.
- Summarizing MCP write results.
- Mechanical reconciliation when the Goal/Activity mapping is already explicit.

Escalate from cheap to higher-quality reasoning when:

- The agent is about to create a new Goal.
- Multiple existing Goals could match.
- The work came from a design loop and phase mapping is needed.
- The write would create several To-dos.
- The agent is unsure whether a completed work receipt is meaningful enough.
- The user explicitly asks for high fidelity.

Do not expose model names as product language. The user-facing promise is quality and restraint: the agent should spend more reasoning only when a durable Kwilt decision could otherwise become noisy, wrong, or hard to recover from.

## Accepted trade-offs

- V1 may be implemented as structured notes before becoming a first-class API.
- The Activity lifecycle may create more Activities than continuity-only behavior, so the skill needs a meaningful-work threshold.
- Resume quality depends on agents updating the packet honestly at handoff.
- Some build state remains repo-local, so the resume ritual should inspect the current repo before answering.
- The first release may be most useful to Andrew and other AI-native builders before it becomes broadly legible to ordinary Kwilt users.

## Rejected trade-offs

- Do not make a new project-management surface first.
- Do not convert every Codex plan item into a Kwilt Activity.
- Do not make scheduling the center of the first release.
- Do not let agents auto-create or auto-anchor Arcs based on build work.
- Do not use dashboard or productivity-score language.

## System implications

- `kwilt-agent-plugins/skills/kwilt-control-plane/SKILL.md` needs a continuity-packet section and a resume ritual.
- It also needs a planned-work lifecycle section and a clear threshold for what counts as meaningful work.
- It should include a design-loop handoff mode that reads design artifacts and creates/reuses the right Goal plus phase-level Activities.
- It should include a model-routing policy so high-quality reasoning is reserved for durable judgment and cheaper passes handle mechanical extraction/formatting.
- Plugin README/docs should position control-plane behavior as completed work capture plus durable build continuity, not only generic Goal/To-do writes.
- The MCP server may later need structured output schemas and optional metadata for better cross-client reliability.
- Kwilt app/desktop surfaces can later display these packets if tagged Activities prove valuable.

## Bet

We're betting that continuously capturing meaningful work as Activities, then marking them done with receipt evidence, will make Chapters more complete and satisfying, while continuity packets will reduce cross-session disorientation only for work that actually needs to continue. If it turns out the user still knows the thread but cannot make time for it, we would revisit schedule-aware planning as a second layer.

## Success signal

The user sees meaningful AI-assisted work captured before or during execution and reflected in Kwilt/Chapters as completed Activity history, and can also resume unfinished build threads after context switches without manually rereading old chats or markdown. Agent handoffs consistently distinguish done Activities from planned follow-ups, and Kwilt does not accumulate noisy duplicate build tasks.
