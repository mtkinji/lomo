---
id: brief-build-continuity-control-plane
title: Work receipts and build continuity control plane
status: draft
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life, jtbd-move-the-few-things-that-matter, jtbd-capture-and-find-meaning, jtbd-see-my-arcs-in-everyday-moments]
related_briefs: [brief-external-ai-connector]
owner: andrew
last_updated: 2026-06-29
---

## Context

AI-assisted building now spans Codex, Cursor, Claude Code, Kwilt mobile, Kwilt desktop, plugin repos, feature briefs, branches, and deploy/review loops. Codex plans are useful for a single execution session, but they are not the durable place to record completed work for Kwilt Chapters or preserve build concepts that continue across days, repos, or agents. The existing Kwilt MCP/plugin direction already gives agents permissioned access to Kwilt Goals and Activities; this brief makes that control-plane behavior a product-shaped work-receipt and build-continuity capability.

## Target audience

`audience-ai-native-life-operators` - AI-native users who already think, plan, draft, and build inside AI tools. This matters for them because their life/work system must be available where work happens, while staying inspectable, permissioned, and reversible.

## Representative persona

Nina, adapted to the internal builder case. She is bouncing between buildable product ideas, quick fixes, docs work, and coding agents. She does not need another project-management system; she needs meaningful completed work to count in Kwilt, and unfinished work to preserve the current thread, next action, and unresolved decisions across context switches.

## Aspirational design challenge

How might we help Nina record meaningful AI-assisted work as completed life evidence, and keep unfinished build threads recoverable across sessions, while preserving Codex plans as lightweight execution scaffolding and Kwilt as the durable, permissioned source of truth?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` - This is the demand spine because the user is letting agents operate near a personal planning system. Trust depends on clear scope, explicit writes, readable handoffs, and recovery from mistakes.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`

This improves the weak steps around capturing from tools, letting AI suggest changes, inspecting what would change, approving/editing changes, and keeping an audit trail. Current delivery is early: the external connector and plugin direction exist, but completed-work receipts and build-continuity behavior are still mostly guidance rather than mature contracts.

## JTBD framing

When an AI-native builder does meaningful work through an agent, they want Kwilt to record the work as part of their real history, and when the work is unfinished they want Kwilt to preserve the durable thread of what it is, where it stands, and what comes next, so Chapters can reflect what they actually did and future sessions can keep moving without rebuilding context.

## Design

### Core behavior

Evolve the existing Kwilt agent plugin/control-plane behavior around two lanes: a **Completed Work Receipt** and a **Build Thread Continuity Packet**.

A work receipt is the completion phase of a normal Activity lifecycle. The agent should capture meaningful work as a planned Activity before or during execution whenever possible, work against the native agent plan, then mark the Activity done with receipt evidence when complete. Its title is still phrased as the work to be done, not a past-tense report. The notes record enough context for Kwilt Chapters to understand what happened without storing a transcript or command log.

A continuity packet is a concise structured handoff attached to an existing Kwilt Goal or a pinned/current Activity. It records enough state for a future agent session to resume unfinished work without replaying chat history.

### Design-loop handoff

This skill should pair especially tightly with the design loop. The design loop is where the agent has enough context to know what should become a Goal, what should become phase-level To-dos, and what should simply be recorded as completed design work.

After convergence, learning-release planning, and spec refinement, the agent should distill the artifacts into Kwilt:

- Create or reuse a Goal for the accepted product outcome or learning release.
- Create phase-level To-dos for the buildable plan, not every implementation micro-step.
- Mark completed design-loop work done when it is meaningful Chapter evidence.
- Attach a continuity packet with the chosen bet, buildable slice, open decisions, verification requirements, and next useful action.

This is different from generic capture. Generic capture asks "what happened?" Design-loop handoff asks "what durable outcome did we decide to pursue, what phases express the plan, what did we already complete, and what must remain recoverable?"

V1 receipt fields:

- Title: prospective expression of the work, such as `Draft work receipts design loop`, not `Drafted the work receipts design loop`.
- Outcome: what meaningful work was completed.
- Context: repo/client/surface when relevant.
- Why it mattered: one short sentence tied to the Goal or broader workstream.
- Evidence: artifact, branch, verification, doc, PR, or "not verified" note.
- Follow-up: none, or a linked planned Activity if something remains.

V1 packet fields:

- Build thread: human-readable title.
- Durable Goal: the Kwilt Goal being reused or created.
- Source context: repo, branch, client, and linked artifacts when known.
- State: `idea`, `framed`, `planned`, `in_progress`, `blocked`, `review_ready`, `shipped`, or `parked`.
- Last known point: what was true when the packet was last updated.
- Next useful action: one concrete Activity or Activity step.
- Open decisions: unresolved user/product/technical choices.
- Rejected paths: important alternatives already ruled out.
- Deferred follow-ups: durable items that should survive the current session.
- Verification/handoff: what passed, what did not run, and what remains to confirm.

### Goal and To-do mapping rules

Create or reuse a Goal when design-loop artifacts identify a durable outcome: an accepted concept, learning release, product slice, plugin capability, or buildable bet.

Create To-dos when there are concrete phase outcomes, work to be done, or deferred follow-ups. To-dos should be captured before work begins whenever the intended unit is clear. If the agent only discovers at handoff that meaningful completed work was not captured up front, it may create the prospective To-do and immediately mark it done with receipt notes.

Link To-dos to the Goal when they come from the same design-loop outcome, phase plan, feature brief, or continuity packet. Leave a To-do unlinked only when it is genuinely a one-off receipt or the right Goal is ambiguous.

Represent phasing as phase-level To-dos under the Goal. Codex's native plan handles the current session's tiny execution checklist; Kwilt keeps the durable phase plan, current planned work, done state, and receipt evidence.

### Model and reasoning routing

The plugin should be smart about model cost without letting durable Kwilt records get sloppy.

Use higher-quality medium reasoning for durable judgment:

- turning design-loop artifacts into the right Goal and phase-level To-dos
- deciding whether work deserves a Goal, planned To-do, done receipt, continuity packet, or no write
- matching against existing Goals when overlap is possible
- preserving open decisions, rejected paths, verification status, and the chosen bet
- any write that would create several To-dos or a new Goal

Use lower-cost or lower-reasoning passes for mechanical work:

- extracting candidate titles, branch names, artifact paths, and verification commands
- formatting notes into the receipt or continuity-packet shape
- summarizing MCP write results
- updating a clearly identified To-do's status after verification passes

Escalation rules:

- Escalate before creating a new Goal unless the user explicitly named it.
- Escalate when multiple Goals could match.
- Escalate when a design-loop handoff is being distilled into phases.
- Escalate when the agent is unsure whether a receipt is meaningful enough.
- Escalate when the user asks for high fidelity.

The public/user-facing behavior should not mention model names. The product promise is that Kwilt spends more reasoning on durable judgment and uses cheaper passes only for mechanical support.

### Agent behavior

At the start of substantial build work, the plugin skill should:

1. Confirm Kwilt MCP tools are available.
2. Read current Goals and recent Activities before writing.
3. Reuse a matching Goal when one clearly fits.
4. Ask or create only when no reasonable Goal exists.
5. Create or reuse planned Activities for the meaningful units of work to be done.
6. Keep the native agent plan as the tactical execution checklist.

During work, the agent should update Kwilt only when durable build state changes materially.

At handoff, the agent should:

1. Reconcile touched Activities.
2. Mark durable Activities done only after implementation and verification pass.
3. Add receipt evidence to notes for done Activities.
4. Leave deferred work planned with clear notes.
5. Create and mark done a prospective Activity only when meaningful completed work was not captured earlier.
6. Update the continuity packet when work remains unfinished.
7. Summarize writes by name, not raw IDs.

### Resume behavior

When the user asks to resume a build thread, the agent should:

1. Read likely matching Goals/Activities from Kwilt.
2. Inspect current repo state when available.
3. Summarize the build thread, current state, last known point, next useful action, and open decisions.
4. Ask before making durable updates if the right Goal is ambiguous.

### Relationship to scheduling

Scheduling is deliberately not V1. The user's first pain is incomplete lived history: meaningful agent-assisted work should be recorded in Kwilt and available to Chapters. When work remains unfinished, the second pain is orientation. Once receipts and continuity packets prove useful, a future slice can project next actions into Kwilt's priority, Recommended, or Auto-Schedule systems with preview and undo.

### Relationship to existing plugin work

This brief should be implemented first in `/Users/andrewwatanabe/kwilt-agent-plugins` by updating:

- `skills/kwilt-control-plane/SKILL.md`
- plugin README/docs for Codex, Cursor, and Claude Code
- reviewer/demo examples for completed receipt, mark done, reuse, resume, packet update, and handoff reconciliation
- design-loop handoff examples that convert a frame/converge/learning-release/spec into one Goal plus phase-level To-dos
- model-routing examples that show when to use higher-quality reasoning vs. cheaper extraction/formatting passes

No new MCP tools are required for the learning release. If skill-only behavior proves useful but unreliable across clients, add first-class MCP schemas or metadata later.

### Guardrails

- Do not create a new Kwilt object type for plans.
- Do not mirror every native agent plan item into Kwilt.
- Do not log command-by-command or file-by-file work.
- Do not rename Activities into past tense after completion.
- Do not store full chat transcripts.
- Do not auto-create Arcs.
- Do not silently schedule work.
- Do not use productivity-score, dashboard, or shame language.
- Do not expose raw IDs unless debugging.

## Success signal

The user sees meaningful AI-assisted work reflected in Kwilt/Chapters as completed Activity history, and can resume unfinished build threads after context switches and immediately understand what the work is, where it stands, and what the next useful action is. Agents reuse existing Goals more often than they create new ones, handoffs stay concise, and Kwilt does not accumulate noisy duplicate build to-dos.

## Learning release

See [`docs/design-explorations/build-continuity-control-plane/04-learning-release.md`](../design-explorations/build-continuity-control-plane/04-learning-release.md).

## Spec refinement

Build-ready enough for a plugin-docs/skill learning release, not yet for server schema changes.

Clarified:

- V1 is a plugin/control-plane skill evolution.
- V1 stores receipts and packets in existing Activity/Goal notes.
- Scheduling is excluded.
- Codex plans remain local/tactical.
- Kwilt Goals and Activities remain durable.

Still to decide before implementation:

- Exact threshold for "meaningful work receipt" versus too-small/no write.
- Exact style guide for prospective receipt titles.
- Exact packet markup format inside Goal/Activity notes.
- Whether the packet should live primarily on the Goal description, a pinned Activity, or the latest durable Activity note.
- Whether status labels should be visible in user-facing summaries or remain agent-facing.
- How aggressively the skill should infer a matching Goal before asking.

Acceptance criteria:

- The plugin skill documents start, resume, during-work, and handoff rituals.
- The plugin skill documents design-loop handoff: how to map frame/converge/learning-release/spec refinement into a Goal, phase-level To-dos, completed receipts, and a continuity packet.
- The plugin skill documents model routing and escalation rules for durable Kwilt decisions.
- The receipt and packet shapes are explicit and compact.
- Demo/reviewer examples prove completed receipt, mark done, reuse, resume, update, and no micro-task spam.
- Public/plugin copy does not overclaim scheduling or automatic project management.
- The behavior can be tested locally with real Kwilt MCP read/write tools.

## Open questions

- Should the eventual MCP server expose a first-class `build_thread` metadata contract, or is structured Goal/Activity note content enough?
- Should this remain a power-user plugin behavior, or eventually surface inside Kwilt desktop as a build/work shelf?
- What is the threshold for adding schedule-aware planning after continuity works?
